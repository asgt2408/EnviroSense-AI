import sys
from pathlib import Path
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from dotenv import load_dotenv

load_dotenv()

# shared utils
SHARED_UTILS_DIR = Path('/home/shared/envirosense')
sys.path.insert(0, str(SHARED_UTILS_DIR))

import db_utils

print("Running Member3 Backfill...")

# =========================
# LOAD ALL SENSOR DATA
# =========================
query = """
SELECT *
FROM sensor_data
ORDER BY time
"""

with db_utils.get_engine().connect() as conn:
    df = pd.read_sql(query, conn)

if df.empty:
    print("No data found")
    exit()

# =========================
# PREPROCESS
# =========================
df['time'] = pd.to_datetime(df['time'], utc=True)

bins = [
    'bin_0_3_0_5',
    'bin_0_5_1_0',
    'bin_1_0_2_5',
    'bin_2_5_5_0',
    'bin_5_0_10_0'
]

features = bins + ['pm2_5', 'pm10_0', 'temperature', 'humidity']

X = df[features].fillna(0)
X_scaled = StandardScaler().fit_transform(X)

# =========================
# CLUSTERING (FULL DATA)
# =========================
kmeans = KMeans(n_clusters=3, random_state=42, n_init=20)
df['cluster'] = kmeans.fit_predict(X_scaled)

# =========================
# LABELING
# =========================
cluster_means = df.groupby('cluster')['pm2_5'].mean().sort_values()

labels_map = {}
for i, c in enumerate(cluster_means.index):
    if i == 0:
        labels_map[c] = "Better Air"
    elif i == 1:
        labels_map[c] = "Moderate Pollution"
    else:
        labels_map[c] = "Unhealthy Air"

df['label'] = df['cluster'].map(labels_map)

# =========================
# PREPARE OUTPUT
# =========================
out = df[['time', 'device_id', 'cluster', 'label']]

# =========================
# REMOVE DUPLICATES
# =========================
with db_utils.get_engine().connect() as conn:
    existing = pd.read_sql("SELECT time, device_id FROM pratishtha_features", conn)

if not existing.empty:
    existing['time'] = pd.to_datetime(existing['time'], utc=True)

    out = out.merge(existing, on=['time', 'device_id'], how='left', indicator=True)
    out = out[out['_merge'] == 'left_only'].drop(columns=['_merge'])

# =========================
# SAVE
# =========================
if not out.empty:
    inserted = db_utils.save_dataframe(out, "pratishtha_features")
    print(f"Inserted {inserted} rows")
else:
    print("No rows to insert")

print("Backfill complete")