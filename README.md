# 🩺 CKD Guardian

**AI-Powered Chronic Kidney Disease Detection, Monitoring & Telemedicine Platform**

🌍 **Live Website:** https://ckd-guardian.vercel.app/
⚙️ **Backend API:** https://ckd-guardian-backend.onrender.com  
📘 **API Docs:** https://ckd-guardian-backend.onrender.com/docs

---

## Overview

CKD Guardian is a full-stack healthcare application designed for Chronic Kidney Disease detection, monitoring, alerts, and patient-doctor interaction.

The system allows patients to enter health readings, receive CKD risk predictions, track health history, view recommendations, manage medications, and connect with doctors through a digital dashboard.

The project includes:

- Next.js frontend
- FastAPI backend
- Supabase PostgreSQL database
- Machine learning model for CKD risk prediction
- Capacitor-based mobile app wrapper

---

## Features

- **CKD Risk Prediction**  
  Predicts CKD risk using clinical inputs such as creatinine, urea, eGFR, hemoglobin, and age.

- **Urea-Based Analysis**  
  Allows quick risk estimation using urea readings with estimated supporting biomarkers.

- **Patient Dashboard**  
  Displays health score, risk level, trends, alerts, and recommendations.

- **Health History**  
  Stores previous assessments and allows users to review past CKD risk reports.

- **Doctor-Patient Linking**  
  Supports doctor-patient connection requests and role-based dashboards.

- **Medication Management**  
  Helps users track medicines, dosage schedules, refill alerts, and interaction warnings.

- **Notifications and Alerts**  
  Supports alert contacts, in-app notifications, and email alert functionality.

- **Mobile App Support**  
  Includes a Capacitor-based mobile app structure for Android/iOS builds.

---

## Project Structure

```txt
CKD_Guardian/
├── backend/          # FastAPI backend and ML logic
├── frontend/         # Next.js web frontend
├── mobileapp/        # Capacitor mobile app wrapper
├── render.yaml       # Render deployment configuration
├── README.md         # Main project documentation
└── .gitignore


Tech Stack
Layer	Technology
Frontend	Next.js, React, TypeScript, Tailwind CSS
Backend	FastAPI, SQLAlchemy, Pydantic
Database	Supabase PostgreSQL
Machine Learning	scikit-learn, pandas, NumPy
Authentication	NextAuth + backend email/password auth
Email Alerts	Brevo API
Mobile	Capacitor
Deployment	Vercel, Render, Supabase
Live Deployment
Frontend

https://ckd-app-blond.vercel.app

The frontend is deployed on Vercel.
Backend

https://ckd-guardian-backend.onrender.com

The backend is deployed on Render.
API Documentation

https://ckd-guardian-backend.onrender.com/docs


Running Locally
1. Clone the Repository

git clone https://github.com/akash335/CKD_app.git
cd CKD_app


Backend Setup

cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

Backend local URL:

http://127.0.0.1:8000

API docs:

http://127.0.0.1:8000/docs


Frontend Setup

cd frontend
npm install --legacy-peer-deps
npm run dev

Frontend local URL:

http://localhost:3000


Mobile App Setup

cd mobileapp
npm install --legacy-peer-deps
npx cap sync android
cd android
./gradlew assembleDebug

Debug APK output:

mobileapp/android/app/build/outputs/apk/debug/app-debug.apk


Environment Variables
Backend Environment Variables
Create a .env file inside the backend folder:

DATABASE_URL=your_supabase_postgres_url
SECRET_KEY=your_secret_key
INTERNAL_API_KEY=ckdguardian-secure-key-2026

BREVO_API_KEY=your_brevo_api_key
BREVO_SENDER_EMAIL=ckdguardian.notifications@gmail.com
BREVO_SENDER_NAME=CKD Guardian

DEBUG=False
OTP_EXPIRY_MINUTES=15
PYTHON_VERSION=3.11.9

Frontend Environment Variables
Create a .env.local file inside the frontend folder:

NEXT_PUBLIC_API_URL=https://ckd-guardian-backend.onrender.com
NEXT_PUBLIC_INTERNAL_API_KEY=ckdguardian-secure-key-2026

NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_here

For Vercel deployment:

NEXTAUTH_URL=https://ckd-app-blond.vercel.app


Important Notes
* Do not commit .env files to GitHub.
* Backend secrets such as DATABASE_URL, SECRET_KEY, and BREVO_API_KEY should only be stored in Render environment variables.
* Frontend public variables should be stored in Vercel environment variables.
* Google login is optional and requires separate Google OAuth setup.
* Email/password login works through the FastAPI backend.
* The mobile APK is built locally from the mobileapp folder.

Main API Routes

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

Most backend routes require:

X-API-Key: ckdguardian-secure-key-2026


Machine Learning Model
The CKD risk model is stored in:

backend/ml/models/ckd_risk_model.pkl

The model uses clinical kidney-related inputs and returns:
* risk level
* confidence score
* health score
* explanation
* contributing factors

Deployment Summary
Part	Platform
Frontend	Vercel
Backend	Render
Database	Supabase PostgreSQL
Mobile App	Capacitor APK build
License
This project is created for educational, academic, and research purposes.


This version is better because it matches your actual final setup:

```txt
frontend  → Vercel
backend   → Render
database  → Supabase
mobileapp → Capacitor APK