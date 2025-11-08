# MediaPipe POC Setup Guide

This guide explains how to set up and use the MediaPipe Pose Detection POC for tennis coaching.

## Overview

The POC uses MediaPipe's Pose Landmarker to detect body pose in real-time and analyze tennis posture. It provides:

- Real-time pose detection using device camera
- Tennis-specific posture analysis (shoulder alignment, hip alignment, knee flexion, balance)
- Visual feedback with skeleton overlay
- Actionable coaching suggestions

## Architecture

### Components

1. **PoseDetector** (`src/lib/mediapipe/PoseDetector.ts`)
   - Core MediaPipe integration
   - Pose detection and landmark extraction
   - Tennis posture analysis algorithms
   - Drawing utilities for visualization

2. **PoseDetectionScreen** (`src/app/(app)/pose-detection.tsx`)
   - React Native camera integration
   - Real-time video processing
   - UI for displaying analysis results
   - FPS monitoring

## Installation

### Prerequisites

Ensure Node.js 24+ and pnpm 10+ are installed:

```bash
# Check versions
node --version  # Should be 24+
pnpm --version  # Should be 10+
```

### Install Dependencies

```bash
# Install required packages
pnpm add expo-camera @mediapipe/tasks-vision expo-gl

# Install development dependencies if needed
pnpm install
```

### Update Dev Container (if needed)

If Node.js is not available in your dev container, update `.devcontainer/Dockerfile`:

```dockerfile
FROM mcr.microsoft.com/devcontainers/base:ubuntu-24.04

# Install Node.js 24
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && curl -fsSL https://deb.nodesource.com/setup_24.x | bash - \
    && apt-get -y install --no-install-recommends nodejs

# Install pnpm
RUN npm install -g pnpm@latest

# Install Cocoapods for iOS development
RUN apt-get -y install --no-install-recommends ruby-full \
    && gem install cocoapods
```

Then rebuild the container:
```bash
gitpod devcontainer rebuild
```

## Configuration

### Camera Permissions

Add camera permissions to `app.json`:

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

### iOS Setup

For iOS, run prebuild to configure native modules:

```bash
pnpm prebuild
```

## Usage

### Running the POC

1. Start the development server:
```bash
pnpm dev
```

2. Navigate to the pose detection screen in your app

3. Grant camera permissions when prompted

4. Tap "Start Detection" to begin pose analysis

### Features

#### Real-time Pose Detection
- Detects 33 body landmarks
- Runs at 15-30 FPS depending on device
- Works with front or back camera

#### Tennis Posture Analysis

The POC analyzes:

1. **Shoulder Alignment** (0-100%)
   - Measures if shoulders are level
   - Critical for consistent strokes

2. **Hip Alignment** (0-100%)
   - Checks hip positioning
   - Important for stability and power

3. **Knee Flexion** (0-100%)
   - Evaluates knee bend angle
   - Optimal range: 140-160 degrees

4. **Balance Score** (0-100%)
   - Measures center of mass over feet
   - Key for quick movement and recovery

5. **Racket Position**
   - Detects: ready, backswing, contact, follow-through
   - Based on wrist position relative to body

#### Coaching Suggestions

Real-time feedback includes:
- "Keep your shoulders level and aligned"
- "Bend your knees more for better readiness"
- "Improve your balance - center your weight over your feet"
- "Great form! Keep it up!"

## Technical Details

### MediaPipe Model

- **Model**: Pose Landmarker Lite
- **Mode**: Video (optimized for continuous frames)
- **Delegate**: GPU (hardware acceleration)
- **Confidence Thresholds**: 0.5 for detection, presence, and tracking

### Landmark Indices

Key landmarks used in analysis:
- Shoulders: 11 (left), 12 (right)
- Hips: 23 (left), 24 (right)
- Knees: 25 (left), 26 (right)
- Ankles: 27 (left), 28 (right)
- Wrists: 15 (left), 16 (right)

### Performance Optimization

- Uses GPU acceleration when available
- Processes every frame (no frame skipping)
- Lightweight model for mobile devices
- Canvas-based rendering for smooth visualization

## Customization

### Adjusting Analysis Parameters

Edit `PoseDetector.ts` to customize:

```typescript
// Adjust knee flexion ideal range
const idealKneeAngle = 150; // Change this value

// Modify scoring sensitivity
const shoulderAlignment = Math.max(0, 100 - shoulderDiff * 500);
//                                              ^^^ Adjust multiplier
```

### Adding New Metrics

To add new analysis metrics:

1. Calculate the metric in `analyzeTennisPosture()`
2. Add it to the `TennisPostureAnalysis` interface
3. Display it in the UI (`pose-detection.tsx`)

Example - Adding elbow angle:

```typescript
// In PoseDetector.ts
const LEFT_ELBOW = 13;
const elbowAngle = this.calculateAngle(
  landmarks[LEFT_SHOULDER],
  landmarks[LEFT_ELBOW],
  landmarks[LEFT_WRIST]
);

// Add to return object
return {
  // ... existing metrics
  elbowAngle: Math.round(elbowAngle),
};
```

## Troubleshooting

### Camera Not Working
- Check permissions in device settings
- Ensure `expo-camera` is properly installed
- Try restarting the app

### Low FPS
- Use the lite model (already configured)
- Reduce canvas resolution
- Test on a more powerful device

### Pose Not Detected
- Ensure good lighting
- Stand 2-3 meters from camera
- Make sure full body is visible
- Check minimum confidence thresholds

### MediaPipe Initialization Fails
- Check internet connection (model downloads from CDN)
- Verify WebAssembly support
- Check browser console for errors

## Next Steps

### Enhancements

1. **Recording & Playback**
   - Save video with pose overlay
   - Compare sessions over time

2. **Stroke Classification**
   - Train ML model to classify stroke types
   - Forehand, backhand, serve detection

3. **Multi-person Support**
   - Analyze multiple players
   - Compare techniques side-by-side

4. **Historical Analytics**
   - Track improvement over time
   - Generate progress reports

5. **Advanced Metrics**
   - Racket speed estimation
   - Swing path analysis
   - Contact point optimization

### Production Considerations

- Add error boundaries and fallbacks
- Implement offline model caching
- Optimize for battery life
- Add user preferences for sensitivity
- Implement data privacy controls

## Resources

- [MediaPipe Pose Documentation](https://developers.google.com/mediapipe/solutions/vision/pose_landmarker)
- [Expo Camera Documentation](https://docs.expo.dev/versions/latest/sdk/camera/)
- [Tennis Biomechanics Guide](https://www.usta.com/en/home/improve/tips-and-instruction.html)

## License

This POC is part of the tennis-coach project. See LICENSE file for details.
