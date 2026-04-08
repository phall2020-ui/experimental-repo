"""Point Lane merchant and VPPA+Export revenue calculations."""

from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import date
from typing import Mapping, Optional


@dataclass(frozen=True)
class PointLaneRevenueConfig:
    vppa_start_date: date
    default_strike_price_gbp_mwh: float = 91.40
    default_vppa_floor_gbp_mwh: float = 0.0
    default_export_discount_gbp_mwh: Optional[float] = None

    @classmethod
    def from_sources(cls, config: Optional[dict] = None) -> "PointLaneRevenueConfig":
        config = config or {}
        point_lane_cfg = config.get("point_lane", {}) if isinstance(config.get("point_lane"), dict) else {}
        vppa_start = (
            os.environ.get("POINT_LANE_VPPA_START_DATE")
            or point_lane_cfg.get("vppa_start_date")
            or "2026-04-01"
        )
        default_strike = (
            os.environ.get("POINT_LANE_DEFAULT_STRIKE_PRICE")
            or point_lane_cfg.get("default_strike_price")
            or 91.40
        )
        default_floor = (
            os.environ.get("POINT_LANE_DEFAULT_VPPA_FLOOR")
            or point_lane_cfg.get("default_vppa_floor")
            or 0.0
        )
        default_discount_raw = (
            os.environ.get("POINT_LANE_DEFAULT_EXPORT_DISCOUNT")
            or point_lane_cfg.get("default_export_discount")
        )
        default_discount = float(default_discount_raw) if default_discount_raw not in (None, "") else None

        return cls(
            vppa_start_date=date.fromisoformat(str(vppa_start)),
            default_strike_price_gbp_mwh=float(default_strike),
            default_vppa_floor_gbp_mwh=float(default_floor),
            default_export_discount_gbp_mwh=default_discount,
        )


@dataclass(frozen=True)
class RevenueComputation:
    contract_regime: str
    total_kwh: float
    volume_for_settlement_mwh: float
    revenue_bridge_gbp: float
    merchant_revenue_gbp: Optional[float] = None
    merchant_price_gbp_mwh: Optional[float] = None
    n2ex_avg_gbp_mwh: Optional[float] = None
    n2ex_reference_method: Optional[str] = None
    export_discount_gbp_mwh: Optional[float] = None
    strike_price_gbp_mwh: Optional[float] = None
    vppa_floor_gbp_mwh: Optional[float] = None
    floored_vppa_index_gbp_mwh: Optional[float] = None
    rego_revenue_gbp: float = 0.0
    negative_export_adjustment_gbp: float = 0.0
    physical_export_revenue_gbp: Optional[float] = None
    vppa_settlement_gbp: Optional[float] = None
    total_contract_revenue_gbp: Optional[float] = None
    contract_price_gbp_mwh: Optional[float] = None


class InvalidRevenueInputError(ValueError):
    """Raised when required revenue inputs are missing or invalid."""


def contract_regime_for_date(target_date: date, vppa_start_date: date) -> str:
    return "VPPA+Export" if target_date >= vppa_start_date else "Pre-VPPA"


def merchant_revenue_gbp(sp_kwh: Mapping[int, float], sp_ssp: Mapping[int, float]) -> float:
    total = 0.0
    for sp, kwh in sp_kwh.items():
        if sp not in sp_ssp:
            continue
        total += (float(kwh) / 1000.0) * float(sp_ssp[sp])
    return round(total, 6)


def compute_contract_values(
    total_kwh: float,
    n2ex_avg_gbp_mwh: float,
    export_discount_gbp_mwh: float,
    strike_price_gbp_mwh: float,
    vppa_floor_gbp_mwh: float,
    rego_revenue_gbp: float = 0.0,
    negative_export_adjustment_gbp: float = 0.0,
) -> dict[str, float]:
    if n2ex_avg_gbp_mwh is None:
        raise InvalidRevenueInputError("N2EX Avg (£/MWh) is required for VPPA+Export rows.")
    if export_discount_gbp_mwh is None:
        raise InvalidRevenueInputError("Export PPA Discount (£/MWh) is required for VPPA+Export rows.")

    volume_mwh = float(total_kwh) / 1000.0
    physical_export_price = float(n2ex_avg_gbp_mwh) - float(export_discount_gbp_mwh)
    physical_export_revenue = (volume_mwh * physical_export_price) + float(negative_export_adjustment_gbp)
    floored_vppa_index = max(float(n2ex_avg_gbp_mwh), float(vppa_floor_gbp_mwh))
    vppa_settlement = volume_mwh * (float(strike_price_gbp_mwh) - floored_vppa_index)
    total_contract_revenue = physical_export_revenue + vppa_settlement + float(rego_revenue_gbp)
    contract_price = (total_contract_revenue / volume_mwh) if volume_mwh > 0 else 0.0

    return {
        "volume_for_settlement_mwh": round(volume_mwh, 6),
        "physical_export_revenue_gbp": round(physical_export_revenue, 6),
        "floored_vppa_index_gbp_mwh": round(floored_vppa_index, 6),
        "vppa_settlement_gbp": round(vppa_settlement, 6),
        "total_contract_revenue_gbp": round(total_contract_revenue, 6),
        "contract_price_gbp_mwh": round(contract_price, 6),
    }


def compute_point_lane_revenue(
    target_date: date,
    sp_kwh: Mapping[int, float],
    sp_ssp: Optional[Mapping[int, float]] = None,
    reference_price_gbp_mwh: Optional[float] = None,
    reference_method: Optional[str] = None,
    export_discount_gbp_mwh: Optional[float] = None,
    strike_price_gbp_mwh: Optional[float] = None,
    vppa_floor_gbp_mwh: Optional[float] = None,
    rego_revenue_gbp: float = 0.0,
    negative_export_adjustment_gbp: float = 0.0,
    revenue_config: Optional[PointLaneRevenueConfig] = None,
) -> RevenueComputation:
    revenue_config = revenue_config or PointLaneRevenueConfig(
        vppa_start_date=date(2026, 4, 1),
    )
    sp_ssp = sp_ssp or {}

    total_kwh = round(sum(float(value) for value in sp_kwh.values()), 6)
    volume_for_settlement_mwh = round(total_kwh / 1000.0, 6)
    regime = contract_regime_for_date(target_date, revenue_config.vppa_start_date)

    if regime == "Pre-VPPA":
        merchant_revenue = merchant_revenue_gbp(sp_kwh, sp_ssp)
        merchant_price = (merchant_revenue / volume_for_settlement_mwh) if volume_for_settlement_mwh > 0 else 0.0
        return RevenueComputation(
            contract_regime=regime,
            total_kwh=total_kwh,
            volume_for_settlement_mwh=volume_for_settlement_mwh,
            revenue_bridge_gbp=round(merchant_revenue, 6),
            merchant_revenue_gbp=round(merchant_revenue, 6),
            merchant_price_gbp_mwh=round(merchant_price, 6),
        )

    resolved_discount = (
        export_discount_gbp_mwh
        if export_discount_gbp_mwh is not None
        else revenue_config.default_export_discount_gbp_mwh
    )
    resolved_strike = (
        float(strike_price_gbp_mwh)
        if strike_price_gbp_mwh is not None
        else float(revenue_config.default_strike_price_gbp_mwh)
    )
    resolved_floor = (
        float(vppa_floor_gbp_mwh)
        if vppa_floor_gbp_mwh is not None
        else float(revenue_config.default_vppa_floor_gbp_mwh)
    )

    contract_values = compute_contract_values(
        total_kwh=total_kwh,
        n2ex_avg_gbp_mwh=float(reference_price_gbp_mwh) if reference_price_gbp_mwh is not None else None,
        export_discount_gbp_mwh=resolved_discount,
        strike_price_gbp_mwh=resolved_strike,
        vppa_floor_gbp_mwh=resolved_floor,
        rego_revenue_gbp=rego_revenue_gbp,
        negative_export_adjustment_gbp=negative_export_adjustment_gbp,
    )
    return RevenueComputation(
        contract_regime=regime,
        total_kwh=total_kwh,
        volume_for_settlement_mwh=contract_values["volume_for_settlement_mwh"],
        revenue_bridge_gbp=contract_values["total_contract_revenue_gbp"],
        n2ex_avg_gbp_mwh=round(float(reference_price_gbp_mwh), 6) if reference_price_gbp_mwh is not None else None,
        n2ex_reference_method=reference_method,
        export_discount_gbp_mwh=round(float(resolved_discount), 6) if resolved_discount is not None else None,
        strike_price_gbp_mwh=round(float(resolved_strike), 6),
        vppa_floor_gbp_mwh=round(float(resolved_floor), 6),
        floored_vppa_index_gbp_mwh=contract_values["floored_vppa_index_gbp_mwh"],
        rego_revenue_gbp=round(float(rego_revenue_gbp), 6),
        negative_export_adjustment_gbp=round(float(negative_export_adjustment_gbp), 6),
        physical_export_revenue_gbp=contract_values["physical_export_revenue_gbp"],
        vppa_settlement_gbp=contract_values["vppa_settlement_gbp"],
        total_contract_revenue_gbp=contract_values["total_contract_revenue_gbp"],
        contract_price_gbp_mwh=contract_values["contract_price_gbp_mwh"],
    )


def build_notion_properties(
    date_str: str,
    sp_kwh: Mapping[int, float],
    sp_ssp: Mapping[int, float],
    revenue: RevenueComputation,
    prop_types: Optional[Mapping[str, str]] = None,
) -> dict:
    """Build a Notion page property payload that respects formula/read-only columns."""

    def can_write(name: str) -> bool:
        if prop_types is None:
            return True
        return prop_types.get(name) not in (None, "formula")

    props = {"Date": {"title": [{"text": {"content": date_str}}]}}

    if can_write("Day"):
        props["Day"] = {"date": {"start": date_str}}
    if can_write("Gen MWh"):
        props["Gen MWh"] = {"number": round(revenue.volume_for_settlement_mwh, 6)}
    if can_write("Rev £k"):
        props["Rev £k"] = {"number": round(revenue.revenue_bridge_gbp / 1000.0, 6)}
    if can_write("Total kWh"):
        props["Total kWh"] = {"number": round(revenue.total_kwh, 6)}
    if can_write("Contract Regime"):
        props["Contract Regime"] = {"select": {"name": revenue.contract_regime}}

    for sp in range(1, 49):
        sp_key = f"SP{sp:02d}"
        if sp in sp_kwh and can_write(f"{sp_key}_kWh"):
            props[f"{sp_key}_kWh"] = {"number": round(float(sp_kwh[sp]), 5)}
        if sp in sp_ssp and can_write(f"{sp_key}_SSP"):
            props[f"{sp_key}_SSP"] = {"number": round(float(sp_ssp[sp]), 4)}

    if revenue.n2ex_avg_gbp_mwh is not None and can_write("N2EX Avg (£/MWh)"):
        props["N2EX Avg (£/MWh)"] = {"number": round(revenue.n2ex_avg_gbp_mwh, 6)}
    if revenue.export_discount_gbp_mwh is not None and can_write("Export PPA Discount (£/MWh)"):
        props["Export PPA Discount (£/MWh)"] = {"number": round(revenue.export_discount_gbp_mwh, 6)}
    if revenue.strike_price_gbp_mwh is not None and can_write("VPPA Strike (£/MWh)"):
        props["VPPA Strike (£/MWh)"] = {"number": round(revenue.strike_price_gbp_mwh, 6)}
    if revenue.vppa_floor_gbp_mwh is not None and can_write("VPPA Floor (£/MWh)"):
        props["VPPA Floor (£/MWh)"] = {"number": round(revenue.vppa_floor_gbp_mwh, 6)}
    if can_write("REGO Revenue (£)"):
        props["REGO Revenue (£)"] = {"number": round(revenue.rego_revenue_gbp, 6)}
    if can_write("Negative Export Adjustment (£)"):
        props["Negative Export Adjustment (£)"] = {"number": round(revenue.negative_export_adjustment_gbp, 6)}
    if can_write("Volume for Settlement (MWh)"):
        props["Volume for Settlement (MWh)"] = {"number": round(revenue.volume_for_settlement_mwh, 6)}
    if revenue.physical_export_revenue_gbp is not None and can_write("Physical Export Revenue (£)"):
        props["Physical Export Revenue (£)"] = {"number": round(revenue.physical_export_revenue_gbp, 6)}
    if revenue.vppa_settlement_gbp is not None and can_write("VPPA Settlement (£)"):
        props["VPPA Settlement (£)"] = {"number": round(revenue.vppa_settlement_gbp, 6)}
    if revenue.total_contract_revenue_gbp is not None and can_write("Total Contract Revenue (£)"):
        props["Total Contract Revenue (£)"] = {"number": round(revenue.total_contract_revenue_gbp, 6)}
    if revenue.contract_price_gbp_mwh is not None and can_write("Contract Price (£/MWh)"):
        props["Contract Price (£/MWh)"] = {"number": round(revenue.contract_price_gbp_mwh, 6)}

    return props
