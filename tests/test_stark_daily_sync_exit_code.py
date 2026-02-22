import unittest

import stark_daily_sync


class StarkDailySyncExitCodeTests(unittest.TestCase):
    def test_returns_failure_when_scrape_failures_exist(self):
        exit_code = stark_daily_sync.compute_exit_code(
            ok_count=0,
            fail_count=2,
            scrape_fail=2,
            fail_on_scrape_fail=True,
        )
        self.assertEqual(exit_code, 1)

    def test_returns_success_when_rows_synced_without_failures(self):
        exit_code = stark_daily_sync.compute_exit_code(
            ok_count=2,
            fail_count=0,
            scrape_fail=0,
            fail_on_scrape_fail=True,
        )
        self.assertEqual(exit_code, 0)

    def test_allows_scrape_failures_when_flag_disabled(self):
        exit_code = stark_daily_sync.compute_exit_code(
            ok_count=1,
            fail_count=0,
            scrape_fail=1,
            fail_on_scrape_fail=False,
        )
        self.assertEqual(exit_code, 0)


if __name__ == "__main__":
    unittest.main()
