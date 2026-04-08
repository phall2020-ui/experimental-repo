"""Nord Pool N2EX day-ahead market-data provider using OAuth 2.0."""

from __future__ import annotations

import logging
import os
from datetime import date, datetime, timedelta, timezone
from typing import Any, Optional

import requests
from requests.auth import HTTPBasicAuth

from market_data.base import MarketDataProvider
from market_data.models import (
    AmbiguousCurrencyError,
    DeliveryDayMarketData,
    MarketDataError,
    MarketInterval,
    MissingIntervalDataError,
    UnsupportedDSTDayError,
    UnsupportedSourceSchemaError,
)

log = logging.getLogger(__name__)

TOKEN_URL = "https://sts.nordpoolgroup.com/connect/token"
BASE_URL = "https://data-api.nordpoolgroup.com/api/v2"
PRICE_INDICES_ENDPOINT = "/Auction/PriceIndices/ByIndexNames"


class NordPoolAuthenticationError(MarketDataError):
    """Raised when OAuth authentication with Nord Pool fails."""


class NordPoolN2exApiProvider(MarketDataProvider):
    """Provider for Nord Pool N2EX day-ahead UK auction prices."""

    def __init__(
        self,
        username: Optional[str] = None,
        password: Optional[str] = None,
        client_id: Optional[str] = None,
        client_secret: Optional[str] = None,
        token_url: str = TOKEN_URL,
        base_url: str = BASE_URL,
        market: Optional[str] = None,
        index_names: Optional[str] = None,
        currency: Optional[str] = None,
        resolution: Optional[str] = None,
        timeout_seconds: int = 30,
        session: Optional[requests.Session] = None,
    ) -> None:
        self.username = username or os.environ.get("NORDPOOL_USERNAME")
        self.password = password or os.environ.get("NORDPOOL_PASSWORD")
        self.client_id = client_id or os.environ.get("NORDPOOL_CLIENT_ID")
        self.client_secret = client_secret or os.environ.get("NORDPOOL_CLIENT_SECRET")
        self.token_url = token_url
        self.base_url = base_url.rstrip("/")
        self.market = market or os.environ.get("NORDPOOL_MARKET", "N2EX_DayAhead")
        self.index_names = index_names or os.environ.get("NORDPOOL_INDEX_NAMES", "UK")
        self.currency = currency or os.environ.get("NORDPOOL_CURRENCY", "GBP")
        self.resolution = resolution or os.environ.get("NORDPOOL_RESOLUTION", "PT30M")
        self.timeout_seconds = timeout_seconds
        self.session = session or requests.Session()
        self._access_token: Optional[str] = None
        self._access_token_expires_at: Optional[datetime] = None

    def fetch_for_delivery_date(self, delivery_date: date) -> DeliveryDayMarketData:
        raw_payload = self._fetch_price_indices(delivery_date)
        return self.normalise_to_timeseries(raw_payload)

    def normalise_to_timeseries(self, raw_payload: Any) -> DeliveryDayMarketData:
        delivery_date = raw_payload["delivery_date"]
        response_json = raw_payload["response_json"]
        market = raw_payload["market"]
        requested_currency = raw_payload["currency"]
        requested_resolution = raw_payload["resolution"]

        series = self._extract_price_series(response_json)
        intervals: list[MarketInterval] = []
        for settlement_period, item in enumerate(series, start=1):
            price = self._extract_price(item)
            delivery_start = self._extract_delivery_start(item)
            delivery_end = self._extract_delivery_end(item)
            item_currency = self._extract_currency(item) or requested_currency
            if not item_currency:
                raise AmbiguousCurrencyError(
                    f"Nord Pool response for {delivery_date} does not identify a currency."
                )
            if item_currency.upper() != "GBP":
                raise AmbiguousCurrencyError(
                    f"Nord Pool returned currency {item_currency} for {delivery_date}; GBP is required."
                )

            intervals.append(
                MarketInterval(
                    delivery_date=delivery_date,
                    settlement_period=settlement_period,
                    label=f"SP{settlement_period:02d}",
                    market_price=price,
                    market_volume_mwh=self._extract_volume(item),
                    currency="GBP",
                    granularity=requested_resolution,
                    metadata={
                        "delivery_start": delivery_start or "",
                        "delivery_end": delivery_end or "",
                        "status": str(item.get("status", "")),
                        "market": market,
                        "index_name": str(item.get("indexName") or item.get("deliveryArea") or self.index_names),
                    },
                )
            )

        if len(intervals) != 48:
            raise UnsupportedDSTDayError(
                f"Nord Pool returned {len(intervals)} intervals for {delivery_date}. "
                "V1 only supports fixed 48-interval days."
            )

        return DeliveryDayMarketData(
            delivery_date=delivery_date,
            market_area="great-britain",
            currency="GBP",
            granularity=requested_resolution,
            intervals=tuple(intervals),
        )

    def _fetch_price_indices(self, delivery_date: date) -> dict[str, Any]:
        token = self._get_access_token()
        response = self.session.get(
            f"{self.base_url}{PRICE_INDICES_ENDPOINT}",
            headers={"Authorization": f"Bearer {token}"},
            params={
                "market": self.market,
                "indexNames": self.index_names,
                "currency": self.currency,
                "date": delivery_date.isoformat(),
                "resolution": self.resolution,
            },
            timeout=self.timeout_seconds,
        )
        try:
            response.raise_for_status()
        except requests.HTTPError as exc:
            raise MarketDataError(
                f"Nord Pool price-indices request failed for {delivery_date}: "
                f"{response.status_code} {response.text[:300]}"
            ) from exc
        return {
            "delivery_date": delivery_date,
            "response_json": response.json(),
            "market": self.market,
            "currency": self.currency,
            "resolution": self.resolution,
        }

    def _get_access_token(self) -> str:
        if self._access_token and self._access_token_expires_at:
            if datetime.now(timezone.utc) < self._access_token_expires_at:
                return self._access_token

        if not all([self.username, self.password, self.client_id, self.client_secret]):
            raise NordPoolAuthenticationError(
                "Nord Pool credentials are incomplete. "
                "Expected NORDPOOL_USERNAME, NORDPOOL_PASSWORD, NORDPOOL_CLIENT_ID, NORDPOOL_CLIENT_SECRET."
            )

        response = self.session.post(
            self.token_url,
            auth=HTTPBasicAuth(self.client_id, self.client_secret),
            data={
                "grant_type": "password",
                "scope": "marketdata_api",
                "username": self.username,
                "password": self.password,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=self.timeout_seconds,
        )
        try:
            response.raise_for_status()
        except requests.HTTPError as exc:
            raise NordPoolAuthenticationError(
                f"Nord Pool token request failed: {response.status_code} {response.text[:300]}"
            ) from exc

        payload = response.json()
        access_token = payload.get("access_token")
        expires_in = payload.get("expires_in")
        if not access_token or expires_in is None:
            raise NordPoolAuthenticationError("Nord Pool token response is missing access_token or expires_in.")

        self._access_token = str(access_token)
        self._access_token_expires_at = datetime.now(timezone.utc) + timedelta(seconds=max(int(expires_in) - 60, 0))
        return self._access_token

    @staticmethod
    def _extract_price_series(response_json: Any) -> list[dict[str, Any]]:
        candidates: list[Any] = []
        if isinstance(response_json, list):
            candidates.extend(response_json)
        elif isinstance(response_json, dict):
            for key in ("data", "results", "items", "priceIndices", "value"):
                candidate = response_json.get(key)
                if candidate is not None:
                    candidates.append(candidate)
            candidates.append(response_json)
        else:
            raise UnsupportedSourceSchemaError("Nord Pool response is not a JSON object or array.")

        extracted = NordPoolN2exApiProvider._search_for_interval_list(candidates)
        if not extracted:
            raise UnsupportedSourceSchemaError("Could not locate a Nord Pool interval price series in the API response.")
        return extracted

    @staticmethod
    def _search_for_interval_list(candidates: list[Any]) -> list[dict[str, Any]]:
        stack = list(candidates)
        while stack:
            current = stack.pop(0)
            if isinstance(current, list):
                if current and all(isinstance(item, dict) and NordPoolN2exApiProvider._looks_like_interval(item) for item in current):
                    return current
                stack.extend(current)
            elif isinstance(current, dict):
                stack.extend(current.values())
        return []

    @staticmethod
    def _looks_like_interval(item: dict[str, Any]) -> bool:
        return (
            any(key in item for key in ("price", "value", "normalizedPrice"))
            and any(key in item for key in ("deliveryStart", "startTime", "deliveryStartTime"))
        )

    @staticmethod
    def _extract_price(item: dict[str, Any]) -> float:
        for key in ("price", "value", "normalizedPrice"):
            if key in item and item[key] not in (None, ""):
                return float(item[key])
        raise MissingIntervalDataError("Nord Pool interval is missing a price.")

    @staticmethod
    def _extract_volume(item: dict[str, Any]) -> Optional[float]:
        for key in ("volume", "marketVolume", "quantity"):
            if key in item and item[key] not in (None, ""):
                return float(item[key])
        return None

    @staticmethod
    def _extract_currency(item: dict[str, Any]) -> Optional[str]:
        for key in ("currency", "priceCurrency"):
            if key in item and item[key]:
                return str(item[key]).upper()
        exchange_rate = item.get("exchangeRate")
        if isinstance(exchange_rate, dict):
            for key in ("toCurrency", "currency"):
                if key in exchange_rate and exchange_rate[key]:
                    return str(exchange_rate[key]).upper()
        return None

    @staticmethod
    def _extract_delivery_start(item: dict[str, Any]) -> Optional[str]:
        for key in ("deliveryStart", "startTime", "deliveryStartTime"):
            if key in item and item[key]:
                return str(item[key])
        return None

    @staticmethod
    def _extract_delivery_end(item: dict[str, Any]) -> Optional[str]:
        for key in ("deliveryEnd", "endTime", "deliveryEndTime"):
            if key in item and item[key]:
                return str(item[key])
        return None
