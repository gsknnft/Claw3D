#!/bin/bash

# Claw3D Android Initialization Script
echo "🚀 Initializing Claw3D Android App..."

# 1. Install mobile dependencies
echo "📦 Installing mobile dependencies..."
cd mobile
npm install

# 2. Build the web app
echo "🏗️ Building web app (Static Export)..."
cd ..
npm run build

# 3. Add Android platform if it doesn't exist
if [ ! -d "mobile/android" ]; then
    echo "🤖 Adding Android platform..."
    cd mobile
    npx cap add android
else
    echo "✅ Android platform already exists."
    cd mobile
fi

# 4. Install essential Capacitor plugins
echo "🔌 Installing Capacitor plugins (App, Device, Splash Screen)..."
npm install @capacitor/app @capacitor/device @capacitor/splash-screen @capacitor/status-bar

# 5. Sync files to Android project
echo "🔄 Syncing files..."
npx cap sync

echo "✨ Done! You can now open the app in Android Studio:"
echo "   npx cap open android"
