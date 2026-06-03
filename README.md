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