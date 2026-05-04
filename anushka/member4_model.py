
from pathlib import Path
import sys
import os

# -------- SHARED PATH --------
SHARED_UTILS_DIR = Path("/home/shared/envirosense")
if str(SHARED_UTILS_DIR) not in sys.path:
    sys.path.insert(0, str(SHARED_UTILS_DIR))

print("🔥 MEMBER4 PIPELINE STARTED 🔥")

import db_utils
import pandas as pd
from sqlalchemy import text
from sklearn.ensemble import RandomForestRegressor
import matplotlib.pyplot as plt


def safe_float(x):
    try:
        return float(x)
    except:
        return 0.0


def run_pipeline():
    print("Running pipeline...")

    # -------- FETCH DATA --------
    query = """
        SELECT *
        FROM (
            SELECT *,
                   ROW_NUMBER() OVER (PARTITION BY device_id ORDER BY time DESC) AS rn
            FROM clean_data
        ) ranked
        WHERE rn <= 20
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

    # -------- GRAPH GENERATION --------
    os.makedirs("plots", exist_ok=True)

    plt.figure()
    plt.scatter(df["temperature"], df["pm2_5"])
    plt.xlabel("Temperature")
    plt.ylabel("PM2.5")
    plt.title("PM vs Temperature")
    plt.savefig("plots/pm_vs_temp.png")
    plt.close()

    plt.figure()
    plt.scatter(df["humidity"], df["pm2_5"])
    plt.xlabel("Humidity")
    plt.ylabel("PM2.5")
    plt.title("PM vs Humidity")
    plt.savefig("plots/pm_vs_humidity.png")
    plt.close()

    plt.figure()
    plt.hexbin(df["temperature"], df["pm2_5"], gridsize=20)
    plt.colorbar()
    plt.title("Hexbin PM vs Temperature")
    plt.savefig("plots/hexbin_temp.png")
    plt.close()

    # -------- ML MODEL --------
    X = df[["temperature", "humidity", "pm2_5_lag1", "pm2_5_roll_1h"]]
    y = df["pm2_5"]

    model = RandomForestRegressor(n_estimators=20, random_state=42)
    model.fit(X, y)

    latest = df.iloc[-1:]

    pred = model.predict(
        latest[["temperature", "humidity", "pm2_5_lag1", "pm2_5_roll_1h"]]
    )[0]

    # -------- HAZARD PROBABILITY --------
    hazard_prob = min(pred / 100, 1.0)
    hazard_flag = hazard_prob > 0.6

    # -------- TREND DATA --------
    trend_data = df[["time", "pm2_5"]].tail(10)
    trend_json = trend_data.to_json(orient="records")

    # -------- FINAL DATA --------
    result_df = latest[[
        "time", "device_id", "pm2_5", "temperature", "humidity",
        "pm2_5_lag1", "pm2_5_roll_1h"
    ]].copy()

    result_df["pm_pred"] = safe_float(pred)
    result_df["hazard_flag"] = bool(hazard_flag)
    result_df["hazard_prob"] = safe_float(hazard_prob)
    result_df["corr_temp"] = safe_float(corr_temp)
    result_df["corr_humidity"] = safe_float(corr_hum)
    result_df["trend_data"] = trend_json
    result_df["created_by"] = "member4"

    result_df = result_df.fillna(0)

    print(result_df)

    # -------- INSERT --------
    with db_utils.get_engine().begin() as conn:
        row = result_df.iloc[0].to_dict()

        conn.execute(text("""
            INSERT INTO anushka_features (
                time, device_id, pm2_5, temperature, humidity,
                pm2_5_lag1, pm2_5_roll_1h,
                pm_pred, hazard_flag, hazard_prob,
                corr_temp, corr_humidity,
                trend_data, created_by
            ) VALUES (
                :time, :device_id, :pm2_5, :temperature, :humidity,
                :pm2_5_lag1, :pm2_5_roll_1h,
                :pm_pred, :hazard_flag, :hazard_prob,
                :corr_temp, :corr_humidity,
                :trend_data, :created_by
            )
            ON CONFLICT DO NOTHING
        """), row)

    print("✅ DATA INSERTED SUCCESSFULLY")

