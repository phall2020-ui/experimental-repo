"""Typed market-data models used by provider and pricing services."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime
from pathlib import Path
from typing import Optional


class MarketDataError(Exception):
    """Base class for market-data related failures."""


class MissingSourceFileError(MarketDataError):
    """Raised when a required source file cannot be fetched or found."""


class UnsupportedSourceSchemaError(MarketDataError):
    """Raised when the source schema/header layout is unsupported."""


class DuplicateDeliveryDateError(MarketDataError):
    """Raised when a source file contains duplicate rows for one delivery date."""


class MissingIntervalDataError(MarketDataError):
    """Raised when interval prices or volumes are missing or incomplete."""


class UnsupportedDSTDayError(MarketDataError):
    """Raised when a delivery day contains 46 or 50 GB half-hours."""


class AmbiguousCurrencyError(MarketDataError):
    """Raised when source currency is missing or cannot be converted safely."""


@dataclass(frozen=True)
class SourceFileMetadata:
    provider_name: str
    file_kind: str
    remote_path: str
    local_path: Path
    fetched_at: datetime


@dataclass(frozen=True)
class MarketInterval:
    delivery_date: date
    settlement_period: int
    label: str
    market_price: float
    market_volume_mwh: Optional[float]
    currency: str
    granularity: str = "PT30M"
    metadata: dict[str, str] = field(default_factory=dict)


@dataclass(frozen=True)
class DeliveryDayMarketData:
    delivery_date: date
    market_area: str
    currency: str
    granularity: str
    intervals: tuple[MarketInterval, ...]
    source_files: tuple[SourceFileMetadata, ...] = ()

    @property
    def interval_count(self) -> int:
        return len(self.intervals)


@dataclass(frozen=True)
class DerivedReferencePrice:
    delivery_date: date
    chosen_method: str
    chosen_value_gbp_mwh: float
    simple_daily_average_price_gbp_mwh: float
    site_volume_weighted_average_price_gbp_mwh: Optional[float]
    interval_count: int
    fallback_reason: Optional[str] = None
