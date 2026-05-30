# CKD Guardian Mobile App

This folder contains the mobile version of **CKD Guardian**, built using **Capacitor**.  
The mobile app wraps the CKD Guardian web frontend into an Android/iOS app so it can be installed on phones.

The app connects to the same deployed backend used by the web version.

## Live Services

Frontend:

```txt
https://ckd-app-blond.vercel.app

Backend API:

https://ckd-guardian-backend.onrender.com

What This Mobile App Does
The mobile app provides access to:
* Patient sign up and sign in
* CKD risk prediction
* Urea-based risk analysis
* Patient dashboard
* Health history
* Medication tracking
* Doctor-patient connection features
* Alerts and recommendations
* Backend status monitoring
Tech Stack
* Capacitor
* Android native project
* WebView-based mobile app
* Next.js frontend integration
* FastAPI backend integration
Project Structure

mobileapp/
├── android/                  # Android native project
│   ├── app/
│   ├── gradle/
│   └── build.gradle
├── ios/                      # iOS native project
├── assets/                   # App icons and splash assets
├── icons/                    # Additional icon assets
├── www/                      # Web assets copied into mobile app
├── capacitor.config.json     # Capacitor app configuration
├── package.json              # Mobile app dependencies
├── BUILD_INSTRUCTIONS.md
└── README.md

App Information

App Name: CKD Guardian
Package ID: com.ckdguardian.mobileapp
Platform: Android / iOS through Capacitor
Type: Hybrid WebView app

Install Dependencies
From the mobileapp folder:

npm install --legacy-peer-deps

The --legacy-peer-deps flag is used because some Capacitor-related packages may have peer dependency version conflicts.
Sync Android Project
After installing dependencies:

npx cap sync android

If needed:

npx capacitor sync android

Build Debug APK
Go to the Android folder:

cd android
./gradlew assembleDebug

After successful build, the APK will be generated here:

mobileapp/android/app/build/outputs/apk/debug/app-debug.apk

This debug APK can be transferred to an Android phone and installed manually.
Build Release APK
For a release build:

cd android
./gradlew assembleRelease

The release APK will be generated here:

mobileapp/android/app/build/outputs/apk/release/

A release APK may need signing before public distribution.
Opening in Android Studio
To open the native Android project:

npx cap open android

Then build or run the app from Android Studio.
Updating the Mobile App After Frontend Changes
If the frontend changes, rebuild the frontend first:

cd ../frontend
npm install --legacy-peer-deps
npm run build

Then sync the updated web files into Capacitor:

cd ../mobileapp
npx cap sync android

Then rebuild the APK:

cd android
./gradlew assembleDebug

Environment Notes
The mobile app uses the deployed web/frontend configuration.The frontend should point to the deployed backend:

NEXT_PUBLIC_API_URL=https://ckd-guardian-backend.onrender.com
NEXT_PUBLIC_INTERNAL_API_KEY=ckdguardian-secure-key-2026

Backend secrets such as DATABASE_URL, SECRET_KEY, and BREVO_API_KEY should not be placed inside the mobile app.
Common Issues
Gradle wrapper missing
If this error appears:

Unable to access jarfile gradle-wrapper.jar

Regenerate the wrapper:

gradle wrapper --gradle-version 8.13
chmod +x gradlew

Java version error
If this error appears:

invalid source release: 21

Install and use Java 21:

brew install openjdk@21
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
export PATH="$JAVA_HOME/bin:$PATH"
java -version

Then rebuild:

./gradlew assembleDebug

Old Google Auth plugin issue
If the build fails because of @codetrix-studio/capacitor-google-auth, remove it if Google login is not needed:

npm uninstall @codetrix-studio/capacitor-google-auth --legacy-peer-deps
npm install --legacy-peer-deps
npx cap sync android

Deployment Notes
* The web frontend is deployed on Vercel.
* The backend is deployed on Render.
* The database is hosted on Supabase PostgreSQL.
* The mobile APK is built locally from this mobileapp folder.
* Google login is optional and requires separate Google OAuth setup.
Quick Build Commands

cd mobileapp
npm install --legacy-peer-deps
npx cap sync android
cd android
./gradlew assembleDebug

Final APK path:

mobileapp/android/app/build/outputs/apk/debug/app-debug.apk