# CKD Guardian Frontend

This is the web frontend for **CKD Guardian**, a healthcare platform for Chronic Kidney Disease detection, monitoring, alerts, and patient-doctor interaction.

The frontend is built with **Next.js** and connects to the FastAPI backend deployed on Render.

## Live Links

Frontend:

```txt
https://ckd-app-blond.vercel.app

Backend API:

https://ckd-guardian-backend.onrender.com

* Features
-Patient sign up and sign in
-CKD risk prediction
-Urea-based risk analysis
-Patient dashboard
-Health history tracking
-Analytics and recommendations
-Medication tracking
-Doctor-patient connection support
-Backend status monitoring

* Tech Stack
--Next.js
--React
--TypeScript
--Tailwind CSS
--NextAuth
--FastAPI backend integration

* Environment Variables
Create a .env.local file inside the frontend folder:

NEXT_PUBLIC_API_URL=https://ckd-guardian-backend.onrender.com
NEXT_PUBLIC_INTERNAL_API_KEY=ckdguardian-secure-key-2026
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_here

* For Vercel deployment, use:

NEXT_PUBLIC_API_URL=https://ckd-guardian-backend.onrender.com
NEXT_PUBLIC_INTERNAL_API_KEY=ckdguardian-secure-key-2026
NEXTAUTH_URL=https://ckd-app-blond.vercel.app
NEXTAUTH_SECRET=your_nextauth_secret_here

*Run Locally
Bash., 
  npm install
  npm run dev

Open:

http://localhost:3000

*Build
Bash.,
  npm run build
  npm start

* Deployment
This frontend is deployed on Vercel.

Recommended Vercel settings:
-Root Directory: frontend
-Framework Preset: Next.js
-Install Command: npm install --legacy-peer-deps
-Build Command: npm run build
-Output Directory: default

*Notes
-Backend is deployed separately on Render.
-Database is hosted on Supabase PostgreSQL.
-Mobile APK is handled separately through the mobileapp folder.
-Google login is optional and requires Google OAuth configuration.