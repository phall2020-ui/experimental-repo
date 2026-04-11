import unittest
from datetime import date
from unittest import mock

from market_data.models import AmbiguousCurrencyError, UnsupportedDSTDayError, UnsupportedSourceSchemaError
from market_data.nordpool_n2ex_api import NordPoolN2exApiProvider


class NordPoolN2exApiProviderTests(unittest.TestCase):
    def setUp(self):
        self.provider = NordPoolN2exApiProvider(
            username="user",
            password="pass",
            client_id="client",
            client_secret="secret",
        )
        self.delivery_date = date(2026, 4, 2)

    def _intervals(self, *, count=48, currency="GBP"):
        return [
            {
                "price": float(40 + index),
                "deliveryStart": f"2026-04-02T{index // 2:02d}:{'00' if index % 2 == 0 else '30'}:00Z",
                "deliveryEnd": f"2026-04-02T{(index + 1) // 2:02d}:{'30' if index % 2 == 0 else '00'}:00Z",
                "currency": currency,
                "status": "Confirmed",
            }
            for index in range(count)
        ]

    def test_normalises_price_indices_response(self):
        response_json = {"data": [{"items": self._intervals()}]}
        day_data = self.provider.normalise_to_timeseries(
            {
                "delivery_date": self.delivery_date,
                "response_json": response_json,
                "market": "N2EX_DayAhead",
                "currency": "GBP",
                "resolution": "PT30M",
            }
        )

        self.assertEqual(day_data.delivery_date, self.delivery_date)
        self.assertEqual(day_data.interval_count, 48)
        self.assertEqual(day_data.currency, "GBP")
        self.assertAlmostEqual(day_data.intervals[0].market_price, 40.0)
        self.assertEqual(day_data.intervals[0].metadata["market"], "N2EX_DayAhead")

    def test_rejects_non_gbp_payloads(self):
        with self.assertRaises(AmbiguousCurrencyError):
            self.provider.normalise_to_timeseries(
                {
                    "delivery_date": self.delivery_date,
                    "response_json": {"data": [{"items": self._intervals(currency="EUR")}]},
                    "market": "N2EX_DayAhead",
                    "currency": "EUR",
                    "resolution": "PT30M",
                }
            )

    def test_rejects_non_48_interval_days(self):
        with self.assertRaises(UnsupportedDSTDayError):
            self.provider.normalise_to_timeseries(
                {
                    "delivery_date": self.delivery_date,
                    "response_json": {"data": [{"items": self._intervals(count=46)}]},
                    "market": "N2EX_DayAhead",
                    "currency": "GBP",
                    "resolution": "PT30M",
                }
            )

    def test_rejects_unrecognised_response_shape(self):
        with self.assertRaises(UnsupportedSourceSchemaError):
            self.provider.normalise_to_timeseries(
                {
                    "delivery_date": self.delivery_date,
                    "response_json": {"unexpected": "shape"},
                    "market": "N2EX_DayAhead",
                    "currency": "GBP",
                    "resolution": "PT30M",
                }
            )

    def test_fetches_and_caches_access_tokens(self):
        token_response = mock.Mock()
        token_response.raise_for_status.return_value = None
        token_response.json.return_value = {"access_token": "token-1", "expires_in": 3600}

        price_response = mock.Mock()
        price_response.raise_for_status.return_value = None
        price_response.json.return_value = {"data": [{"items": self._intervals()}]}

        session = mock.Mock()
        session.post.return_value = token_response
        session.get.return_value = price_response

        provider = NordPoolN2exApiProvider(
            username="user",
            password="pass",
            client_id="client",
            client_secret="secret",
            session=session,
        )

        first = provider.fetch_for_delivery_date(self.delivery_date)
        second = provider.fetch_for_delivery_date(self.delivery_date)

        self.assertEqual(first.interval_count, 48)
        self.assertEqual(second.interval_count, 48)
        session.post.assert_called_once()
        self.assertEqual(session.get.call_count, 2)


if __name__ == "__main__":
    unittest.main()
