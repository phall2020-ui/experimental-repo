import unittest
from datetime import date, datetime, timezone
from pathlib import Path

from market_data.models import DeliveryDayMarketData, MarketInterval, MissingIntervalDataError, SourceFileMetadata
from services.n2ex_reference_price import derive_reference_price, simple_daily_average_price, site_volume_weighted_average_price


def _build_market_day(prices):
    intervals = tuple(
        MarketInterval(
            delivery_date=date(2026, 4, 2),
            settlement_period=index,
            label=f"SP{index:02d}",
            market_price=float(price),
            market_volume_mwh=10.0,
            currency="GBP",
        )
        for index, price in enumerate(prices, start=1)
    )
    return DeliveryDayMarketData(
        delivery_date=date(2026, 4, 2),
        market_area="great-britain",
        currency="GBP",
        granularity="PT30M",
        intervals=intervals,
        source_files=(
            SourceFileMetadata(
                provider_name="test",
                file_kind="prices",
                remote_path="/tmp/prices.csv",
                local_path=Path("prices.csv"),
                fetched_at=datetime.now(timezone.utc),
            ),
        ),
    )


class N2exReferencePriceTests(unittest.TestCase):
    def test_computes_simple_daily_average(self):
        day_data = _build_market_day([float(value) for value in range(10, 58)])
        self.assertAlmostEqual(simple_daily_average_price(day_data), 33.5)

    def test_computes_site_volume_weighted_average(self):
        day_data = _build_market_day([float(value) for value in range(1, 49)])
        site_profile = {sp: float(sp) for sp in range(1, 49)}
        weighted_average = site_volume_weighted_average_price(day_data, site_profile)
        expected = sum(float(sp) * float(sp) for sp in range(1, 49)) / sum(float(sp) for sp in range(1, 49))
        self.assertAlmostEqual(weighted_average, round(expected, 6))

    def test_falls_back_to_simple_average_when_profile_is_partial(self):
        day_data = _build_market_day([75.0] * 48)
        partial_profile = {sp: 1.0 for sp in range(1, 48)}
        result = derive_reference_price(day_data, partial_profile)

        self.assertEqual(result.chosen_method, "simple_daily_average_price")
        self.assertAlmostEqual(result.chosen_value_gbp_mwh, 75.0)
        self.assertIn("missing settlement periods", result.fallback_reason.lower())

    def test_falls_back_to_simple_average_for_zero_volume_profile(self):
        day_data = _build_market_day([30.0] * 48)
        zero_profile = {sp: 0.0 for sp in range(1, 49)}
        result = derive_reference_price(day_data, zero_profile)

        self.assertEqual(result.chosen_method, "simple_daily_average_price")
        self.assertAlmostEqual(result.chosen_value_gbp_mwh, 30.0)
        self.assertIn("sums to zero", result.fallback_reason.lower())

    def test_raises_when_market_intervals_are_missing(self):
        day_data = _build_market_day([80.0] * 47)
        with self.assertRaises(MissingIntervalDataError):
            simple_daily_average_price(day_data)


if __name__ == "__main__":
    unittest.main()
