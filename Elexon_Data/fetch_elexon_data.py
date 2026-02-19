import argparse
import requests
import os
from datetime import date, timedelta, datetime
import time

# Configuration
START_DATE = date(2025, 12, 1)
END_DATE = date.today()
OUTPUT_DIR = "bmrs_data"
COMBINED_FILE = "combined_system_prices.csv"

def fetch_data(start_date, end_date):
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    current_date = start_date
    delta = timedelta(days=1)
    
    all_files = []

    print(f"Fetching data from {start_date} to {end_date}...")

    while current_date <= end_date:
        date_str = current_date.strftime("%Y-%m-%d")
        file_path = os.path.join(OUTPUT_DIR, f"system_prices_{date_str}.csv")
        
        if os.path.exists(file_path):
            print(f"Skipping {date_str} (already exists)")
            all_files.append(file_path)
        else:
            url = f"https://data.elexon.co.uk/bmrs/api/v1/balancing/settlement/system-prices/{date_str}?format=csv"
            print(f"Fetching {date_str}...")
            try:
                response = requests.get(url)
                response.raise_for_status()
                
                # Check if response is empty or not CSV (sometimes APIs return JSON on error despite format=csv)
                if response.text.strip():
                     with open(file_path, "w", newline='') as f:
                        f.write(response.text)
                     all_files.append(file_path)
                else:
                    print(f"Warning: Empty response for {date_str}")
                
                # Be slice with the API
                time.sleep(0.2) 

            except requests.exceptions.RequestException as e:
                print(f"Error fetching {date_str}: {e}")

        current_date += delta
        
    return all_files

def combine_files(file_list):
    import csv as csv_mod
    print("Combining files...")
    header = None
    rows = []
    for file_path in file_list:
        try:
            with open(file_path, newline='') as f:
                reader = csv_mod.reader(f)
                file_header = next(reader, None)
                if file_header is None:
                    print(f"Skipping empty file: {file_path}")
                    continue
                if header is None:
                    header = file_header
                for row in reader:
                    if row:
                        rows.append(row)
        except Exception as e:
            print(f"Error reading {file_path}: {e}")

    if header and rows:
        with open(COMBINED_FILE, "w", newline='') as f:
            writer = csv_mod.writer(f)
            writer.writerow(header)
            writer.writerows(rows)
        print(f"Successfully created {COMBINED_FILE} with {len(rows)} rows.")
    else:
        print("No data to combine.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fetch Elexon BMRS system prices")
    parser.add_argument("--start", default=START_DATE.isoformat(),
                        help=f"Start date YYYY-MM-DD (default: {START_DATE})")
    parser.add_argument("--end", default=None,
                        help="End date YYYY-MM-DD (default: today)")
    args = parser.parse_args()

    start = date.fromisoformat(args.start)
    end = date.fromisoformat(args.end) if args.end else date.today()

    files = fetch_data(start, end)
    combine_files(files)
