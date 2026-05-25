# 🩺 CKD Guardian

**AI-Powered Chronic Kidney Disease Monitoring & Prediction Platform**

🌍 **Live Website:** [https://ckdguardianofficial.vercel.app](https://ckdguardianofficial.vercel.app)

CKD Guardian is a full-stack healthcare application that combines real-time lab data monitoring with machine learning to predict CKD risk, track kidney health trends, and connect patients with doctors — all through an intuitive, responsive dashboard.

---

## ✨ Features

- **ML-Powered Risk Prediction** — GradientBoosting classifier trained on clinical CKD data (creatinine, urea, eGFR, hemoglobin)
- **Multi-Source Data Input** — Hospital reports, urea monitor readings, and LCR sensor data
- **Smart Intelligence Reports** — Automated alerts, trend analysis, and personalized recommendations
- **Doctor-Patient Linking** — Secure connection requests with real-time messaging
- **Medication Management** — Track medications, drug interaction checks, refill alerts
- **Analytics Dashboard** — Historical trends, metric comparisons, and health score tracking
- **Dark/Light Theme** — Full glassmorphism UI with responsive mobile-first design

---

## 🏗️ Architecture

```
ckd-app/
├── frontend/          # Next.js 16 + React 19 (TypeScript)
├── backend/           # FastAPI + SQLAlchemy (Python)
│   └── app/
│       ├── api/       # REST endpoints
│       ├── models/    # SQLAlchemy ORM models
│       ├── schemas/   # Pydantic request/response schemas
│       ├── services/  # Business logic layer
│       └── websockets/ # Real-time chat
├── ml/
│   ├── models/        # Trained model (.pkl) + metadata
│   ├── training/      # Model training pipeline
│   └── data/          # Training dataset
└── mobileapp/         # Capacitor wrapper (Android/iOS)
```

---

## 🚀 Quick Start

### Prerequisites

- **Python** 3.11+
- **Node.js** 20+
- **PostgreSQL** (or Supabase)

### 1. Clone & Setup Environment

```bash
git clone https://github.com/your-username/ckd-app.git
cd ckd-app
cp .env.example .env
# Edit .env with your database URL, secrets, and OAuth credentials
```

### 2. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

### 4. Train ML Model (first time only)

```bash
cd ckd-app
python -m ml.training.train_ckd_model
```

Open [http://localhost:3000](http://localhost:3000) to access the app.

---

## 🔑 Environment Variables

| Variable | Description |
|:---------|:------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `SECRET_KEY` | Backend JWT/session secret |
| `NEXT_PUBLIC_API_URL` | Backend URL for frontend API calls |
| `NEXTAUTH_URL` | Frontend URL for NextAuth |
| `NEXTAUTH_SECRET` | NextAuth encryption secret |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |

See [`.env.example`](.env.example) for the full template.

---

## 🧠 ML Model

The CKD risk prediction model uses a **GradientBoosting classifier** trained on clinical kidney disease data with engineered features:

- **Input**: Creatinine, Urea, eGFR, Hemoglobin, Age
- **Engineered Features**: BUN/Creatinine ratio, Anemia flag, eGFR stage encoding
- **Output**: Risk level (low/moderate/high/critical), confidence score, health score

Model artifacts are stored in `ml/models/` and loaded once at backend startup.

---

## 📡 API

The backend exposes a RESTful API with automatic OpenAPI documentation:

- **Swagger UI (Live)**: [https://ckdguardian.onrender.com/docs](https://ckdguardian.onrender.com/docs)
- **Swagger UI (Local)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check**: `GET /health`
- **Predictions**: `POST /api/hospital/predict`, `POST /api/urea/predict`
- **Records**: `GET /api/records`, `POST /api/records`
- **Intelligence**: `GET /api/intelligence/report`
- **Messaging**: WebSocket at `/ws/chat/{conversation_id}`

---

## 🛠️ Tech Stack

| Layer | Technology |
|:------|:-----------|
| Frontend | Next.js 16, React 19, TypeScript, TailwindCSS 4 |
| Backend | FastAPI, SQLAlchemy 2, Pydantic 2 |
| Database | PostgreSQL (Supabase) |
| ML | scikit-learn, pandas, numpy |
| Auth | NextAuth.js (Google OAuth + email/password) |
| Real-time | WebSockets (FastAPI) |
| Mobile | Capacitor |

---

## 📄 License

This project is for educational and research purposes.
