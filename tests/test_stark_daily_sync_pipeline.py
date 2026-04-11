import tempfile
import unittest
from datetime import date, datetime, timezone
from pathlib import Path
from unittest import mock

import stark_daily_sync
from market_data.models import DeliveryDayMarketData, MarketInterval, MissingSourceFileError, SourceFileMetadata
from services.point_lane_revenue import PointLaneRevenueConfig


def _write_stark_csv(path, active_power_kw):
    with open(path, "w", encoding="utf-8", newline="") as handle:
        handle.write("Period,Active Power kW\n")
        for index in range(1, 49):
            handle.write(f"{index},{active_power_kw}\n")


def _market_day(delivery_date, price):
    intervals = tuple(
        MarketInterval(
            delivery_date=delivery_date,
            settlement_period=sp,
            label=f"SP{sp:02d}",
            market_price=float(price),
            market_volume_mwh=10.0,
            currency="GBP",
        )
        for sp in range(1, 49)
    )
    return DeliveryDayMarketData(
        delivery_date=delivery_date,
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


class _Provider:
    def __init__(self, price):
        self.price = price

    def fetch_for_delivery_date(self, delivery_date):
        return _market_day(delivery_date, self.price)


class StarkDailySyncPipelineTests(unittest.TestCase):
    def setUp(self):
        self.config = PointLaneRevenueConfig(
            vppa_start_date=date(2026, 4, 1),
            default_strike_price_gbp_mwh=91.40,
            default_vppa_floor_gbp_mwh=0.0,
            default_export_discount_gbp_mwh=5.0,
        )

    def test_process_sync_date_for_single_vppa_day(self):
        with tempfile.TemporaryDirectory() as tempdir:
            csv_path = Path(tempdir) / "stark.csv"
            _write_stark_csv(csv_path, active_power_kw=200.0)

            with mock.patch.object(stark_daily_sync, "load_ssp", return_value={sp: 50.0 for sp in range(1, 49)}):
                with mock.patch.object(stark_daily_sync, "upsert_day", return_value=(True, 4800.0)) as mock_upsert:
                    result = stark_daily_sync.process_sync_date(
                        token="token",
                        db_id="db-id",
                        target_date=date(2026, 4, 2),
                        csv_path=csv_path,
                        prop_types={},
                        revenue_config=self.config,
                        market_data_provider=_Provider(price=60.0),
                    )

        self.assertTrue(result["ok"])
        self.assertEqual(result["revenue_result"].contract_regime, "VPPA+Export")
        self.assertAlmostEqual(result["reference"].chosen_value_gbp_mwh, 60.0)
        mock_upsert.assert_called_once()

    def test_build_market_data_provider_prefers_explicit_nordpool_setting(self):
        cfg = {"point_lane": {"market_data_provider": "nordpool_n2ex_api"}}
        with mock.patch.object(stark_daily_sync, "NordPoolN2exApiProvider", return_value="nordpool-provider"):
            provider_name, provider = stark_daily_sync.build_market_data_provider(cfg)

        self.assertEqual(provider_name, "nordpool_n2ex_api")
        self.assertEqual(provider, "nordpool-provider")

    def test_process_sync_date_can_be_used_for_backfill_ranges(self):
        with tempfile.TemporaryDirectory() as tempdir:
            paths = []
            for offset in range(2):
                csv_path = Path(tempdir) / f"stark_{offset}.csv"
                _write_stark_csv(csv_path, active_power_kw=200.0)
                paths.append(csv_path)

            with mock.patch.object(stark_daily_sync, "load_ssp", return_value={sp: 50.0 for sp in range(1, 49)}):
                with mock.patch.object(stark_daily_sync, "upsert_day", return_value=(True, 4800.0)) as mock_upsert:
                    for offset, csv_path in enumerate(paths):
                        result = stark_daily_sync.process_sync_date(
                            token="token",
                            db_id="db-id",
                            target_date=date(2026, 4, 2 + offset),
                            csv_path=csv_path,
                            prop_types={},
                            revenue_config=self.config,
                            market_data_provider=_Provider(price=60.0),
                        )
                        self.assertTrue(result["ok"])

        self.assertEqual(mock_upsert.call_count, 2)

    def test_process_sync_date_surfaces_missing_market_source_files(self):
        class MissingProvider:
            def fetch_for_delivery_date(self, delivery_date):
                raise MissingSourceFileError(f"missing {delivery_date}")

        with tempfile.TemporaryDirectory() as tempdir:
            csv_path = Path(tempdir) / "stark.csv"
            _write_stark_csv(csv_path, active_power_kw=200.0)

            with mock.patch.object(stark_daily_sync, "load_ssp", return_value={}):
                with self.assertRaises(MissingSourceFileError):
                    stark_daily_sync.process_sync_date(
                        token="token",
                        db_id="db-id",
                        target_date=date(2026, 4, 2),
                        csv_path=csv_path,
                        prop_types={},
                        revenue_config=self.config,
                        market_data_provider=MissingProvider(),
                    )

    def test_upsert_day_creates_new_rows_idempotently(self):
        revenue = mock.Mock(
            total_kwh=4800.0,
            volume_for_settlement_mwh=4.8,
            revenue_bridge_gbp=414.72,
            contract_regime="VPPA+Export",
            n2ex_avg_gbp_mwh=60.0,
            export_discount_gbp_mwh=5.0,
            strike_price_gbp_mwh=91.4,
            vppa_floor_gbp_mwh=0.0,
            rego_revenue_gbp=0.0,
            negative_export_adjustment_gbp=0.0,
            physical_export_revenue_gbp=264.0,
            vppa_settlement_gbp=150.72,
            total_contract_revenue_gbp=414.72,
            contract_price_gbp_mwh=86.4,
        )
        response = mock.Mock(status_code=200, text="ok")
        with mock.patch.object(stark_daily_sync, "query_page_ids", return_value=[]):
            with mock.patch.object(stark_daily_sync.requests, "post", return_value=response) as mock_post:
                ok, total = stark_daily_sync.upsert_day(
                    token="token",
                    db_id="db-id",
                    date_str="2026-04-02",
                    sp_kwh={sp: 100.0 for sp in range(1, 49)},
                    sp_ssp={},
                    revenue_result=revenue,
                    prop_types=None,
                )

        self.assertTrue(ok)
        self.assertAlmostEqual(total, 4800.0)
        mock_post.assert_called_once()

    def test_upsert_day_updates_existing_rows_idempotently(self):
        revenue = mock.Mock(
            total_kwh=4800.0,
            volume_for_settlement_mwh=4.8,
            revenue_bridge_gbp=414.72,
            contract_regime="VPPA+Export",
            n2ex_avg_gbp_mwh=60.0,
            export_discount_gbp_mwh=5.0,
            strike_price_gbp_mwh=91.4,
            vppa_floor_gbp_mwh=0.0,
            rego_revenue_gbp=0.0,
            negative_export_adjustment_gbp=0.0,
            physical_export_revenue_gbp=264.0,
            vppa_settlement_gbp=150.72,
            total_contract_revenue_gbp=414.72,
            contract_price_gbp_mwh=86.4,
        )
        response = mock.Mock(status_code=200, text="ok")
        with mock.patch.object(stark_daily_sync, "query_page_ids", return_value=["page-1"]):
            with mock.patch.object(stark_daily_sync.requests, "patch", return_value=response) as mock_patch:
                ok, total = stark_daily_sync.upsert_day(
                    token="token",
                    db_id="db-id",
                    date_str="2026-04-02",
                    sp_kwh={sp: 100.0 for sp in range(1, 49)},
                    sp_ssp={},
                    revenue_result=revenue,
                    prop_types=None,
                )

        self.assertTrue(ok)
        self.assertAlmostEqual(total, 4800.0)
        mock_patch.assert_called_once()

    def test_upsert_day_fails_for_duplicate_notion_rows(self):
        revenue = mock.Mock(
            total_kwh=4800.0,
            volume_for_settlement_mwh=4.8,
            revenue_bridge_gbp=414.72,
            contract_regime="VPPA+Export",
            n2ex_avg_gbp_mwh=60.0,
            export_discount_gbp_mwh=5.0,
            strike_price_gbp_mwh=91.4,
            vppa_floor_gbp_mwh=0.0,
            rego_revenue_gbp=0.0,
            negative_export_adjustment_gbp=0.0,
            physical_export_revenue_gbp=264.0,
            vppa_settlement_gbp=150.72,
            total_contract_revenue_gbp=414.72,
            contract_price_gbp_mwh=86.4,
        )
        with mock.patch.object(stark_daily_sync, "query_page_ids", return_value=["page-1", "page-2"]):
            with self.assertRaises(stark_daily_sync.DuplicateNotionRowError):
                stark_daily_sync.upsert_day(
                    token="token",
                    db_id="db-id",
                    date_str="2026-04-02",
                    sp_kwh={sp: 100.0 for sp in range(1, 49)},
                    sp_ssp={},
                    revenue_result=revenue,
                    prop_types=None,
                )

    def test_upsert_day_reports_notion_write_failures(self):
        revenue = mock.Mock(
            total_kwh=4800.0,
            volume_for_settlement_mwh=4.8,
            revenue_bridge_gbp=414.72,
            contract_regime="VPPA+Export",
            n2ex_avg_gbp_mwh=60.0,
            export_discount_gbp_mwh=5.0,
            strike_price_gbp_mwh=91.4,
            vppa_floor_gbp_mwh=0.0,
            rego_revenue_gbp=0.0,
            negative_export_adjustment_gbp=0.0,
            physical_export_revenue_gbp=264.0,
            vppa_settlement_gbp=150.72,
            total_contract_revenue_gbp=414.72,
            contract_price_gbp_mwh=86.4,
        )
        response = mock.Mock(status_code=500, text="boom")
        with mock.patch.object(stark_daily_sync, "query_page_ids", return_value=[]):
            with mock.patch.object(stark_daily_sync.requests, "post", return_value=response):
                ok, total = stark_daily_sync.upsert_day(
                    token="token",
                    db_id="db-id",
                    date_str="2026-04-02",
                    sp_kwh={sp: 100.0 for sp in range(1, 49)},
                    sp_ssp={},
                    revenue_result=revenue,
                    prop_types=None,
                )

        self.assertFalse(ok)
        self.assertEqual(total, 0)


if __name__ == "__main__":
    unittest.main()
