# CKD Guardian Backend

This is the FastAPI backend for **CKD Guardian**, a Chronic Kidney Disease detection and monitoring platform.

The backend handles authentication, CKD risk prediction, health records, alerts, notifications, doctor-patient workflows, medication tracking, and email alert support.

## Live Backend

```txt
https://ckd-guardian-backend.onrender.com

API documentation:

https://ckd-guardian-backend.onrender.com/docs

* Main Features
-User registration and login
-CKD risk prediction using ML model
-Urea-based risk analysis
-Health record storage
-Patient history tracking
-Doctor-patient connection requests
-Medication management
-Alert contact management
-Email alert support using Brevo
-Push notification token support
-Backend health/status checks

* Tech Stack
--FastAPI
--Python
--SQLAlchemy
--PostgreSQL
--Supabase PostgreSQL
--Scikit-learn
--Render
--Brevo email API

* Project Structure
backend/
├── app/
│   ├── api/              # API routes
│   ├── core/             # Config and security
│   ├── database/         # Database session and base setup
│   ├── models/           # SQLAlchemy models
│   ├── schemas/          # Pydantic schemas
│   ├── services/         # Business logic
│   ├── websockets/       # Chat websocket support
│   └── main.py           # FastAPI app entry point
├── ml/
│   ├── data/             # CKD training data
│   ├── models/           # Saved ML model
│   └── training/         # Training script
├── requirements.txt
└── README.md

* Environment Variables
Create a .env file inside the backend folder:

DATABASE_URL=postgresql://your_database_url
SECRET_KEY=your_secret_key
INTERNAL_API_KEY=ckdguardian-secure-key-2026

BREVO_API_KEY=your_brevo_api_key
BREVO_SENDER_EMAIL=ckdguardian.notifications@gmail.com
BREVO_SENDER_NAME=CKD Guardian

DEBUG=False
OTP_EXPIRY_MINUTES=15
PYTHON_VERSION=3.11.9

-->Do not commit .env to GitHub.

* Running Locally
Create and activate virtual environment:
Bash.,
  python3 -m venv .venv
  source .venv/bin/activate

Install dependencies:
Bash.,
  pip install -r requirements.txt

Run backend:
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

Open API docs:
http://127.0.0.1:8000/docs

* API Key Requirement
Most backend routes require this header:

X-API-Key: ckdguardian-secure-key-2026

Example:
Bash.,
  curl https://ckd-guardian-backend.onrender.com/health \
  -H "X-API-Key: ckdguardian-secure-key-2026"

* Important API Routes
GET  /health
GET  /ping

POST /api/auth/register
POST /api/auth/login

POST /api/hospital/predict
POST /api/urea/predict
POST /api/hospital/extract-report

GET  /api/records
POST /api/records

GET  /api/users/{user_id}
PATCH /api/users/{user_id}

GET  /api/medications
POST /api/medications

GET  /api/notifications
POST /api/push/register

* Deployment
The backend is deployed on Render.

--Recommended Render settings:
Root Directory: backend
Build Command: pip install -r requirements.txt
Start Command: python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT

--Required Render environment variables:
DATABASE_URL=your_supabase_postgres_url
SECRET_KEY=your_secret_key
INTERNAL_API_KEY=ckdguardian-secure-key-2026
BREVO_API_KEY=your_brevo_api_key
BREVO_SENDER_EMAIL=Your@gmail.com
BREVO_SENDER_NAME=CKD Guardian
DEBUG=False
OTP_EXPIRY_MINUTES=15
PYTHON_VERSION=3.11.9

* Database
-The backend uses PostgreSQL hosted on Supabase.
-During startup, the backend verifies and creates required database tables if needed.

* ML Model
The CKD prediction model is stored in:

backend/ml/models/ckd_risk_model.pkl

-The model is loaded during backend startup and used for prediction routes.

* Notes
-Frontend is deployed separately on Vercel.
-Mobile APK is handled separately through the mobileapp folder.
-Database is hosted on Supabase PostgreSQL.
-Email alerts use Brevo.
-Keep all secret keys inside Render environment variables, not GitHub.