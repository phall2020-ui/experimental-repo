import csv
import tempfile
import unittest
from datetime import date
from pathlib import Path

from market_data.epex_gb_da_eod_sftp import EpexGbDaEodSftpProvider
from market_data.models import (
    AmbiguousCurrencyError,
    DuplicateDeliveryDateError,
    UnsupportedDSTDayError,
    UnsupportedSourceSchemaError,
)


def _interval_headers(dst=False, include_price_suffix=False):
    hours = ["1", "2", "3A", "3B"] + [str(hour) for hour in range(4, 25)] if dst else [str(hour) for hour in range(1, 25)]
    headers = []
    for hour in hours:
        for quarter in ("1", "2"):
            label = f"{hour} Q{quarter}"
            if include_price_suffix:
                label = f"{label} Price"
            headers.append(label)
    return headers


def _write_annual_csv(path, metadata_line, headers, rows):
    with open(path, "w", encoding="utf-8", newline="") as handle:
        if metadata_line:
            handle.write(f"{metadata_line}\n")
        writer = csv.DictWriter(handle, fieldnames=headers)
        writer.writeheader()
        writer.writerows(rows)


def _build_row(delivery_date, headers, start_value):
    row = {"Delivery Day Date": delivery_date.strftime("%d/%m/%Y")}
    for index, header in enumerate(headers[1:], start=0):
        row[header] = f"{start_value + index:.2f}"
    return row


class EpexGbDaEodSftpProviderTests(unittest.TestCase):
    def setUp(self):
        self.provider = EpexGbDaEodSftpProvider(cache_dir=Path(tempfile.mkdtemp()))
        self.delivery_date = date(2026, 4, 2)

    def _write_price_and_volume_files(self, tempdir, *, currency="GBP", dst=False, duplicate_row=False):
        price_headers = ["Delivery Day Date", *_interval_headers(dst=dst, include_price_suffix=True)]
        volume_headers = ["Delivery Day Date", *_interval_headers(dst=dst, include_price_suffix=False)]
        price_rows = [_build_row(self.delivery_date, price_headers, 50.0)]
        volume_rows = [_build_row(self.delivery_date, volume_headers, 100.0)]
        if duplicate_row:
            price_rows.append(_build_row(self.delivery_date, price_headers, 51.0))

        price_path = Path(tempdir) / "prices.csv"
        volume_path = Path(tempdir) / "volumes.csv"
        _write_annual_csv(price_path, f"# Currency: {currency}", price_headers, price_rows)
        _write_annual_csv(volume_path, "# Half-hourly volumes", volume_headers, volume_rows)
        return price_path, volume_path

    def test_parses_representative_gb_day_ahead_files(self):
        with tempfile.TemporaryDirectory() as tempdir:
            price_path, volume_path = self._write_price_and_volume_files(tempdir)
            day_data = self.provider.parse_local_files(self.delivery_date, price_path, volume_path)

        self.assertEqual(day_data.delivery_date, self.delivery_date)
        self.assertEqual(day_data.currency, "GBP")
        self.assertEqual(day_data.interval_count, 48)
        self.assertEqual(day_data.intervals[0].settlement_period, 1)
        self.assertAlmostEqual(day_data.intervals[0].market_price, 50.0)
        self.assertAlmostEqual(day_data.intervals[0].market_volume_mwh, 100.0)
        self.assertEqual(day_data.intervals[-1].settlement_period, 48)
        self.assertAlmostEqual(day_data.intervals[-1].market_price, 97.0)

    def test_rejects_unsupported_headers(self):
        with tempfile.TemporaryDirectory() as tempdir:
            price_path, volume_path = self._write_price_and_volume_files(tempdir)
            broken_price_headers = ["Wrong Date", *_interval_headers(include_price_suffix=True)]
            broken_price_path = Path(tempdir) / "prices_broken.csv"
            _write_annual_csv(
                broken_price_path,
                "# Currency: GBP",
                broken_price_headers,
                [{"Wrong Date": self.delivery_date.strftime("%d/%m/%Y")}],
            )

            with self.assertRaises(UnsupportedSourceSchemaError):
                self.provider.parse_local_files(self.delivery_date, broken_price_path, volume_path)

    def test_rejects_duplicate_delivery_dates(self):
        with tempfile.TemporaryDirectory() as tempdir:
            price_path, volume_path = self._write_price_and_volume_files(tempdir, duplicate_row=True)

            with self.assertRaises(DuplicateDeliveryDateError):
                self.provider.parse_local_files(self.delivery_date, price_path, volume_path)

    def test_requires_explicit_currency_conversion_hook(self):
        with tempfile.TemporaryDirectory() as tempdir:
            price_path, volume_path = self._write_price_and_volume_files(tempdir, currency="EUR")

            with self.assertRaises(AmbiguousCurrencyError):
                self.provider.parse_local_files(self.delivery_date, price_path, volume_path)

        provider = EpexGbDaEodSftpProvider(
            cache_dir=Path(tempfile.mkdtemp()),
            currency_converter=lambda value, currency, delivery_date: round(value * 0.85, 6),
        )
        with tempfile.TemporaryDirectory() as tempdir:
            price_path, volume_path = self._write_price_and_volume_files(tempdir, currency="EUR")
            day_data = provider.parse_local_files(self.delivery_date, price_path, volume_path)

        self.assertEqual(day_data.currency, "GBP")
        self.assertAlmostEqual(day_data.intervals[0].market_price, 42.5)

    def test_rejects_dst_days_until_fixed_interval_model_is_extended(self):
        with tempfile.TemporaryDirectory() as tempdir:
            price_path, volume_path = self._write_price_and_volume_files(tempdir, dst=True)

            with self.assertRaises(UnsupportedDSTDayError):
                self.provider.parse_local_files(self.delivery_date, price_path, volume_path)


if __name__ == "__main__":
    unittest.main()
