# CKD Guardian

CKD Guardian is a kidney-focused digital health project built for **CKD detection, monitoring, alerts, and telemedicine support**.  
It is designed as a **mobile first system** with web compatibility, where patients can submit readings, receive risk analysis, view alerts, and interact with doctors through consultation workflows.

The project is based on a **manually prepared and tested CKD dataset**.  
Its ML logic works on the same structured clinical and sensor features used during training.

## Project Objective

The objective of CKD Guardian is to provide a simple and practical platform for:

- CKD risk detection using structured medical inputs
- monitoring kidney-related trends over time
- generating alerts for abnormal readings
- notifying doctors for urgent cases
- supporting telemedicine consultations between doctor and patient

## Core Features

### Patient Side
- register and login
- create patient profile
- enter CKD readings manually
- upload report image
- extract report values into dataset-based fields
- view CKD risk score
- view latest readings and prediction trend
- receive alerts
- receive notifications
- view teleconsultation details

### Doctor Side
- doctor login
- review urgent CKD cases
- receive urgent alerts and notifications
- schedule consultations
- add doctor advice
- add prescription note
- add patient instructions

## ML Scope

The app uses only the features included in the project dataset, such as:

- creatinine
- urine albumin
- ACR
- eGFR
- systolic BP
- diastolic BP
- glucose
- sensor values
- symptom indicators
- adherence score

Uploaded report images are used only to **extract values** and help autofill these structured fields.  
The image itself is **not directly used as a prediction input**.

## Project Structure

```text
CKD app/
├── backend/
├── mobile-app/
└── README.md

## Technology Stack
#Frontend
-> React Native
-> Expo
-> React Navigation
-> Axios
#Backend
-> FastAPI
-> SQLAlchemy
-> SQLite
-> Pydantic
#ML / Logic
-> Joblib
-> NumPy
-> trained CKD model or heuristic fallback
#Notifications / Email
-> Brevo email integration
-> in-app notification system
### Running the Project Locally
# Backend
bash,,
      cd backend
      source .venv/bin/activate
      uvicorn app.main:app --reload
### Mobile App
bash,,
      cd mobile-app
      npx expo start --localhost
### Web
bash,,
      cd mobile-app
      npx expo start --web
## Deployment Plan
* backend deployed on Render
* mobile app built with Expo EAS for Android and iOS
* web version served from Expo web build
## Notes
* This project is focused on CKD dataset-driven prediction
* It should not be presented as a general-purpose hospital AI system
* It is intended for academic/project demonstration and workflow validation.

Author

CKD Guardian project team