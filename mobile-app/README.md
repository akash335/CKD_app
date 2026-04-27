# CKD Guardian Mobile App

This is the **Expo React Native frontend** for **CKD Guardian**, a CKD detection and monitoring application for patients and doctors.

The mobile app supports patient dashboards, CKD reading submission, ML-based risk display, alerts, notifications, report image upload, teleconsultation scheduling, and recent/past consultation history.

---

## Features

### Patient Features

- Patient registration and login
- Patient dashboard
- CKD risk overview
- CKD reading submission
- Manual reading entry
- Report image upload
- Extraction of report values into the reading form
- ML-based risk score display
- Risk level and trend display
- Trend chart
- Latest kidney markers
- Alerts screen
- Notifications screen
- Consultation updates
- Recent and past consultation history

### Doctor Features

- Doctor registration and login
- Doctor overview dashboard
- Recent and past patient overview
- Urgent case visibility
- Patient roster
- Notifications screen
- Teleconsultation scheduling
- Doctor advice entry
- Prescription note entry
- Patient instruction entry
- Recent and past consultation history

---

## App Structure

```text
mobile-app/
├── App.js
├── app/
│   ├── components/
│   ├── navigation/
│   ├── screens/
│   ├── services/
│   └── utils/
├── assets/
├── package.json
├── app.json
├── eas.json
├── vercel.json
└── README.md
```

---

## Major Screens

- `LoginScreen.js`
- `RegisterScreen.js`
- `DashboardScreen.js`
- `AddReadingScreen.js`
- `AlertsScreen.js`
- `NotificationsScreen.js`
- `TelemedicineScreen.js`
- `DoctorDashboardScreen.js`
- `HistoryScreen.js`

---

## Important Components

- `RiskCard.js`
- `TrendChart.js`
- `SectionCard.js`
- `AlertCard.js`
- `StatPill.js`

---

## Important Services

- `api.js`
- `authService.js`
- `patientService.js`
- `readingService.js`
- `predictionService.js`
- `alertService.js`
- `notificationService.js`
- `telemedicineService.js`
- `storage.js`

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Start Expo locally

```bash
npx expo start --localhost
```

### 3. Start web version locally

```bash
npx expo start --web
```

---

## API Configuration

The frontend uses a platform-aware API base URL.

Example:

```javascript
import { Platform } from 'react-native';

const PROD_API_URL = 'https://your-backend-name.onrender.com';
const LOCAL_WEB_API_URL = 'http://127.0.0.1:8000';
const LOCAL_ANDROID_API_URL = 'http://10.0.2.2:8000';
const LOCAL_IOS_API_URL = 'http://127.0.0.1:8000';

export const API_BASE_URL = __DEV__
  ? Platform.OS === 'web'
    ? LOCAL_WEB_API_URL
    : Platform.OS === 'android'
    ? LOCAL_ANDROID_API_URL
    : LOCAL_IOS_API_URL
  : PROD_API_URL;
```

For deployed web builds, use the Render backend URL:

```javascript
const PROD_API_URL = 'https://ckd-guardian-backend.onrender.com';
```

---

## Role-Based Navigation

CKD Guardian uses separate workflows for patient and doctor accounts.

### Patient Tabs

- Home
- Readings
- Alerts
- Notify
- Consult
- History

### Doctor Tabs

- Overview
- Notify
- Consult
- History

Patient accounts should open the patient dashboard. Doctor accounts should open the doctor overview dashboard.

---

## Recent and Past Workflow

The app uses a soft-clear workflow.

### Doctor Overview

```text
Recent patient overview → Clear recent overview → Past patient overview
```

The clear button does not permanently delete patient overview data. It moves recent overview data to the Past tab.

### Consultation History

```text
Recent consultations → Clear recent → Past consultations
```

The clear button moves recent consultations to Past. Past consultations remain visible in both patient and doctor accounts.

---

## Android / iOS Build

Expo EAS is used for native builds.

### Preview build

```bash
eas build --platform android --profile preview
eas build --platform ios --profile preview
```

### Production build

```bash
eas build --platform android --profile production
eas build --platform ios --profile production
```

---

## Web Deployment

The app supports Expo web and can be deployed on Vercel.

### Local web export

```bash
npx expo export --platform web
```

### Vercel project settings

```text
Root Directory: mobile-app
Build Command: npx expo export --platform web
Output Directory: dist
Install Command: npm install
Framework Preset: Other
```

### Deploy from project root

Run the Vercel command from the main project folder, not from inside `mobile-app` if the Vercel root directory is already set to `mobile-app`.

```bash
cd ~/Downloads/CKD\ app
vercel --prod
```

---

## Required Web Packages

- `react-native-web`
- `react-dom`
- `@expo/metro-runtime`

---

## App Assets

Important asset files:

```text
mobile-app/assets/icon.png
mobile-app/assets/adaptive-icon.png
mobile-app/assets/splash.png
mobile-app/assets/favicon.png
```

Recommended sizes:

- `icon.png`: 1024 × 1024 PNG
- `adaptive-icon.png`: 1024 × 1024 PNG
- `splash.png`: 1242 × 2436 PNG
- `favicon.png`: 64 × 64 PNG

---

## Recommended Testing

Before deployment, test:

- Patient registration
- Doctor registration
- Login/logout
- Patient dashboard
- CKD reading submission
- Risk prediction display
- Alerts generation
- Notification loading
- Consultation creation by doctor
- Consultation display for patient
- Recent/past consultation history
- Recent/past doctor overview
- Report image upload
- Report value extraction
- Email notification flow
- Web deployment on Vercel
- Native build through Expo EAS

---

## Notes

- The app is based on structured CKD dataset logic.
- Report images are used for extraction and autofill.
- Report images are not direct ML inputs.
- Patient and doctor roles have different tabs and workflow access.
- The app uses backend APIs for authentication, readings, predictions, alerts, notifications, and teleconsultation.
- Recent clear actions move records to Past instead of permanently deleting them.