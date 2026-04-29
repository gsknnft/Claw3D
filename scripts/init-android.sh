#!/bin/bash

# Claw3D Android — first-time project setup
# Run this ONCE to scaffold the Android project.
# After that, use: npm run build:android   (build + sync)
#                  npm run android:open    (open in Android Studio)

echo "Initializing Claw3D Android project..."

# 1. Install mobile dependencies
cd mobile
npm install

# 2. Add Android platform if not already present
if [ ! -d "android" ]; then
    echo "Adding Android platform..."
    npx cap add android
else
    echo "Android platform already exists, skipping."
fi

# 3. Install Capacitor plugins
npm install @capacitor/app @capacitor/device @capacitor/splash-screen @capacitor/status-bar

cd ..

# 4. Build static export + sync into Android project
echo "Building web app for Android..."
CAPACITOR_BUILD=true npm run build
cd mobile && npx cap sync

echo ""
echo "Done. To open in Android Studio:"
echo "  npm run android:open"
echo ""
echo "To build again after code changes:"
echo "  npm run build:android"
