# CKD Guardian

**CKD Guardian** is a kidney-focused digital health project built for **CKD detection, monitoring, alerts, and telemedicine support**.

It is designed as a **mobile-first system with web compatibility**, where patients can submit CKD readings, receive risk analysis, view alerts, get notifications, and interact with doctors through consultation workflows.

The project is based on a **manually prepared and tested CKD dataset**. Its ML logic works on the same structured clinical and sensor-based features used during training.

---

## Project Objective

The objective of CKD Guardian is to provide a simple and practical platform for:

- CKD risk detection using structured medical inputs
- Monitoring kidney-related trends over time
- Generating alerts for abnormal readings
- Notifying doctors about urgent cases
- Supporting telemedicine consultations between doctors and patients

---

## Core Features

### Patient Side

- Register and login
- Create patient profile
- Enter CKD readings manually
- Upload report image
- Extract report values into dataset-based fields
- View CKD risk score
- View latest readings and prediction trend
- Receive alerts
- Receive notifications
- View teleconsultation details
- View recent and past consultation history

### Doctor Side

- Doctor login
- Review urgent CKD cases
- View patient overview
- View recent and past patient overview records
- Receive urgent alerts and notifications
- Schedule consultations
- Add doctor advice
- Add prescription note
- Add patient instructions
- View recent and past consultation history

---

## ML Scope

The app uses only the features included in the project dataset, such as:

- Creatinine
- Urine albumin
- ACR
- eGFR
- Systolic BP
- Diastolic BP
- Glucose
- Sensor values
- Symptom indicators
- Adherence score

Uploaded report images are used only to **extract values** and help autofill these structured fields.

The image itself is **not directly used as a prediction input**.

---

## Project Structure

```text
CKD app/
├── backend/
│   ├── app/
│   ├── requirements.txt
│   └── README.md
├── mobile-app/
│   ├── app/
│   ├── assets/
│   ├── package.json
│   ├── app.json
│   ├── eas.json
│   └── README.md
└── README.md
```

---

## Technology Stack

### Frontend

- React Native
- Expo
- React Navigation
- Axios
- Expo Web

### Backend

- FastAPI
- SQLAlchemy
- Pydantic
- SQLite for local development
- PostgreSQL for deployment

### ML / Logic

- Joblib
- NumPy
- Scikit-learn
- Trained CKD model or heuristic fallback logic

### Notifications / Email

- Brevo email integration
- In-app notification system

### Deployment

- Render for backend deployment
- Vercel for web deployment
- Expo EAS for Android/iOS builds

---

## Running the Project Locally

### Backend

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload
```

Backend API:

```text
http://127.0.0.1:8000
```

Swagger docs:

```text
http://127.0.0.1:8000/docs
```

---

### Mobile App

```bash
cd mobile-app
npm install
npx expo start --localhost
```

---

### Web App

```bash
cd mobile-app
npx expo start --web
```

---

## Deployment Plan

- Backend deployed on **Render**
- Web frontend deployed on **Vercel**
- Android and iOS builds generated using **Expo EAS**
- PostgreSQL used as production database on Render

---

## Recent and Past Workflow

CKD Guardian uses a soft-clear workflow.

### Doctor Overview

```text
Recent patient overview → Clear → Past patient overview
```

Doctor overview data is not deleted permanently. Cleared overview records move to Past and remain visible.

### Consultation History

```text
Recent consultations → Clear → Past consultations
```

Consultation history is not deleted permanently. Cleared consultations move to Past and remain visible for both patient and doctor accounts.

---

## Notes

- This project is focused on CKD dataset-driven prediction.
- It should not be presented as a general-purpose hospital AI system.
- Uploaded report images are used for value extraction and autofill only.
- The ML model works on structured dataset fields, not raw images.
- The project is intended for academic/project demonstration and workflow validation.

---

## Author

CKD Guardian Project Team