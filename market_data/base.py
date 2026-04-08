"""Provider interface for market-data ingestion."""

from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import date, timedelta
from typing import Any

from market_data.models import DeliveryDayMarketData


class MarketDataProvider(ABC):
    """Abstract base class for delivery-day market-data providers."""

    @abstractmethod
    def fetch_for_delivery_date(self, delivery_date: date) -> DeliveryDayMarketData:
        """Fetch and normalize market data for one delivery date."""

    def fetch_date_range(self, start_date: date, end_date: date) -> list[DeliveryDayMarketData]:
        """Fetch and normalize market data for every date in a closed range."""
        results: list[DeliveryDayMarketData] = []
        current = start_date
        while current <= end_date:
            results.append(self.fetch_for_delivery_date(current))
            current += timedelta(days=1)
        return results

    @abstractmethod
    def normalise_to_timeseries(self, raw_payload: Any) -> DeliveryDayMarketData:
        """Convert raw source data into the normalized delivery-day time series."""
