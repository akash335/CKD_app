# 📱 CKD Guardian APK Build Guide - Complete Steps

## ✅ Project Ready to Build

Your mobile app project is **100% configured and ready** in this folder!

```
/home/ajith/Downloads/CKD/ckd-app/mobileapp/
```

---

## 🚀 BUILD OPTION 1: Windows/Mac (Recommended)

### Step 1: Download Required Tools

**Java JDK 17** (Required)
- Download: https://www.oracle.com/java/technologies/downloads/
- Choose "Java SE 17.x.x" → Download installer
- Install with default settings

**Android SDK** (Required)
- Option A: Download Android Studio (easiest)
  - https://developer.android.com/studio
  - Install Android Studio
  - Open Android Studio → SDK Manager → Install latest SDK

- Option B: Manual Android SDK
  - Download command-line tools from https://developer.android.com/studio
  - Extract to a folder
  - Set environment variables (if needed)

### Step 2: Copy Project to Your Computer

**Windows:**
```bash
# In PowerShell or Command Prompt, copy the folder
robocopy "\\wsl.localhost\Ubuntu\home\ajith\Downloads\CKD\ckd-app\mobileapp" "C:\Users\YourUsername\Desktop\mobileapp" /S

# Or manually download via SSH/SFTP
```

**Mac/Linux:**
```bash
scp -r ajith@your-linux-machine:/home/ajith/Downloads/CKD/ckd-app/mobileapp ~/Desktop/
```

### Step 3: Build APK

**Windows (PowerShell):**
```bash
cd C:\Users\YourUsername\Desktop\mobileapp
npm install
npx cap build android
```

**Mac/Linux:**
```bash
cd ~/Desktop/mobileapp
npm install
npx cap build android
```

### Step 4: Find Your APK

Your APK will be at:
```
mobileapp/android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 🚀 BUILD OPTION 2: Docker (No Dependencies!)

### Use Docker to Build (Handles Everything)

```bash
# Save this as Dockerfile in mobileapp folder
FROM ubuntu:22.04

RUN apt-get update && apt-get install -y \
    openjdk-17-jdk-headless \
    android-sdk \
    nodejs \
    npm \
    gradle

WORKDIR /app
COPY . .

RUN npm install

RUN cd android && ./gradlew assembleDebug

CMD ["echo", "APK built! Check /app/android/app/build/outputs/apk/debug/"]
```

**Run:**
```bash
docker build -t ckdguardian-builder .
docker run -v $(pwd):/app ckdguardian-builder
```

---

## 📦 BUILD OPTION 3: Online Build Service (Easiest!)

### Use Appetize.io or Bitrise (No Local Setup)

1. Go to https://www.appetize.io/ or https://www.bitrise.io/
2. Upload your `mobileapp` folder
3. Select Android
4. Click Build
5. Download APK

---

## 🎯 SIMPLEST: Pre-Built APK Instructions

### What You Have:
- ✅ Full project ready
- ✅ All source code
- ✅ All configuration
- ✅ Ready to build

### What You Need:
1. Java 17+ installed on your machine
2. Android SDK installed
3. Run: `npx cap build android`

---

## 📋 Complete Setup Checklist

- [ ] **Download Java 17**
  - https://www.oracle.com/java/technologies/downloads/
  - Install and verify: `java -version`

- [ ] **Download Android SDK**
  - Via Android Studio: https://developer.android.com/studio
  - Or manual: https://developer.android.com/studio#command-tools

- [ ] **Set Environment Variables** (if manual SDK)
  ```
  ANDROID_HOME = path/to/android-sdk
  JAVA_HOME = path/to/java
  ```

- [ ] **Copy Project to Your Computer**
  - Copy `/home/ajith/Downloads/CKD/ckd-app/mobileapp` folder

- [ ] **Install Dependencies**
  ```bash
  cd mobileapp
  npm install
  ```

- [ ] **Build APK**
  ```bash
  npx cap build android
  ```

- [ ] **Get APK**
  ```bash
  # Find at: android/app/build/outputs/apk/debug/app-debug.apk
  ```

---

## 🐛 Troubleshooting

### Error: "Java not found"
```bash
# Solution: Set JAVA_HOME
export JAVA_HOME=/path/to/java  # Mac/Linux
set JAVA_HOME=C:\path\to\java   # Windows
```

### Error: "Android SDK not found"
```bash
# Solution: Set ANDROID_HOME
export ANDROID_HOME=/path/to/android-sdk  # Mac/Linux
```

### Error: "Gradle build failed"
```bash
# Solution: Update SDK
# Open Android Studio → SDK Manager → Check for updates
```

---

## 📦 APK Installation

### On Android Phone:

1. Enable "Unknown Sources" (Settings → Security)
2. Transfer `app-debug.apk` to phone
3. Open file manager on phone
4. Tap the APK file
5. Install
6. Open app

---

## 🔄 Update APK After Changes

1. Make changes to frontend/website
2. Rebuild frontend: `npm run build` (in frontend folder)
3. Copy to mobileapp: `cp -r ../frontend/.next mobileapp/www/`
4. Rebuild APK: `npx cap build android`

---

## 📊 Project Ready For:

✅ Building APK locally  
✅ Publishing to Google Play Store  
✅ Testing on Android devices  
✅ Adding native features later  
✅ Continuous updates  

---

## ✨ Next Steps

1. **Choose your build method:**
   - Windows/Mac: Install Java + Android Studio
   - Docker: Use Docker (no setup needed)
   - Online: Use Appetize/Bitrise

2. **Build the APK**

3. **Test on Android device**

4. **Publish to Play Store** (optional)

---

## 📞 File Locations

**Your Project:**
```
/home/ajith/Downloads/CKD/ckd-app/mobileapp/
```

**Key Files:**
```
mobileapp/
├── android/              ← Android project (ready to build)
├── www/                  ← Website files
├── capacitor.config.json ← Configuration
└── package.json         ← Dependencies
```

---

## 🎁 What to Do Now

1. Read the option that matches your OS (Windows/Mac/Linux)
2. Install required tools
3. Copy the mobileapp folder to your computer
4. Run: `npx cap build android`
5. Find APK at: `android/app/build/outputs/apk/debug/app-debug.apk`
6. Install on your Android phone
7. Test!

---

**Your CKD Guardian mobile app is ready to build! Choose your preferred build method above.** 🚀
