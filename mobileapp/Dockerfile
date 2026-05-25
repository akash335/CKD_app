FROM node:20-bullseye

# Install Java and prerequisites
RUN apt-get update && apt-get install -y openjdk-17-jdk-headless wget unzip

# Setup Android SDK environment variables
ENV ANDROID_HOME /opt/android-sdk
ENV PATH ${PATH}:${ANDROID_HOME}/cmdline-tools/latest/bin:${ANDROID_HOME}/platform-tools

# Download and install Android command line tools
RUN mkdir -p ${ANDROID_HOME}/cmdline-tools && \
    wget -q https://dl.google.com/android/repository/commandlinetools-linux-11479570_latest.zip -O cmdline-tools.zip && \
    unzip -q cmdline-tools.zip -d ${ANDROID_HOME}/cmdline-tools && \
    mv ${ANDROID_HOME}/cmdline-tools/cmdline-tools ${ANDROID_HOME}/cmdline-tools/latest && \
    rm cmdline-tools.zip

# Accept licenses and install platform tools
RUN yes | sdkmanager --licenses && \
    sdkmanager "platform-tools" "platforms;android-34" "platforms;android-33" "build-tools;34.0.0" "build-tools;33.0.2"

WORKDIR /app
COPY . .

# Run build process
RUN npm install
RUN npx cap sync
RUN cd android && ./gradlew assembleDebug

CMD ["echo", "Build finished!"]
