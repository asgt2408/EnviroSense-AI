from pathlib import Path
import sys

# -------- SHARED PATH --------
SHARED_UTILS_DIR = Path("/home/shared/envirosense")
if str(SHARED_UTILS_DIR) not in sys.path:
    sys.path.insert(0, str(SHARED_UTILS_DIR))

print("🔥 MEMBER4 PIPELINE STARTED 🔥")

import db_utils
import pandas as pd
from sqlalchemy import text
from sklearn.ensemble import RandomForestRegressor


def run_pipeline():
    print("Running pipeline...")

    # -------- GET DATA --------
    query = """
        SELECT *
        FROM (
            SELECT *,
                   ROW_NUMBER() OVER (PARTITION BY device_id ORDER BY time DESC) AS rn
            FROM clean_data
        ) ranked
        WHERE rn <= 10
    """

    with db_utils.get_engine().connect() as conn:
        df = pd.read_sql(query, conn)

    df = df.sort_values(["device_id", "time"])

    # -------- FEATURE ENGINEERING --------
    df["pm2_5_lag1"] = df.groupby("device_id")["pm2_5"].shift(1)

    df["pm2_5_roll_1h"] = (
        df.groupby("device_id")["pm2_5"]
        .rolling(3)
        .mean()
        .reset_index(level=0, drop=True)
    )

    df = df.dropna()

    if df.empty:
        print("⚠️ No data")
        return

    # -------- CORRELATION --------
    corr_temp = df["pm2_5"].corr(df["temperature"])
    corr_hum = df["pm2_5"].corr(df["humidity"])

    # -------- ML MODEL --------
    X = df[["temperature", "humidity", "pm2_5_lag1", "pm2_5_roll_1h"]]
    y = df["pm2_5"]

    model = RandomForestRegressor(n_estimators=10)
    model.fit(X, y)

    latest = df.iloc[-1:]

    pred = model.predict(
        latest[["temperature", "humidity", "pm2_5_lag1", "pm2_5_roll_1h"]]
    )[0]

    # -------- HAZARD --------
    hazard_flag = pred > 60

    # -------- FINAL DATA --------
    result_df = latest[[
        "time", "device_id", "pm2_5", "temperature", "humidity",
        "pm2_5_lag1", "pm2_5_roll_1h"
    ]].copy()

    result_df["pm_pred"] = float(pred)
    result_df["hazard_flag"] = bool(hazard_flag)
    result_df["corr_temp"] = float(corr_temp)
    result_df["corr_humidity"] = float(corr_hum)
    result_df["created_by"] = "member4"

    print(result_df)

    # -------- INSERT INTO DB --------
    with db_utils.get_engine().begin() as conn:
        row = result_df.iloc[0].to_dict()

        conn.execute(text("""
            INSERT INTO anushka_features (
                time, device_id, pm2_5, temperature, humidity,
                pm2_5_lag1, pm2_5_roll_1h,
                pm_pred, hazard_flag, corr_temp, corr_humidity, created_by
            ) VALUES (
                :time, :device_id, :pm2_5, :temperature, :humidity,
                :pm2_5_lag1, :pm2_5_roll_1h,
                :pm_pred, :hazard_flag, :corr_temp, :corr_humidity, :created_by
            )
            ON CONFLICT DO NOTHING
        """), row)

    print("✅ DATA INSERTED SUCCESSFULLY")