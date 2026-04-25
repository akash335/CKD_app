import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

FEATURES = [
    "creatinine_value",
    "urine_albumin",
    "acr",
    "egfr",
    "systolic_bp",
    "diastolic_bp",
    "glucose",
    "sensor_value_1",
    "sensor_value_2",
    "symptom_fatigue",
    "symptom_swelling",
    "symptom_low_urine",
    "adherence_score",
]


def load_and_prepare(path: str):
    df = pd.read_csv(path)
    missing = [f for f in FEATURES + ["label"] if f not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns: {missing}")

    df = df[FEATURES + ["label"]].copy()
    df = df.fillna(0)

    X = df[FEATURES]
    y = df["label"].astype(int)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y if y.nunique() > 1 else None
    )

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    return X_train_scaled, X_test_scaled, y_train, y_test, scaler
