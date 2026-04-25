# CKD Guardian Backend

This is the FastAPI backend for **CKD Guardian**.  
It provides APIs for authentication, patient profiles, CKD readings, ML prediction, alerts, notifications, uploads, and teleconsultation.

## Features

- user authentication
- patient profile creation
- CKD reading submission
- prediction generation
- alerts for abnormal values
- in-app notifications
- teleconsultation scheduling
- report image upload
- report-value extraction support
- Brevo email integration

## Main Modules

### Authentication
- register user
- login user
- JWT token handling

### Patient
- create patient profile
- fetch patient details

### Reading
- save CKD reading
- fetch latest reading
- fetch reading history

### Prediction
- generate CKD risk score
- determine risk level
- compute trend status

### Alerts
- create alerts for:
  - high risk
  - high blood pressure
  - worsening trend
  - low adherence

### Notifications
- notify doctor for urgent cases
- notify patient for urgent review
- notify patient when consultation is scheduled
- notify patient/doctor when consultation is updated

### Uploads
- Excel upload for readings
- report image upload
- report extraction route

### Teleconsultation
- create consultation
- get doctor consultation list
- get patient consultation list
- update consultation details

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
└── README.md

## Important Models
* User
* Patient
* Reading
* Prediction
* Alert
* Notification
* Teleconsultation
* Important Services
* prediction_service.py
* email_service.py
* notification_service.py
* upload_service.py

## Setup
1. Create virtual environment
bash,, 
      python3 -m venv .venv
      source .venv/bin/activate
2. Install dependencies
bash,,
      pip install -r requirements.txt
3. Environment variables

## Create a .env file and add:

DATABASE_URL=sqlite:///./renalwatch.db
SECRET_KEY=your_secret_key
ACCESS_TOKEN_EXPIRE_MINUTES=1440
MODEL_PATH=app/ml/saved_model.pkl
BREVO_API_KEY=your_brevo_key
MAIL_SENDER_EMAIL=Your_Email@gmail.com
MAIL_SENDER_NAME=CKD Guardian

4. Run server
bash,,
      uvicorn app.main:app --reload
## API Root
   http://127.0.0.1:8000
## Common Endpoints
### Auth
* POST /auth/register
* POST /auth/login
### Patients
* GET /patients/me
* POST /patients
### Readings
* POST /readings/{patient_id}
* GET /readings/{patient_id}
* GET /readings/latest/{patient_id}
### Predictions
* GET /predictions/{patient_id}
* GET /predictions/latest/{patient_id}
### Alerts
* GET /alerts/{patient_id}
* PUT /alerts/{alert_id}/resolve
### Notifications
* GET /notifications
* PUT /notifications/{notification_id}/read
### Uploads
* POST /uploads/report-image
* POST /uploads/report-extract
* POST /uploads/excel/{patient_id}
### Teleconsultations
* POST /teleconsultations
* GET /teleconsultations/patient/{patient_id}
* GET /teleconsultations/doctor/{doctor_id}
* PUT /teleconsultations/{consultation_id}
### Email Workflow

Brevo is used for:

* patient consultation emails
* urgent doctor alert emails

Note: sender identity may appear through Brevo sender domain unless a custom domain is authenticated.

## Deployment

For Render deployment:

Build Command
--> pip install -r requirements.txt
Start Command
--> uvicorn app.main:app --host 0.0.0.0 --port $PORT
## Notes
* SQLite is suitable for local/demo use
* for production, PostgreSQL is recommended
* uploaded report images are supporting inputs, not direct prediction inputs
* ML model remains based on structured CKD dataset features.