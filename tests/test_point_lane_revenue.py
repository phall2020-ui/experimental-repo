import unittest
from datetime import date

from services.point_lane_revenue import (
    PointLaneRevenueConfig,
    build_notion_properties,
    compute_point_lane_revenue,
)


def _sp_kwh(total_kwh_per_interval):
    return {sp: float(total_kwh_per_interval) for sp in range(1, 49)}


def _ssp_profile(price):
    return {sp: float(price) for sp in range(1, 49)}


class PointLaneRevenueTests(unittest.TestCase):
    def setUp(self):
        self.config = PointLaneRevenueConfig(
            vppa_start_date=date(2026, 4, 1),
            default_strike_price_gbp_mwh=91.40,
            default_vppa_floor_gbp_mwh=0.0,
            default_export_discount_gbp_mwh=5.0,
        )

    def test_preserves_legacy_pre_vppa_merchant_revenue(self):
        result = compute_point_lane_revenue(
            target_date=date(2026, 3, 31),
            sp_kwh=_sp_kwh(100.0),
            sp_ssp=_ssp_profile(50.0),
            revenue_config=self.config,
        )

        self.assertEqual(result.contract_regime, "Pre-VPPA")
        self.assertAlmostEqual(result.total_kwh, 4800.0)
        self.assertAlmostEqual(result.merchant_revenue_gbp, 240.0)
        self.assertAlmostEqual(result.revenue_bridge_gbp, 240.0)
        self.assertIsNone(result.n2ex_avg_gbp_mwh)

    def test_computes_post_vppa_revenue_below_strike(self):
        result = compute_point_lane_revenue(
            target_date=date(2026, 4, 2),
            sp_kwh=_sp_kwh(100.0),
            reference_price_gbp_mwh=60.0,
            revenue_config=self.config,
        )

        self.assertEqual(result.contract_regime, "VPPA+Export")
        self.assertAlmostEqual(result.physical_export_revenue_gbp, 264.0)
        self.assertAlmostEqual(result.vppa_settlement_gbp, 150.72)
        self.assertAlmostEqual(result.total_contract_revenue_gbp, 414.72)
        self.assertAlmostEqual(result.contract_price_gbp_mwh, 86.4)

    def test_computes_post_vppa_revenue_above_strike(self):
        result = compute_point_lane_revenue(
            target_date=date(2026, 4, 2),
            sp_kwh=_sp_kwh(100.0),
            reference_price_gbp_mwh=120.0,
            revenue_config=self.config,
        )

        self.assertLess(result.vppa_settlement_gbp, 0.0)
        self.assertAlmostEqual(result.total_contract_revenue_gbp, 414.72)
        self.assertAlmostEqual(result.contract_price_gbp_mwh, 86.4)

    def test_applies_vppa_floor_for_negative_market_prices(self):
        result = compute_point_lane_revenue(
            target_date=date(2026, 4, 2),
            sp_kwh=_sp_kwh(100.0),
            reference_price_gbp_mwh=-20.0,
            revenue_config=self.config,
        )

        self.assertAlmostEqual(result.physical_export_revenue_gbp, -120.0)
        self.assertAlmostEqual(result.floored_vppa_index_gbp_mwh, 0.0)
        self.assertAlmostEqual(result.vppa_settlement_gbp, 438.72)
        self.assertAlmostEqual(result.total_contract_revenue_gbp, 318.72)

    def test_handles_zero_volume_days_without_division_errors(self):
        result = compute_point_lane_revenue(
            target_date=date(2026, 4, 2),
            sp_kwh=_sp_kwh(0.0),
            reference_price_gbp_mwh=60.0,
            revenue_config=self.config,
        )

        self.assertAlmostEqual(result.total_kwh, 0.0)
        self.assertAlmostEqual(result.total_contract_revenue_gbp, 0.0)
        self.assertAlmostEqual(result.contract_price_gbp_mwh, 0.0)

    def test_builds_regime_aware_notion_properties(self):
        revenue = compute_point_lane_revenue(
            target_date=date(2026, 4, 2),
            sp_kwh=_sp_kwh(100.0),
            reference_price_gbp_mwh=60.0,
            revenue_config=self.config,
        )
        props = build_notion_properties(
            date_str="2026-04-02",
            sp_kwh=_sp_kwh(100.0),
            sp_ssp=_ssp_profile(55.0),
            revenue=revenue,
            prop_types=None,
        )

        self.assertEqual(props["Contract Regime"]["select"]["name"], "VPPA+Export")
        self.assertEqual(props["Day"]["date"]["start"], "2026-04-02")
        self.assertAlmostEqual(props["Gen MWh"]["number"], 4.8)
        self.assertAlmostEqual(props["Rev £k"]["number"], 0.41472)
        self.assertAlmostEqual(props["N2EX Avg (£/MWh)"]["number"], 60.0)
        self.assertAlmostEqual(props["Total Contract Revenue (£)"]["number"], 414.72)


if __name__ == "__main__":
    unittest.main()
