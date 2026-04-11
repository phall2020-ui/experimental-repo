"""Daily N2EX reference price derivation for Point Lane."""

from __future__ import annotations

from typing import Mapping, Optional

from market_data.models import DeliveryDayMarketData, DerivedReferencePrice, MissingIntervalDataError


class MissingExportProfileError(ValueError):
    """Raised when a weighted reference price cannot be derived from site export data."""


def _price_by_settlement_period(day_data: DeliveryDayMarketData) -> dict[int, float]:
    if day_data.interval_count != 48:
        raise MissingIntervalDataError(
            f"Expected 48 market intervals for {day_data.delivery_date}, found {day_data.interval_count}."
        )
    by_sp = {interval.settlement_period: interval.market_price for interval in day_data.intervals}
    if len(by_sp) != 48:
        raise MissingIntervalDataError(
            f"Missing or duplicate market intervals for {day_data.delivery_date}."
        )
    return by_sp


def simple_daily_average_price(day_data: DeliveryDayMarketData) -> float:
    """Simple arithmetic average across all 48 market intervals."""
    by_sp = _price_by_settlement_period(day_data)
    return round(sum(by_sp.values()) / 48.0, 6)


def site_volume_weighted_average_price(
    day_data: DeliveryDayMarketData,
    site_export_kwh_by_sp: Mapping[int, float],
) -> float:
    """Weighted average using the site's own half-hour export profile."""
    prices = _price_by_settlement_period(day_data)
    missing_periods = [sp for sp in range(1, 49) if sp not in site_export_kwh_by_sp]
    if missing_periods:
        raise MissingExportProfileError(
            f"Site export profile is missing settlement periods: {missing_periods[:5]}"
        )

    total_weight = 0.0
    weighted_sum = 0.0
    for sp in range(1, 49):
        weight = float(site_export_kwh_by_sp.get(sp, 0.0) or 0.0)
        if weight < 0:
            raise MissingExportProfileError(
                f"Site export profile contains a negative volume for SP{sp:02d}."
            )
        total_weight += weight
        weighted_sum += prices[sp] * weight

    if total_weight <= 0:
        raise MissingExportProfileError("Site export profile sums to zero.")

    return round(weighted_sum / total_weight, 6)


def derive_reference_price(
    day_data: DeliveryDayMarketData,
    site_export_kwh_by_sp: Optional[Mapping[int, float]] = None,
) -> DerivedReferencePrice:
    """Choose the preferred daily market reference price for Point Lane."""
    simple_average = simple_daily_average_price(day_data)
    weighted_average: Optional[float] = None
    chosen_method = "simple_daily_average_price"
    chosen_value = simple_average
    fallback_reason = None

    if site_export_kwh_by_sp:
        try:
            weighted_average = site_volume_weighted_average_price(day_data, site_export_kwh_by_sp)
            chosen_method = "site_volume_weighted_average_price"
            chosen_value = weighted_average
        except MissingExportProfileError as exc:
            fallback_reason = str(exc)
    else:
        fallback_reason = "Site export profile not available."

    return DerivedReferencePrice(
        delivery_date=day_data.delivery_date,
        chosen_method=chosen_method,
        chosen_value_gbp_mwh=round(chosen_value, 6),
        simple_daily_average_price_gbp_mwh=round(simple_average, 6),
        site_volume_weighted_average_price_gbp_mwh=weighted_average,
        interval_count=day_data.interval_count,
        fallback_reason=fallback_reason,
    )
