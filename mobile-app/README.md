# CKD Guardian Mobile App

This is the Expo React Native frontend for **CKD Guardian**.  
It supports patient and doctor workflows for CKD monitoring, alerts, notifications, and teleconsultation.

## Features

### Patient Features
- login and registration
- patient dashboard
- CKD reading submission
- manual reading entry
- report image upload
- extraction of report values into form
- risk display
- trend chart
- alerts screen
- notifications screen
- teleconsultation updates

### Doctor Features
- doctor login
- doctor dashboard
- urgent case visibility
- notifications
- teleconsultation scheduling
- doctor advice entry
- prescription note entry
- patient instruction entry

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
├── package.json
├── app.json
├── eas.json
└── README.md

## Major Screens
--> LoginScreen.js
--> RegisterScreen.js
--> DashboardScreen.js
--> AddReadingScreen.js
--> AlertsScreen.js
--> NotificationsScreen.js
--> TelemedicineScreen.js
--> DoctorDashboardScreen.js

## Important Components
--> RiskCard.js
--> TrendChart.js
--> SectionCard.js
--> AlertCard.js
--> StatPill.js

## Important Services
--> authService.js
--> patientService.js
--> readingService.js
--> predictionService.js
--> alertService.js
--> notificationService.js
--> telemedicineService.js

### Setup
1. Install dependencies
bash,, 
      npm install
2. Start Expo
bash,, 
      npx expo start --localhost
3. Start web
bash,, 
      npx expo start --web

### API Configuration

The frontend uses a platform-aware API base URL.

Example:

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

### Android / iOS Build

* Expo EAS is used for native builds.

** Preview build
bash,,
      eas build --platform android --profile preview
      eas build --platform ios --profile preview

** Production build
bash,,
      eas build --platform android --profile production
      eas build --platform ios --profile production

### Web Support

* The app also supports web through Expo web.

## Required packages:

* react-native-web
* react-dom
* @expo/metro-runtime

** Notes
* the app is based on structured CKD dataset logic
* report images are used for extraction and autofill
* images are not direct ML inputs
* patient and doctor roles have different tabs and workflow access

## Recommended Testing

Before deployment, test:

* login
* reading submission
* risk prediction
* alerts
* notifications
* consultation creation
* consultation display
* image upload
* report extraction
* email flow