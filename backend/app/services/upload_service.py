import pandas as pd
from sqlalchemy.orm import Session

from ..models.reading import Reading

COLUMN_MAP = {
    "creatinine": "creatinine_value",
    "creatinine_value": "creatinine_value",
    "urine_albumin": "urine_albumin",
    "acr": "acr",
    "egfr": "egfr",
    "systolic_bp": "systolic_bp",
    "diastolic_bp": "diastolic_bp",
    "glucose": "glucose",
    "sensor1": "sensor_value_1",
    "sensor2": "sensor_value_2",
    "sensor_value_1": "sensor_value_1",
    "sensor_value_2": "sensor_value_2",
    "adherence_score": "adherence_score",
}

PREFERRED_SENSOR_SHEETS = [
    ("rel_mag_1min", "rel_phase_1min"),
    ("mag_1min", "phase_1min"),
    ("mag_2min", "phase_2min"),
]


def _iter_numeric_tail(values):
    cleaned = []
    for value in values:
        if pd.isna(value):
            continue
        try:
            cleaned.append(float(value))
        except (TypeError, ValueError):
            continue
    return cleaned


def _save_rows(db: Session, patient_id: int, rows: list[dict]):
    saved = []
    for payload in rows:
        reading = Reading(patient_id=patient_id, source=payload.pop("source", "excel"), **payload)
        db.add(reading)
        saved.append(reading)
    db.commit()
    for item in saved:
        db.refresh(item)
    return saved


def _tabular_rows_from_df(df: pd.DataFrame):
    normalized = {c.strip().lower(): c for c in df.columns}
    usable = [key for key in COLUMN_MAP if key in normalized]
    if not usable:
        return []

    rows = []
    for _, row in df.iterrows():
        payload = {"source": "excel"}
        found_any = False
        for source_key, target_key in COLUMN_MAP.items():
            if source_key in normalized:
                raw_value = row[normalized[source_key]]
                if pd.isna(raw_value):
                    payload[target_key] = None
                else:
                    payload[target_key] = float(raw_value)
                    found_any = True
        if found_any:
            rows.append(payload)
    return rows


def _sensor_rows_from_workbook(file_path: str):
    sheets = pd.read_excel(file_path, sheet_name=None, header=None)

    selected_pair = None
    for pair in PREFERRED_SENSOR_SHEETS:
        if pair[0] in sheets and pair[1] in sheets:
            selected_pair = pair
            break

    if not selected_pair:
        numeric_sheet_names = []
        for name, df in sheets.items():
            flat = _iter_numeric_tail(df.to_numpy().flatten())
            if flat:
                numeric_sheet_names.append(name)
        if len(numeric_sheet_names) >= 2:
            selected_pair = (numeric_sheet_names[0], numeric_sheet_names[1])
        else:
            return []

    df1 = sheets[selected_pair[0]]
    df2 = sheets[selected_pair[1]]
    max_rows = min(len(df1), len(df2))
    rows = []

    for i in range(max_rows):
        row1 = _iter_numeric_tail(df1.iloc[i].tolist())
        row2 = _iter_numeric_tail(df2.iloc[i].tolist())
        if len(row1) < 2 or len(row2) < 2:
            continue

        concentration = row1[0]
        sensor_1 = sum(row1[1:]) / len(row1[1:])
        sensor_2 = sum(row2[1:]) / len(row2[1:])

        rows.append(
            {
                "source": "sensor_workbook",
                "sensor_value_1": float(sensor_1),
                "sensor_value_2": float(sensor_2),
                "urine_albumin": float(concentration),
                "adherence_score": 85.0,
            }
        )
    return rows


def save_excel_readings(db: Session, patient_id: int, file_path: str):
    if file_path.endswith(".csv"):
        df = pd.read_csv(file_path)
        rows = _tabular_rows_from_df(df)
        return _save_rows(db, patient_id, rows)

    # Excel: first try normal clinical tabular layout
    primary_df = pd.read_excel(file_path)
    rows = _tabular_rows_from_df(primary_df)
    if rows:
        return _save_rows(db, patient_id, rows)

    # Fallback: handle sensor workbook like the uploaded urea workbook
    rows = _sensor_rows_from_workbook(file_path)
    return _save_rows(db, patient_id, rows)
