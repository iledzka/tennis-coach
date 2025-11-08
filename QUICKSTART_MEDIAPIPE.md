# MediaPipe POC - Quick Start Guide

Get the MediaPipe Pose Detection POC running in 5 minutes.

## Prerequisites

- Node.js 24+
- pnpm 10+
- iOS Simulator or Android Emulator (or physical device)

## Installation

### 1. Install Dependencies

```bash
# Run the setup script
./scripts/setup-mediapipe.sh

# Or manually:
pnpm add expo-camera @mediapipe/tasks-vision expo-gl
```

### 2. Configure Camera Permissions

Add to `app.json`:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-camera",
        {
          "cameraPermission": "Allow $(PRODUCT_NAME) to access your camera for tennis pose analysis."
        }
      ]
    ]
  }
}
```

### 3. Prebuild Native Modules

```bash
pnpm prebuild
```

## Running the POC

### Start Development Server

```bash
pnpm dev
```

### On iOS Simulator

```bash
pnpm ios
```

### On Android

```bash
pnpm android
```

## Using the POC

1. **Launch the app** - The app will start on the home screen

2. **Navigate to Pose Detection** - Tap "Try Pose Detection POC" button

3. **Grant Camera Permission** - Allow camera access when prompted

4. **Start Detection** - Tap "Start Detection" button

5. **View Analysis** - Real-time tennis posture analysis will appear on screen

## What You'll See

### Metrics Displayed

- **Shoulder Alignment** (0-100%) - Are shoulders level?
- **Hip Alignment** (0-100%) - Are hips aligned?
- **Knee Flexion** (0-100%) - Is knee bend optimal?
- **Balance Score** (0-100%) - Is weight centered?
- **Racket Position** - Current stroke phase
- **FPS** - Performance indicator

### Visual Feedback

- Green skeleton overlay on your body
- Red dots at key body landmarks
- Real-time coaching suggestions

### Coaching Suggestions

The POC provides actionable feedback like:
- "Keep your shoulders level and aligned"
- "Bend your knees more for better readiness"
- "Improve your balance - center your weight over your feet"
- "Great form! Keep it up!"

## Tips for Best Results

### Positioning
- Stand 2-3 meters from camera
- Ensure full body is visible
- Face camera directly or at 45° angle

### Lighting
- Use good lighting (avoid backlighting)
- Avoid shadows on body
- Natural light works best

### Movement
- Start in ready position
- Perform slow, controlled movements
- Hold positions for 2-3 seconds for accurate analysis

### Camera
- Use back camera for better quality
- Keep camera stable (use tripod if available)
- Ensure camera is at chest height

## Troubleshooting

### "No pose detected"
- Move closer to camera
- Improve lighting
- Ensure full body is visible
- Check camera permissions

### Low FPS (< 15)
- Close other apps
- Use a more powerful device
- Reduce screen brightness
- Restart the app

### Camera not working
- Check app permissions in device settings
- Restart the app
- Reinstall the app
- Check if camera works in other apps

### App crashes on start
- Run `pnpm prebuild` again
- Clear cache: `pnpm start --clear`
- Reinstall dependencies: `rm -rf node_modules && pnpm install`

## Next Steps

### Explore the Code

- **PoseDetector.ts** - Core detection logic
- **pose-detection.tsx** - UI implementation
- **examples.ts** - Usage examples

### Customize Analysis

Edit `src/lib/mediapipe/PoseDetector.ts`:

```typescript
// Adjust scoring thresholds
const shoulderAlignment = Math.max(0, 100 - shoulderDiff * 500);
//                                              ^^^ Change this

// Modify ideal knee angle
const idealKneeAngle = 150; // Change this value
```

### Add New Features

Ideas for enhancement:
- Record and playback sessions
- Compare with professional players
- Track progress over time
- Add stroke classification
- Export analysis data

## Resources

- [Full Setup Guide](./MEDIAPIPE_POC_SETUP.md)
- [API Documentation](./src/lib/mediapipe/README.md)
- [Code Examples](./src/lib/mediapipe/examples.ts)
- [MediaPipe Docs](https://developers.google.com/mediapipe/solutions/vision/pose_landmarker)

## Support

Having issues? Check:
1. This guide's troubleshooting section
2. Full setup guide (MEDIAPIPE_POC_SETUP.md)
3. MediaPipe documentation
4. Project issues on GitHub

## What's Working

✅ Real-time pose detection  
✅ Tennis posture analysis  
✅ Visual skeleton overlay  
✅ Coaching suggestions  
✅ FPS monitoring  
✅ Camera switching  

## Known Limitations

⚠️ Web version has limited camera support  
⚠️ Requires internet for initial model download  
⚠️ Performance varies by device  
⚠️ Single person detection only  

## Performance Benchmarks

Expected FPS by device:
- iPhone 13+: 25-30 FPS
- iPhone 11-12: 20-25 FPS
- iPhone X and older: 15-20 FPS
- Android flagship: 20-30 FPS
- Android mid-range: 15-20 FPS

---

**Ready to start?** Run `./scripts/setup-mediapipe.sh` and follow the steps above!
