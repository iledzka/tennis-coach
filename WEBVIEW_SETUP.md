# WebView-Based Pose Detection Setup

This guide explains how to use the WebView-based MediaPipe pose detection in the mobile app.

## Overview

The WebView implementation runs the MediaPipe pose detection in a web context inside the React Native app. This approach:

✅ **Works on iOS and Android** - No native module compilation needed  
✅ **Uses proven web implementation** - Same code that works in browser  
✅ **Easy to update** - Just modify HTML/JavaScript  
✅ **No additional dependencies** - Uses built-in WebView  

## Architecture

```
React Native App
    ↓
WebView Component
    ↓
HTML + MediaPipe (Web)
    ↓
postMessage ← Analysis Data
    ↓
React Native UI (Overlay)
```

## Installation

### 1. Install react-native-webview

```bash
pnpm add react-native-webview
```

### 2. Prebuild Native Modules

```bash
pnpm prebuild --clean
```

### 3. Run the App

```bash
# iOS
pnpm ios

# Android
pnpm android
```

## Usage

### Navigate to Pose Detection

1. Launch the app
2. Tap "Login" (if not authenticated)
3. On home screen, tap "Try Pose Detection (WebView)"
4. Grant camera permission when prompted
5. Stand in front of camera (full body visible)
6. See real-time analysis overlay

## Features

### Visual Feedback

- **Green skeleton** overlay on your body
- **Red dots** at 33 landmark points
- **Real-time tracking** as you move

### Analysis Metrics

- **FPS** - Processing speed
- **Shoulder Alignment** - 0-100%
- **Hip Alignment** - 0-100%
- **Knee Flexion** - 0-100%
- **Balance Score** - 0-100%
- **Racket Position** - ready/backswing/contact/follow-through

### Coaching Suggestions

Real-time feedback:
- "Keep shoulders level"
- "Align your hips"
- "Bend knees more"
- "Center your weight"
- "Great form!"

## How It Works

### 1. WebView Loads HTML

The component renders an HTML page with:
- MediaPipe library from CDN
- Camera access via `getUserMedia`
- Canvas for skeleton overlay
- Pose detection loop

### 2. Pose Detection Runs

```javascript
// Inside WebView
detectPose() {
  const result = poseLandmarker.detectForVideo(video, timestamp);
  const analysis = analyzeTennisPosture(result.landmarks);
  
  // Send to React Native
  window.ReactNativeWebView.postMessage(JSON.stringify({
    type: 'analysis',
    payload: analysis
  }));
}
```

### 3. React Native Receives Data

```typescript
// In React Native
const handleMessage = (event) => {
  const data = JSON.parse(event.nativeEvent.data);
  if (data.type === 'analysis') {
    setAnalysis(data.payload); // Update UI
  }
};
```

### 4. UI Overlay Displays

React Native renders analysis panel on top of WebView with metrics and suggestions.

## File Structure

```
src/app/(app)/
├── pose-detection-webview.tsx    # Main WebView screen
└── (tabs)/
    └── index.tsx                  # Updated navigation

WEBVIEW_SETUP.md                   # This file
```

## Configuration

### Camera Settings

Modify in the HTML content:

```javascript
const stream = await navigator.mediaDevices.getUserMedia({
  video: { 
    facingMode: 'user',        // 'user' = front, 'environment' = back
    width: { ideal: 1280 },    // Resolution
    height: { ideal: 720 }
  }
});
```

### MediaPipe Settings

Adjust detection sensitivity:

```javascript
poseLandmarker = await window.vision.PoseLandmarker.createFromOptions(vision, {
  minPoseDetectionConfidence: 0.5,  // 0.0 - 1.0
  minPosePresenceConfidence: 0.5,   // 0.0 - 1.0
  minTrackingConfidence: 0.5,       // 0.0 - 1.0
});
```

### Analysis Thresholds

Customize scoring in `analyzeTennisPosture`:

```javascript
const shoulderAlignment = Math.max(0, 100 - shoulderDiff * 500);
//                                              ^^^ Adjust sensitivity
```

## Troubleshooting

### Camera Not Working

**Issue:** Black screen or no camera feed

**Solutions:**
- Check camera permissions in device settings
- Ensure `mediaPlaybackRequiresUserAction={false}` in WebView
- Verify `allowsInlineMediaPlayback={true}` is set
- Try restarting the app

### No Pose Detected

**Issue:** No skeleton overlay appears

**Solutions:**
- Stand 2-3 meters from camera
- Ensure full body is visible
- Improve lighting conditions
- Check console for errors

### Low FPS

**Issue:** Laggy or slow detection

**Solutions:**
- Use lower camera resolution
- Close other apps
- Test on more powerful device
- Reduce canvas drawing complexity

### WebView Errors

**Issue:** "WebView failed to load"

**Solutions:**
- Check internet connection (for CDN)
- Verify WebView is installed on device
- Clear app cache and restart
- Check device WebView version

### Analysis Not Updating

**Issue:** Metrics stuck at 0%

**Solutions:**
- Check `onMessage` handler is connected
- Verify `postMessage` is working
- Look for JavaScript errors in WebView
- Ensure video is playing

## Performance Tips

### Optimize for Mobile

1. **Lower Resolution**
   ```javascript
   width: { ideal: 640 },
   height: { ideal: 480 }
   ```

2. **Reduce Drawing**
   ```javascript
   // Draw fewer landmarks
   const connections = [[11, 12], [23, 24]]; // Only torso
   ```

3. **Throttle Updates**
   ```javascript
   // Send analysis every N frames
   if (frameCount % 3 === 0) {
     sendMessage('analysis', analysis);
   }
   ```

4. **Use Lite Model**
   Already configured - uses `pose_landmarker_lite.task`

## Comparison: WebView vs Native

| Feature | WebView | Native |
|---------|---------|--------|
| Setup Complexity | ⭐ Easy | ⭐⭐⭐ Complex |
| Performance | ⭐⭐ Good | ⭐⭐⭐ Excellent |
| Cross-Platform | ✅ Yes | ❌ Platform-specific |
| Updates | ✅ Easy | ❌ Requires rebuild |
| Bundle Size | ⭐⭐⭐ Small | ⭐ Large |
| Offline Support | ❌ Needs CDN | ✅ Bundled |

## Advantages of WebView Approach

1. **No Native Compilation** - Works with Expo managed workflow
2. **Rapid Development** - Modify HTML without rebuilding
3. **Proven Code** - Uses tested web implementation
4. **Easy Debugging** - Use browser dev tools
5. **Smaller Bundle** - No native libraries

## Limitations

1. **Internet Required** - First load needs CDN access
2. **Slightly Lower Performance** - WebView overhead
3. **Camera API Differences** - May vary by device
4. **Memory Usage** - WebView + React Native

## Advanced: Offline Support

To make it work offline, bundle the MediaPipe files:

1. Download MediaPipe WASM files
2. Place in `assets/mediapipe/`
3. Update HTML to use local files:

```javascript
const vision = await window.vision.FilesetResolver.forVisionTasks(
  'file:///android_asset/mediapipe/wasm'  // Android
  // or
  'file://path/to/assets/mediapipe/wasm'  // iOS
);
```

## Testing

### Test on Device

```bash
# iOS
pnpm ios

# Android
pnpm android
```

### Test Different Scenarios

- ✅ Standing still (ready position)
- ✅ Raising arms (follow-through)
- ✅ Bending knees (low stance)
- ✅ Moving side to side (balance)
- ✅ Poor lighting conditions
- ✅ Partial body visibility

### Verify Metrics

- Shoulder alignment changes when tilting
- Hip alignment responds to stance
- Knee flexion tracks squat depth
- Balance score reflects weight distribution
- Racket position updates with arm movement

## Next Steps

### Enhancements

1. **Add Recording**
   - Capture video with overlay
   - Save analysis data

2. **Session History**
   - Store past sessions
   - Track improvement

3. **Comparison Mode**
   - Compare with professional players
   - Side-by-side analysis

4. **Offline Mode**
   - Bundle MediaPipe files
   - Local model storage

5. **Advanced Metrics**
   - Swing speed estimation
   - Contact point analysis
   - Footwork tracking

## Support

### Common Issues

Check the troubleshooting section above.

### Debugging

Enable WebView debugging:

```typescript
// Add to WebView props
onConsoleMessage={(message) => {
  console.log('WebView:', message.nativeEvent.message);
}}
```

### Resources

- [MediaPipe Documentation](https://developers.google.com/mediapipe/solutions/vision/pose_landmarker)
- [React Native WebView](https://github.com/react-native-webview/react-native-webview)
- [Expo Camera](https://docs.expo.dev/versions/latest/sdk/camera/)

## Conclusion

The WebView approach provides a practical solution for integrating MediaPipe pose detection into React Native apps without the complexity of native modules. It's ideal for:

- ✅ Rapid prototyping
- ✅ Cross-platform development
- ✅ Easy maintenance
- ✅ Expo compatibility

For production apps requiring maximum performance, consider migrating to native MediaPipe SDKs later.
