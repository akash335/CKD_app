# CKD Guardian Mobile App

This folder contains the Capacitor mobile wrapper for CKD Guardian.

The app supports:

- Android
- iOS

The mobile app loads the live CKD Guardian frontend:

```txt
https://ckd-guardian.vercel.app

Backend API:

https://ckd-guardian-backend.onrender.com

Android Setup

npm install --legacy-peer-deps
npx cap sync android
npx cap open android

To build a debug APK:

cd android
./gradlew assembleDebug

APK location:

android/app/build/outputs/apk/debug/app-debug.apk

iOS Setup

npm install --legacy-peer-deps
npx cap sync ios
npx cap open ios

This opens the iOS project in Xcode.
In Xcode:
1. Select the App target.
2. Open Signing & Capabilities.
3. Select your Apple ID / Personal Team.
4. Enable automatic signing.
5. Choose an iPhone simulator or connected iPhone.
6. Click Run.
The iOS app is working and loads the deployed CKD Guardian web app inside a native Capacitor WebView.
Notes
* Frontend UI changes should be deployed to Vercel.
* Since the mobile app points to the live Vercel URL, Android and iOS usually receive UI updates without rebuilding the native app.
* Re-run npx cap sync ios or npx cap sync android when native configuration or plugins change.
* A free Apple ID can run the iOS app on a personal iPhone through Xcode.
* TestFlight and App Store distribution require a paid Apple Developer account.