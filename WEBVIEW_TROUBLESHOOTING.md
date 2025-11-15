# WebView Troubleshooting Guide

## Problem: Stuck on "Loading MediaPipe..."

This means the WebView isn't sending messages back to React Native.

### Common Causes

1. **WebView not initialized properly**
2. **JavaScript not enabled**
3. **Message passing blocked**
4. **CDN loading issues**
5. **Platform-specific WebView issues**

## Debug Version

Use the debug version to see what's happening:

```bash
# Navigate to: /pose-detection-debug
```

The debug version shows:

- ✅ All logs from WebView
- ✅ Message passing status
- ✅ Loading progress
- ✅ Error messages

### What to Look For

Check the debug logs at the bottom of the screen:

```
Debug Logs:
10:30:15: WebView loading started
10:30:16: Load progress: 50%
10:30:17: Load progress: 100%
10:30:17: WebView loading completed
10:30:18: Received: {"type":"init","payload":{"message":"WebView script loaded"}}
10:30:18: WebView: WebView script loaded
10:30:19: WebView: Starting initialization
10:30:20: WebView: MediaPipe script loaded
10:30:22: WebView: Creating FilesetResolver
10:30:25: WebView: Creating PoseLandmarker
10:30:28: WebView: Starting camera
10:30:29: WebView ready!
```

## Solutions

### Solution 1: Check Internet Connection

MediaPipe loads from CDN - requires internet.

```bash
# Test CDN access
curl https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.js
```

**If fails:**

- Check WiFi/cellular connection
- Try different network
- Check firewall/VPN settings

### Solution 2: Clear App Cache

```bash
# iOS
rm -rf ~/Library/Developer/Xcode/DerivedData/*

# Android
cd android && ./gradlew clean && cd ..

# Rebuild
pnpm prebuild --clean
pnpm ios  # or pnpm android
```

### Solution 3: Check WebView Version

**iOS:**

- Uses WKWebView (built-in)
- Should work on iOS 13+

**Android:**

- Uses Android System WebView
- Update in Play Store if old

```bash
# Check Android WebView version
adb shell pm list packages | grep webview
```

### Solution 4: Enable Debugging

Add to your code:

```typescript
<WebView
  // ... other props
  onConsoleMessage={(event) => {
    console.log('WebView console:', event.nativeEvent.message);
  }}
  onError={(event) => {
    console.log('WebView error:', event.nativeEvent);
  }}
/>
```

### Solution 5: Test Message Passing

Create a simple test:

```typescript
const testHtml = \`
<!DOCTYPE html>
<html>
<body>
  <script>
    setTimeout(() => {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage('TEST');
      } else {
        console.error('ReactNativeWebView not available');
      }
    }, 1000);
  </script>
</body>
</html>
\`;

<WebView
  source={{ html: testHtml }}
  onMessage={(event) => {
    console.log('Received:', event.nativeEvent.data);
    // Should log: "Received: TEST"
  }}
/>
```

### Solution 6: Platform-Specific Fixes

#### iOS

Add to `Info.plist`:

```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <true/>
</dict>
```

#### Android

Add to `AndroidManifest.xml`:

```xml
<application
  android:usesCleartextTraffic="true">
```

### Solution 7: Use Local HTML File

Instead of inline HTML, use a file:

```typescript
// Save HTML to assets/pose-detection.html
<WebView
  source={{ uri: 'file:///android_asset/pose-detection.html' }}
  // or for iOS
  source={{ uri: 'file://path/to/pose-detection.html' }}
/>
```

### Solution 8: Increase Timeout

MediaPipe can take time to load:

```javascript
// In HTML
const timeout = 60000; // 60 seconds instead of 30
```

### Solution 9: Check Permissions

Ensure camera permissions are granted:

```bash
# iOS - check Info.plist
<key>NSCameraUsageDescription</key>
<string>Camera access for pose detection</string>

# Android - check AndroidManifest.xml
<uses-permission android:name="android.permission.CAMERA" />
```

### Solution 10: Fallback to Simpler Version

If MediaPipe won't load, test with simpler HTML:

```typescript
const simpleHtml = \`
<!DOCTYPE html>
<html>
<body>
  <h1>Test</h1>
  <script>
    // Send message every second
    setInterval(() => {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(
          JSON.stringify({ type: 'test', time: Date.now() })
        );
      }
    }, 1000);
  </script>
</body>
</html>
\`;
```

## Debugging Checklist

- [ ] Internet connection working
- [ ] WebView loads (check logs)
- [ ] JavaScript enabled
- [ ] Camera permission granted
- [ ] CDN accessible
- [ ] No firewall blocking
- [ ] WebView version up to date
- [ ] App cache cleared
- [ ] Rebuild completed
- [ ] Test message passing works

## Common Error Messages

### "ReactNativeWebView not available"

**Cause:** WebView bridge not initialized

**Fix:**

```typescript
<WebView
  javaScriptEnabled={true}  // ← Must be true
  domStorageEnabled={true}  // ← Must be true
/>
```

### "Failed to load MediaPipe script"

**Cause:** CDN not accessible

**Fix:**

- Check internet
- Try different CDN
- Bundle files locally

### "Camera access denied"

**Cause:** Permission not granted

**Fix:**

```bash
# iOS - Settings > App > Camera > Enable
# Android - Settings > Apps > App > Permissions > Camera > Allow
```

### "ROI width and height must be > 0"

**Cause:** Video not ready

**Fix:** Already handled in code with readiness checks

## Still Not Working?

### Check React Native Logs

```bash
# iOS
npx react-native log-ios

# Android
npx react-native log-android
```

### Check WebView Console

Enable remote debugging:

**iOS:**

1. Safari > Develop > [Your Device] > [Your App]
2. Check console for errors

**Android:**

1. Chrome > chrome://inspect
2. Find your WebView
3. Click "inspect"

### Test on Different Device

- Try iOS simulator vs real device
- Try Android emulator vs real device
- Try different OS versions

### Minimal Reproduction

Create minimal test case:

```typescript
export default function MinimalTest() {
  return (
    <WebView
      source={{
        html: \`
          <!DOCTYPE html>
          <html>
          <body>
            <h1>Test</h1>
            <script>
              window.ReactNativeWebView.postMessage('HELLO');
            </script>
          </body>
          </html>
        \`
      }}
      onMessage={(e) => {
        console.log('Got:', e.nativeEvent.data);
        Alert.alert('Message', e.nativeEvent.data);
      }}
    />
  );
}
```

If this doesn't work, the issue is with WebView setup, not MediaPipe.

## Getting Help

When asking for help, provide:

1. **Platform:** iOS or Android
2. **OS Version:** e.g., iOS 17.1, Android 13
3. **Device:** Simulator or real device
4. **Logs:** From debug version
5. **Error messages:** Exact text
6. **What you tried:** From this guide

## Alternative Approaches

If WebView continues to fail:

### Option 1: Use TensorFlow.js

```bash
pnpm add @tensorflow/tfjs @tensorflow/tfjs-react-native @tensorflow-models/pose-detection
```

Native React Native implementation without WebView.

### Option 2: Use Native MediaPipe

Implement native modules for iOS/Android.

### Option 3: Use Third-Party Library

```bash
pnpm add @thinksys/react-native-mediapipe
```

Note: iOS only, may have limitations.

## Prevention

To avoid issues in future:

1. **Test early** - Test WebView communication first
2. **Use debug version** - Always check logs
3. **Handle errors** - Add try/catch everywhere
4. **Timeout handling** - Don't wait forever
5. **Fallback UI** - Show helpful error messages
6. **Version pinning** - Use specific CDN versions

## Success Indicators

You know it's working when you see:

✅ Debug logs showing progress  
✅ "WebView ready!" message  
✅ Camera feed visible  
✅ Green skeleton overlay  
✅ Analysis metrics updating  
✅ FPS counter showing 15-30

## Summary

Most issues are caused by:

1. **No internet** - Can't load MediaPipe from CDN
2. **WebView not configured** - Missing props
3. **Permissions** - Camera not allowed
4. **Platform issues** - WebView version or settings

Use the **debug version** to identify the exact problem, then apply the appropriate solution from this guide.
