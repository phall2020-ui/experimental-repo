"""EPEX SPOT GB day-ahead EOD SFTP market-data provider."""

from __future__ import annotations

import csv
import logging
import os
import re
from dataclasses import dataclass
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Callable, Optional

from market_data.base import MarketDataProvider
from market_data.models import (
    AmbiguousCurrencyError,
    DeliveryDayMarketData,
    DuplicateDeliveryDateError,
    MarketInterval,
    MissingIntervalDataError,
    MissingSourceFileError,
    SourceFileMetadata,
    UnsupportedDSTDayError,
    UnsupportedSourceSchemaError,
)

log = logging.getLogger(__name__)


PRICE_FILE_TEMPLATE = "hh_auction_spot_prices_great-britain_{year}.csv"
VOLUME_FILE_TEMPLATE = "hh_auction_spot_volumes_great-britain_{year}.csv"
DEFAULT_REMOTE_PATH = "/great-britain/Day-Ahead Auction/Half-hourly/Current/Prices_Volumes"
PRICE_METADATA_RE = re.compile(r"Currency:\s*(?P<currency>[A-Z]{3})", re.IGNORECASE)
INTERVAL_RE = re.compile(
    r"^(?:hour|h)?\s*(?P<hour>\d{1,2}|3a|3b)\s*q(?P<quarter>[12])(?:\s*price)?$",
    re.IGNORECASE,
)
DELIVERY_DATE_HEADERS = {
    "deliverydaydate",
    "deliveryday",
    "deliverydate",
    "delivery_day_date",
    "delivery_day",
    "delivery_date",
}


def _canonicalize_header(header: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", header.strip().lower())


def _normalize_interval_label(hour_token: str, quarter: str) -> str:
    return f"{hour_token.upper()}Q{quarter}"


def _interval_sort_key(interval_label: str) -> tuple[int, int]:
    hour_token = interval_label[:-2]
    quarter = int(interval_label[-1])
    if hour_token == "3A":
        return (3, quarter)
    if hour_token == "3B":
        return (4, quarter)
    hour_value = int(hour_token)
    if hour_value >= 4:
        return (hour_value + 1, quarter)
    return (hour_value, quarter)


@dataclass(frozen=True)
class _AnnualCsvData:
    metadata_line: str
    currency: Optional[str]
    delivery_date_header: str
    interval_headers: dict[str, str]
    rows_by_date: dict[date, dict[str, str]]


class EpexGbDaEodSftpProvider(MarketDataProvider):
    """Provider for EPEX SPOT GB day-ahead half-hourly price and volume files."""

    def __init__(
        self,
        host: Optional[str] = None,
        port: Optional[int] = None,
        username: Optional[str] = None,
        password: Optional[str] = None,
        remote_path: Optional[str] = None,
        cache_dir: Optional[Path | str] = None,
        currency_converter: Optional[Callable[[float, str, date], float]] = None,
    ) -> None:
        self.host = host or os.environ.get("EPEX_SFTP_HOST")
        self.port = int(port or os.environ.get("EPEX_SFTP_PORT", "22"))
        self.username = username or os.environ.get("EPEX_SFTP_USERNAME")
        self.password = password or os.environ.get("EPEX_SFTP_PASSWORD")
        self.remote_path = remote_path or os.environ.get("EPEX_SFTP_REMOTE_PATH") or DEFAULT_REMOTE_PATH
        self.cache_dir = Path(cache_dir or (Path(__file__).resolve().parents[1] / "market_data_cache" / "epex"))
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.currency_converter = currency_converter
        self._annual_cache: dict[tuple[str, int], _AnnualCsvData] = {}

    def fetch_for_delivery_date(self, delivery_date: date) -> DeliveryDayMarketData:
        raw_payload = self._fetch_raw_payload(delivery_date)
        return self.normalise_to_timeseries(raw_payload)

    def normalise_to_timeseries(self, raw_payload: dict) -> DeliveryDayMarketData:
        delivery_date = raw_payload["delivery_date"]
        prices: _AnnualCsvData = raw_payload["prices"]
        volumes: _AnnualCsvData = raw_payload["volumes"]
        price_row = prices.rows_by_date[delivery_date]
        volume_row = volumes.rows_by_date[delivery_date]

        if prices.currency is None:
            raise AmbiguousCurrencyError(
                f"EPEX price file for {delivery_date} does not declare a currency."
            )

        interval_labels = sorted(set(prices.interval_headers) | set(volumes.interval_headers), key=_interval_sort_key)
        intervals: list[MarketInterval] = []
        settlement_period = 0
        for interval_label in interval_labels:
            if interval_label not in prices.interval_headers or interval_label not in volumes.interval_headers:
                raise MissingIntervalDataError(
                    f"Price/volume interval mismatch for {delivery_date}: {interval_label}."
                )

            raw_price = (price_row.get(prices.interval_headers[interval_label]) or "").strip()
            raw_volume = (volume_row.get(volumes.interval_headers[interval_label]) or "").strip()
            if not raw_price and not raw_volume:
                continue
            if not raw_price or not raw_volume:
                raise MissingIntervalDataError(
                    f"Missing interval value for {delivery_date} {interval_label}: "
                    f"price={bool(raw_price)} volume={bool(raw_volume)}."
                )

            try:
                price_value = float(raw_price.replace(",", ""))
                volume_value = float(raw_volume.replace(",", ""))
            except ValueError as exc:
                raise UnsupportedSourceSchemaError(
                    f"Could not parse price/volume values for {delivery_date} {interval_label}."
                ) from exc

            if prices.currency.upper() != "GBP":
                if self.currency_converter is None:
                    raise AmbiguousCurrencyError(
                        f"EPEX price file for {delivery_date} is in {prices.currency}, "
                        "but no explicit conversion hook is configured."
                    )
                price_value = self.currency_converter(price_value, prices.currency.upper(), delivery_date)
                currency = "GBP"
            else:
                currency = "GBP"

            settlement_period += 1
            intervals.append(
                MarketInterval(
                    delivery_date=delivery_date,
                    settlement_period=settlement_period,
                    label=f"SP{settlement_period:02d}",
                    market_price=price_value,
                    market_volume_mwh=volume_value,
                    currency=currency,
                    granularity="PT30M",
                    metadata={"source_interval_label": interval_label},
                )
            )

        if len(intervals) != 48:
            raise UnsupportedDSTDayError(
                f"EPEX GB day-ahead file for {delivery_date} contains {len(intervals)} "
                "half-hour intervals. V1 only supports fixed 48-interval days."
            )

        return DeliveryDayMarketData(
            delivery_date=delivery_date,
            market_area="great-britain",
            currency="GBP",
            granularity="PT30M",
            intervals=tuple(intervals),
            source_files=tuple(raw_payload["source_files"]),
        )

    def parse_local_files(self, delivery_date: date, price_path: Path | str, volume_path: Path | str) -> DeliveryDayMarketData:
        raw_payload = {
            "delivery_date": delivery_date,
            "prices": self._parse_annual_csv(Path(price_path), file_kind="prices"),
            "volumes": self._parse_annual_csv(Path(volume_path), file_kind="volumes"),
            "source_files": (
                SourceFileMetadata(
                    provider_name="epex_gb_da_eod_sftp",
                    file_kind="prices",
                    remote_path=str(price_path),
                    local_path=Path(price_path),
                    fetched_at=datetime.now(timezone.utc),
                ),
                SourceFileMetadata(
                    provider_name="epex_gb_da_eod_sftp",
                    file_kind="volumes",
                    remote_path=str(volume_path),
                    local_path=Path(volume_path),
                    fetched_at=datetime.now(timezone.utc),
                ),
            ),
        }
        if delivery_date not in raw_payload["prices"].rows_by_date:
            raise MissingSourceFileError(f"No EPEX price row found for {delivery_date}.")
        if delivery_date not in raw_payload["volumes"].rows_by_date:
            raise MissingSourceFileError(f"No EPEX volume row found for {delivery_date}.")
        return self.normalise_to_timeseries(raw_payload)

    def _fetch_raw_payload(self, delivery_date: date) -> dict:
        year = delivery_date.year
        price_path, price_meta = self._ensure_year_file(file_kind="prices", year=year)
        volume_path, volume_meta = self._ensure_year_file(file_kind="volumes", year=year)

        price_data = self._load_annual_csv(price_path, file_kind="prices", year=year)
        volume_data = self._load_annual_csv(volume_path, file_kind="volumes", year=year)
        if delivery_date not in price_data.rows_by_date:
            raise MissingSourceFileError(f"No EPEX price row found for {delivery_date} in {price_path.name}.")
        if delivery_date not in volume_data.rows_by_date:
            raise MissingSourceFileError(f"No EPEX volume row found for {delivery_date} in {volume_path.name}.")

        return {
            "delivery_date": delivery_date,
            "prices": price_data,
            "volumes": volume_data,
            "source_files": (price_meta, volume_meta),
        }

    def _ensure_year_file(self, file_kind: str, year: int) -> tuple[Path, SourceFileMetadata]:
        file_name = self._file_name(file_kind, year)
        local_path = self.cache_dir / file_name
        remote_dir = self._remote_directory_for_year(year)
        remote_path = f"{remote_dir.rstrip('/')}/{file_name}"

        if not local_path.exists():
            self._download_file(remote_path, local_path)

        return (
            local_path,
            SourceFileMetadata(
                provider_name="epex_gb_da_eod_sftp",
                file_kind=file_kind,
                remote_path=remote_path,
                local_path=local_path,
                fetched_at=datetime.now(timezone.utc),
            ),
        )

    def _download_file(self, remote_path: str, local_path: Path) -> None:
        if not all([self.host, self.username, self.password]):
            raise MissingSourceFileError(
                f"EPEX SFTP credentials are not configured and cached file is missing: {local_path.name}"
            )

        try:
            import paramiko
        except ImportError as exc:
            raise MissingSourceFileError(
                "paramiko is required for EPEX SFTP downloads but is not installed."
            ) from exc

        local_path.parent.mkdir(parents=True, exist_ok=True)
        transport = None
        sftp = None
        try:
            transport = paramiko.Transport((self.host, self.port))
            transport.connect(username=self.username, password=self.password)
            sftp = paramiko.SFTPClient.from_transport(transport)
            log.info("Downloading EPEX file %s", remote_path)
            sftp.get(remote_path, str(local_path))
        except FileNotFoundError as exc:
            raise MissingSourceFileError(f"EPEX source file not found on SFTP: {remote_path}") from exc
        except OSError as exc:
            raise MissingSourceFileError(f"Failed downloading EPEX source file {remote_path}: {exc}") from exc
        finally:
            if sftp is not None:
                sftp.close()
            if transport is not None:
                transport.close()

    def _load_annual_csv(self, path: Path, file_kind: str, year: int) -> _AnnualCsvData:
        cache_key = (file_kind, year)
        if cache_key not in self._annual_cache:
            self._annual_cache[cache_key] = self._parse_annual_csv(path, file_kind=file_kind)
        return self._annual_cache[cache_key]

    def _parse_annual_csv(self, path: Path, file_kind: str) -> _AnnualCsvData:
        metadata_line = ""
        with open(path, "r", encoding="utf-8-sig", newline="") as handle:
            first_line = handle.readline()
            if first_line.startswith("#"):
                metadata_line = first_line.strip()
            else:
                handle.seek(0)
            reader = csv.DictReader(handle)
            fieldnames = reader.fieldnames or []
            if not fieldnames:
                raise UnsupportedSourceSchemaError(f"EPEX {file_kind} file has no headers: {path}")

            delivery_date_header = self._find_delivery_date_header(fieldnames)
            interval_headers = self._find_interval_headers(fieldnames)
            if not interval_headers:
                raise UnsupportedSourceSchemaError(
                    f"EPEX {file_kind} file does not expose half-hour interval columns: {path}"
                )

            rows_by_date: dict[date, dict[str, str]] = {}
            for row in reader:
                raw_date = (row.get(delivery_date_header) or "").strip()
                if not raw_date:
                    continue
                try:
                    delivery_date = datetime.strptime(raw_date, "%d/%m/%Y").date()
                except ValueError as exc:
                    raise UnsupportedSourceSchemaError(
                        f"EPEX {file_kind} file uses unsupported delivery-date format: {raw_date}"
                    ) from exc
                if delivery_date in rows_by_date:
                    raise DuplicateDeliveryDateError(
                        f"EPEX {file_kind} file contains duplicate delivery date {delivery_date}."
                    )
                rows_by_date[delivery_date] = row

        currency = self._extract_currency(metadata_line) if file_kind == "prices" else None
        return _AnnualCsvData(
            metadata_line=metadata_line,
            currency=currency,
            delivery_date_header=delivery_date_header,
            interval_headers=interval_headers,
            rows_by_date=rows_by_date,
        )

    @staticmethod
    def _extract_currency(metadata_line: str) -> Optional[str]:
        match = PRICE_METADATA_RE.search(metadata_line or "")
        if not match:
            return None
        return match.group("currency").upper()

    @staticmethod
    def _find_delivery_date_header(fieldnames: list[str]) -> str:
        for fieldname in fieldnames:
            if _canonicalize_header(fieldname) in DELIVERY_DATE_HEADERS:
                return fieldname
        raise UnsupportedSourceSchemaError("Could not identify the EPEX delivery-date column.")

    @staticmethod
    def _find_interval_headers(fieldnames: list[str]) -> dict[str, str]:
        interval_headers: dict[str, str] = {}
        for fieldname in fieldnames:
            candidate = fieldname.strip().replace("_", " ")
            match = INTERVAL_RE.match(re.sub(r"\s+", " ", candidate))
            if not match:
                continue
            interval_label = _normalize_interval_label(match.group("hour"), match.group("quarter"))
            interval_headers[interval_label] = fieldname
        return interval_headers

    @staticmethod
    def _file_name(file_kind: str, year: int) -> str:
        if file_kind == "prices":
            return PRICE_FILE_TEMPLATE.format(year=year)
        if file_kind == "volumes":
            return VOLUME_FILE_TEMPLATE.format(year=year)
        raise ValueError(f"Unsupported EPEX file kind: {file_kind}")

    def _remote_directory_for_year(self, year: int) -> str:
        current_year = datetime.now(timezone.utc).year
        remote_path = self.remote_path
        if year < current_year and "/Current/" in remote_path:
            return remote_path.replace("/Current/", "/Historical/")
        if year >= current_year and "/Historical/" in remote_path:
            return remote_path.replace("/Historical/", "/Current/")
        return remote_path
