## 📱 Mobile App Support

CKD Guardian is also available as a mobile app using **Capacitor**, which wraps the live deployed Next.js web app inside native Android and iOS projects.

The mobile app loads the production frontend:

```txt
https://ckd-guardian.vercel.app

Because the app uses the live Vercel URL, most frontend updates are reflected automatically in both Android and iOS after redeployment.
Android
The Android version is working through Android Studio / Gradle and can generate a debug APK.

cd mobileapp
npm install --legacy-peer-deps
npx cap sync android
cd android
./gradlew assembleDebug

APK output:

mobileapp/android/app/build/outputs/apk/debug/app-debug.apk

iOS
The iOS version is also working through Xcode using Capacitor.

cd mobileapp
npm install --legacy-peer-deps
npx cap sync ios
npx cap open ios

After opening in Xcode:
1. Select the App target.
2. Go to Signing & Capabilities.
3. Choose your Apple ID / Personal Team.
4. Enable automatic signing.
5. Select an iPhone simulator or a connected iPhone.
6. Click Run.
The iOS app successfully loads the CKD Guardian live app from:

https://ckd-guardian.vercel.app

For installing on a personal iPhone, a free Apple ID works through Xcode. For TestFlight or App Store distribution, an Apple Developer Program account is required.


Also update your **`mobileapp/README.md`** with this:

```md
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