"""
Solar Performance Calculations
===============================
Pure functions for Performance Ratio (PR) and Availability metrics.
Used by fusionsolar_monitor.py and notion_sync.py.

PR methodology follows IEC 61724-1:2021 guidelines.
"""

import logging
from datetime import date, datetime
from typing import Optional, List, Dict

log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Performance Ratio
# ---------------------------------------------------------------------------

def performance_ratio(
    actual_yield_kwh: float,
    irradiance_kwh_m2: float,
    capacity_kwp: float,
) -> Optional[float]:
    """
    Calculate Performance Ratio (PR) as a percentage.

    PR = (Actual Energy Output) / (Reference Energy) × 100
    Reference Energy = Irradiance (kWh/m²) × Installed Capacity (kWp)

    Args:
        actual_yield_kwh:   Measured PV energy output (kWh)
        irradiance_kwh_m2:  In-plane or global horizontal irradiance (kWh/m²)
        capacity_kwp:       Installed DC capacity at STC (kWp)

    Returns:
        PR as a percentage (e.g. 82.5), or None if inputs are invalid/zero.
    """
    if not capacity_kwp or capacity_kwp <= 0:
        log.warning("PR calc: invalid capacity_kwp=%s", capacity_kwp)
        return None
    if not irradiance_kwh_m2 or irradiance_kwh_m2 <= 0:
        log.debug("PR calc: irradiance is zero/missing — skipping")
        return None
    if actual_yield_kwh is None or actual_yield_kwh < 0:
        return None

    reference_kwh = irradiance_kwh_m2 * capacity_kwp
    pr = (actual_yield_kwh / reference_kwh) * 100.0
    return round(pr, 2)


def performance_ratio_period(
    daily_records: List[Dict],
    capacity_kwp: float,
    yield_key: str = "pv_kwh",
    irradiance_key: str = "irradiance_kwh_m2",
) -> Optional[float]:
    """
    Calculate PR over a period using the irradiance-weighted method:
    PR = Σ(daily_yield) / Σ(daily_irradiance × capacity) × 100

    This avoids bias from low-irradiance days inflating the average.

    Args:
        daily_records:   List of dicts with at least yield_key and irradiance_key
        capacity_kwp:    Installed DC capacity (kWp)
        yield_key:       Dict key for daily energy (kWh)
        irradiance_key:  Dict key for daily irradiance (kWh/m²)

    Returns:
        Period PR as a percentage, or None if insufficient data.
    """
    if not capacity_kwp or capacity_kwp <= 0:
        return None

    total_yield = 0.0
    total_reference = 0.0

    for rec in daily_records:
        y = rec.get(yield_key)
        g = rec.get(irradiance_key)
        if y is not None and g is not None and g > 0 and y >= 0:
            total_yield += y
            total_reference += g * capacity_kwp

    if total_reference <= 0:
        return None

    pr = (total_yield / total_reference) * 100.0
    return round(pr, 2)


# ---------------------------------------------------------------------------
# Specific Yield
# ---------------------------------------------------------------------------

def specific_yield(actual_yield_kwh: float, capacity_kwp: float) -> Optional[float]:
    """
    Specific yield = Energy (kWh) / Capacity (kWp)  →  kWh/kWp

    Args:
        actual_yield_kwh:  Measured energy output (kWh)
        capacity_kwp:      Installed DC capacity (kWp)

    Returns:
        Specific yield in kWh/kWp, or None if invalid.
    """
    if not capacity_kwp or capacity_kwp <= 0:
        return None
    if actual_yield_kwh is None or actual_yield_kwh < 0:
        return None
    return round(actual_yield_kwh / capacity_kwp, 3)


# ---------------------------------------------------------------------------
# Availability
# ---------------------------------------------------------------------------

def inverter_availability(online_count: int, total_count: int) -> Optional[float]:
    """
    Instantaneous inverter-count availability (snapshot).

    A = (online / total) × 100

    Args:
        online_count:  Number of inverters currently online
        total_count:   Total number of inverters

    Returns:
        Availability as a percentage, or None if total is zero.
    """
    if not total_count or total_count <= 0:
        return None
    return round((online_count / total_count) * 100.0, 2)


def time_based_availability(
    check_results: List[Dict],
    total_inverters: int,
    daylight_hours: float,
    checks_per_day: int = 4,
) -> Optional[float]:
    """
    Approximate time-weighted availability from periodic inverter checks.

    Each check snapshot represents an equal share of daylight hours.
    A = Σ(online_fraction per check) / num_checks × 100

    Args:
        check_results:    List of check dicts with 'online_count' key
        total_inverters:  Expected total number of inverters
        daylight_hours:   Total daylight hours for the day (from astral)
        checks_per_day:   Number of checks performed during daylight

    Returns:
        Daily availability as a percentage, or None if no data.
    """
    if not check_results or total_inverters <= 0:
        return None

    total_fraction = 0.0
    for check in check_results:
        online = check.get("online_count", 0)
        total_fraction += online / total_inverters

    avg_fraction = total_fraction / len(check_results)
    return round(avg_fraction * 100.0, 2)


def energy_based_availability(
    actual_yield_kwh: float,
    expected_yield_kwh: float,
) -> Optional[float]:
    """
    Energy-based availability proxy.

    A = (actual / expected) × 100

    Useful when expected yield is derived from irradiance × capacity,
    giving a combined losses + availability metric.

    Args:
        actual_yield_kwh:    Measured energy
        expected_yield_kwh:  Theoretical maximum energy

    Returns:
        Availability as a percentage, or None if expected is zero.
    """
    if not expected_yield_kwh or expected_yield_kwh <= 0:
        return None
    if actual_yield_kwh is None or actual_yield_kwh < 0:
        return None
    return round((actual_yield_kwh / expected_yield_kwh) * 100.0, 2)


# ---------------------------------------------------------------------------
# Daylight hours helper (uses astral)
# ---------------------------------------------------------------------------

def get_daylight_hours(
    lat: float,
    lon: float,
    target_date: date,
    timezone_str: str = "Europe/London",
) -> float:
    """
    Calculate daylight hours for a given location and date using astral.

    Returns:
        Daylight duration in hours.
    """
    try:
        from astral import LocationInfo
        from astral.sun import sun
        import pytz

        location = LocationInfo(
            name="Site",
            region="",
            timezone=timezone_str,
            latitude=lat,
            longitude=lon,
        )
        tz = pytz.timezone(timezone_str)
        s = sun(location.observer, date=target_date, tzinfo=tz)
        sunrise = s["sunrise"]
        sunset = s["sunset"]
        delta = sunset - sunrise
        return round(delta.total_seconds() / 3600.0, 2)
    except Exception as e:
        log.warning("Could not calculate daylight hours: %s", e)
        return 0.0
