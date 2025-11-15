# Fix: Camera Access in WebView

## The Problem

```
❌ Camera error: undefined is not an object (evaluating 'navigator.mediaDevices.getUserMedia')
```

Good news: **MediaPipe is loading perfectly!** ✅

The issue is that WebView doesn't have access to the camera API.

## Quick Fix

### Option 1: Update Info.plist (iOS)

After running `pnpm prebuild`, edit `ios/tenniscoach/Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>Camera access for pose detection</string>

<key>NSMicrophoneUsageDescription</key>
<string>Microphone access for video recording</string>

<!-- Add this for WebView camera access -->
<key>NSCameraUsageDescription</key>
<string>This app needs camera access for pose detection</string>
```

Then rebuild:
```bash
cd ios && pod install && cd ..
pnpm ios
```

### Option 2: Use Expo Camera Instead

Since WebView camera access is limited, use **expo-camera** with a different approach.

I'll create a version that uses expo-camera to capture frames and sends them to WebView for processing.

## Why This Happens

WebView has limited access to device APIs for security reasons:
- `navigator.mediaDevices` is restricted
- Camera access requires special permissions
- iOS WebView (WKWebView) has stricter security

## Alternative Approach (Recommended)

Instead of camera in WebView, use:
1. **expo-camera** to capture video
2. **Extract frames** from camera
3. **Send frames to WebView** for MediaPipe processing
4. **Get results back** via postMessage

This is more reliable and gives better control.

## Let Me Create This Version

I'll create a hybrid version that:
- Uses expo-camera for video capture
- Sends frames to WebView
- MediaPipe processes in WebView
- Results displayed in React Native

This will work reliably on both iOS and Android!

Would you like me to implement this hybrid approach?
