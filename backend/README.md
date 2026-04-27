# CKD Guardian Backend

This is the **FastAPI backend** for **CKD Guardian**, a CKD detection and monitoring platform for patients and doctors.

The backend provides APIs for authentication, patient profiles, CKD readings, ML-based risk prediction, alerts, notifications, uploads, teleconsultation scheduling, and recent/past consultation history.

---

## Features

- User registration and login
- JWT-based authentication
- Patient profile creation and retrieval
- CKD reading submission
- Latest reading and reading history APIs
- ML-based CKD risk prediction
- CKD risk level and trend status calculation
- Alert generation for abnormal health signals
- In-app notifications for patients and doctors
- Teleconsultation scheduling by doctors
- Recent and past consultation history
- Recent and past doctor overview workflow
- Report image upload support
- Report value extraction support
- Brevo email integration for consultation and urgent alerts
- PostgreSQL support for deployment

---

## Main Modules

### Authentication

- Register user
- Login user
- Generate JWT access token
- Protect routes using current logged-in user

### Patient

- Create patient profile
- Fetch patient profile
- List patient records for doctor dashboard
- Move recent doctor overview data to past overview
- View past patient overview data

### Reading

- Submit CKD health reading
- Fetch latest reading
- Fetch reading history

### Prediction

- Generate CKD risk score
- Determine CKD risk level
- Compute trend status
- Store prediction history

### Alerts

Alerts can be generated for:

- High CKD risk
- High blood pressure
- Worsening trend
- Abnormal kidney markers
- Low adherence or warning conditions

### Notifications

Notifications are used to:

- Notify doctors about urgent patient cases
- Notify patients when review is needed
- Notify patients when consultation is scheduled
- Notify patients/doctors when consultation details are updated

### Uploads

- Excel upload for readings
- Report image upload
- Report extraction route

### Teleconsultation

- Create consultation
- Get doctor consultation list
- Get patient consultation list
- Update consultation details
- Move recent consultations to past history
- View past consultation history

---

## Backend Structure

```text
backend/
├── app/
│   ├── main.py
│   ├── config.py
│   ├── database.py
│   ├── models/
│   ├── routes/
│   ├── schemas/
│   ├── services/
│   └── ml/
├── uploads/
├── requirements.txt
└── README.md
```

---

## Important Models

- User
- Patient
- Reading
- Prediction
- Alert
- Notification
- Teleconsultation

---

## Important Services

- `prediction_service.py`
- `email_service.py`
- `notification_service.py`
- `upload_service.py`

---

## Setup

### 1. Create virtual environment

```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Create environment file

Create a `.env` file inside the `backend/` folder.

```env
DATABASE_URL=sqlite:///./renalwatch.db
SECRET_KEY=your_secret_key
ACCESS_TOKEN_EXPIRE_MINUTES=1440
MODEL_PATH=app/ml/saved_model.pkl

BREVO_API_KEY=your_brevo_key
MAIL_SENDER_EMAIL=your_email@gmail.com
MAIL_SENDER_NAME=CKD Guardian
```

For production, use a PostgreSQL database URL:

```env
DATABASE_URL=postgresql://username:password@host:port/database_name
```

### 4. Run server locally

```bash
uvicorn app.main:app --reload
```

API root:

```text
http://127.0.0.1:8000
```

Swagger docs:

```text
http://127.0.0.1:8000/docs
```

---

## Common Endpoints

### Auth

```text
POST /auth/register
POST /auth/login
```

### Patients

```text
POST /patients
GET /patients
GET /patients/me
GET /patients/{patient_id}
PUT /patients/{patient_id}
GET /patients/overview/recent
GET /patients/overview/past
PUT /patients/overview/archive
```

### Readings

```text
POST /readings/{patient_id}
GET /readings/{patient_id}
GET /readings/latest/{patient_id}
```

### Predictions

```text
GET /predictions/{patient_id}
GET /predictions/latest/{patient_id}
```

### Alerts

```text
GET /alerts/{patient_id}
PUT /alerts/{alert_id}/resolve
```

### Notifications

```text
GET /notifications
GET /notifications/unread-count
PUT /notifications/{notification_id}/read
PUT /notifications/read-all
```

### Uploads

```text
POST /uploads/report-image
POST /uploads/report-extract
POST /uploads/excel/{patient_id}
```

### Teleconsultations

```text
POST /teleconsultations
GET /teleconsultations/patient/{patient_id}
GET /teleconsultations/doctor/{doctor_id}
GET /teleconsultations/history/recent
GET /teleconsultations/history/past
PUT /teleconsultations/history/archive
PUT /teleconsultations/{consultation_id}
```

---

## Recent and Past Workflow

CKD Guardian uses a soft-clear workflow instead of permanently deleting data.

### Doctor Overview

```text
Recent patient overview → Clear → Past patient overview
```

Recent overview shows active/current patient overview data.

Past overview stores cleared patient overview data so the doctor can still review it later.

### Consultation History

```text
Recent consultations → Clear → Past consultations
```

Recent consultations show active consultation history.

Past consultations show cleared consultation history. The data remains available for both patient and doctor accounts.

---

## Email Workflow

Brevo is used for:

- Patient consultation emails
- Urgent doctor alert emails

The sender identity may appear through Brevo unless a custom sender domain is authenticated.

---

## Deployment on Render

### Build Command

```bash
pip install -r requirements.txt
```

### Start Command

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

### Important Render Environment Variables

```env
DATABASE_URL=your_render_postgresql_url
SECRET_KEY=your_secret_key
ACCESS_TOKEN_EXPIRE_MINUTES=1440
MODEL_PATH=app/ml/saved_model.pkl
BREVO_API_KEY=your_brevo_key
MAIL_SENDER_EMAIL=your_verified_sender_email
MAIL_SENDER_NAME=CKD Guardian
```

---

## Database Migration Notes

If new columns are added after the database already exists, run SQL manually.

For the recent/past archive workflow, required columns are:

```sql
ALTER TABLE patients
ADD COLUMN IF NOT EXISTS overview_archived BOOLEAN DEFAULT FALSE;

ALTER TABLE patients
ADD COLUMN IF NOT EXISTS overview_archived_at TIMESTAMPTZ NULL;

ALTER TABLE teleconsultations
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;

ALTER TABLE teleconsultations
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ NULL;
```

---

## Notes

- SQLite is suitable for local/demo use.
- PostgreSQL is recommended for production deployment.
- Uploaded report images are supporting inputs, not direct prediction inputs.
- The ML model is based on structured CKD dataset features.
- Consultation and overview clear actions move data to Past instead of deleting it.
- Doctor overview APIs are doctor-only.
- Patient dashboard APIs are patient-specific.