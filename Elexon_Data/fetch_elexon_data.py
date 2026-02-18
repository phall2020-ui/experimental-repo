import requests
import os
from datetime import date, timedelta, datetime
import time

# Configuration
START_DATE = date(2025, 12, 1)
END_DATE = date(2026, 2, 18) # Today
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
    import pandas as pd
    print("Combining files...")
    dfs = []
    for file in file_list:
        try:
             # Skip header logic might be needed if files have headers, usually they do.
             # Elexon CSVs usually have a header.
            df = pd.read_csv(file)
            dfs.append(df)
        except pd.errors.EmptyDataError:
             print(f"Skipping empty file: {file}")
        except Exception as e:
            print(f"Error reading {file}: {e}")

    if dfs:
        combined_df = pd.concat(dfs, ignore_index=True)
        combined_df.to_csv(COMBINED_FILE, index=False)
        print(f"Successfully created {COMBINED_FILE} with {len(combined_df)} rows.")
    else:
        print("No data to combine.")

if __name__ == "__main__":
    files = fetch_data(START_DATE, END_DATE)
    combine_files(files)
