#!/bin/bash

# MediaPipe POC Setup Script
# This script installs the required dependencies for the MediaPipe POC

set -e

echo "🎾 Setting up MediaPipe POC for Tennis Coach..."
echo ""

# Check if pnpm is available
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed. Please install pnpm first:"
    echo "   npm install -g pnpm"
    exit 1
fi

echo "📦 Installing MediaPipe dependencies..."
pnpm add expo-camera @mediapipe/tasks-vision expo-gl

echo ""
echo "✅ Dependencies installed successfully!"
echo ""
echo "📝 Next steps:"
echo "   1. Update app.json with camera permissions (see MEDIAPIPE_POC_SETUP.md)"
echo "   2. Run 'pnpm prebuild' to configure native modules"
echo "   3. Run 'pnpm dev' to start the development server"
echo "   4. Navigate to the Pose Detection screen in your app"
echo ""
echo "📖 For detailed setup instructions, see MEDIAPIPE_POC_SETUP.md"
