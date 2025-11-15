# WebView Pose Detection - Quick Start

Get the WebView-based pose detection running in 3 steps.

## Step 1: Install Dependencies

```bash
pnpm add react-native-webview
```

## Step 2: Rebuild Native Modules

```bash
pnpm prebuild --clean
```

## Step 3: Run the App

```bash
# iOS
pnpm ios

# Android  
pnpm android
```

## Usage

1. **Launch app** → Tap "Login"
2. **Home screen** → Tap "Try Pose Detection (WebView)"
3. **Grant camera permission**
4. **Stand in front of camera** (full body visible)
5. **See real-time analysis!**

## What You'll See

### Visual Indicators

✅ **Green skeleton** on your body  
✅ **Red dots** at joints  
✅ **Analysis panel** with metrics  
✅ **Coaching suggestions**  

### Metrics Displayed

- **FPS:** Processing speed
- **Shoulder:** 0-100% alignment
- **Hip:** 0-100% alignment  
- **Knee:** 0-100% flexion
- **Balance:** 0-100% score
- **Position:** ready/backswing/contact/follow-through

### Color Coding

- 🟢 **Green** (80-100%) - Excellent
- 🟡 **Yellow** (60-79%) - Good
- 🔴 **Red** (0-59%) - Needs improvement

## Troubleshooting

### Camera not working?
- Check permissions in device settings
- Restart the app

### No skeleton overlay?
- Stand 2-3 meters from camera
- Ensure full body is visible
- Improve lighting

### Low FPS?
- Close other apps
- Use a more powerful device

## Files Created

```
src/app/(app)/
├── pose-detection-webview.tsx  ← Main screen
└── (tabs)/
    └── index.tsx               ← Updated navigation

WEBVIEW_SETUP.md                ← Full documentation
WEBVIEW_QUICKSTART.md           ← This file
```

## How It Works

```
React Native App
    ↓
WebView (runs HTML + MediaPipe)
    ↓
Detects pose → Sends data via postMessage
    ↓
React Native displays analysis overlay
```

## Key Features

✅ Works on iOS and Android  
✅ No native module compilation  
✅ Real-time pose detection  
✅ Tennis-specific analysis  
✅ Coaching suggestions  
✅ Easy to update  

## Next Steps

- Read [WEBVIEW_SETUP.md](./WEBVIEW_SETUP.md) for detailed docs
- Customize analysis thresholds
- Add recording functionality
- Track progress over time

## Need Help?

Check the full documentation: [WEBVIEW_SETUP.md](./WEBVIEW_SETUP.md)
