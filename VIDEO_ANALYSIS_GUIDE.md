# Video Analysis Guide

Upload and analyze tennis videos from your phone to get detailed posture feedback.

## Overview

The video analysis feature allows you to:
- ✅ Upload videos from your phone's gallery
- ✅ Analyze tennis posture frame-by-frame
- ✅ Get average scores across the entire video
- ✅ Identify common issues throughout the video
- ✅ Review detailed analysis results

## Quick Start

### 1. Install Dependencies

```bash
pnpm add expo-image-picker react-native-webview
```

### 2. Rebuild

```bash
pnpm prebuild --clean
```

### 3. Run

```bash
pnpm ios  # or pnpm android
```

## Usage

### Step 1: Navigate to Video Analysis

1. Launch app → Tap "Login"
2. Home screen → Tap "Analyze Video"

### Step 2: Upload Video

1. Tap "Upload Video" button
2. Grant media library permission
3. Select a tennis video from your gallery
4. Video should show you performing tennis movements

### Step 3: Analyze

1. Tap "Analyze Video" button
2. Wait while the video is processed
3. Progress bar shows analysis status (0-100%)
4. Analysis takes ~1-2 seconds per second of video

### Step 4: Review Results

After analysis completes, you'll see:

#### Summary
- **Duration:** Total video length
- **Frames Analyzed:** Number of frames processed

#### Average Scores
- **Shoulder Alignment:** 0-100%
- **Hip Alignment:** 0-100%
- **Knee Flexion:** 0-100%
- **Balance:** 0-100%

#### Common Issues
- Top 3 most frequent problems
- Percentage of frames with each issue
- Example: "Bend knees more (45% of frames)"

## How It Works

### Frame-by-Frame Analysis

```
Video Upload
    ↓
Extract frames (10 FPS)
    ↓
For each frame:
    ├─ Detect pose landmarks
    ├─ Calculate metrics
    └─ Store results
    ↓
Calculate averages
    ↓
Identify common issues
    ↓
Display results
```

### Analysis Process

1. **Video Loading**
   - Video is loaded into hidden video element
   - Metadata extracted (duration, dimensions)

2. **Frame Extraction**
   - Video sampled at 10 frames per second
   - Each frame analyzed independently
   - Progress updated in real-time

3. **Pose Detection**
   - MediaPipe detects 33 body landmarks
   - Calculates tennis-specific metrics
   - Generates suggestions for each frame

4. **Summary Calculation**
   - Average scores across all frames
   - Common issues identified by frequency
   - Results formatted for display

## Features

### Metrics Analyzed

#### Shoulder Alignment (0-100%)
- Measures if shoulders are level
- Important for consistent strokes
- **Good:** 80-100%
- **Fair:** 60-79%
- **Poor:** 0-59%

#### Hip Alignment (0-100%)
- Checks hip positioning
- Critical for stability and power
- **Good:** 80-100%
- **Fair:** 60-79%
- **Poor:** 0-59%

#### Knee Flexion (0-100%)
- Evaluates knee bend angle
- Optimal: 140-160 degrees
- **Good:** 80-100%
- **Fair:** 60-79%
- **Poor:** 0-59%

#### Balance Score (0-100%)
- Measures weight distribution
- Center of mass over feet
- **Good:** 80-100%
- **Fair:** 60-79%
- **Poor:** 0-59%

### Common Issues Detection

The system identifies recurring problems:
- "Keep shoulders level" - Shoulder tilt detected
- "Align your hips" - Hip misalignment
- "Bend knees more" - Insufficient knee flexion
- "Center your weight" - Poor balance

Shows percentage of frames with each issue.

## Best Practices

### Video Recording Tips

1. **Camera Position**
   - Place camera 3-5 meters away
   - Camera at chest height
   - Capture full body (head to feet)

2. **Lighting**
   - Good, even lighting
   - Avoid backlighting
   - No harsh shadows

3. **Background**
   - Plain, uncluttered background
   - Contrasting with your clothing
   - Minimal movement in background

4. **Video Content**
   - Perform 5-10 strokes
   - Include different positions (ready, backswing, contact, follow-through)
   - Move naturally, not too fast
   - 5-15 seconds is ideal

5. **Video Quality**
   - 720p or higher resolution
   - Stable camera (use tripod if possible)
   - Clear, not blurry
   - Good focus on subject

### What to Record

**Good Videos:**
- ✅ Full body visible
- ✅ Side view or 45° angle
- ✅ Multiple strokes
- ✅ Natural movement
- ✅ Good lighting

**Avoid:**
- ❌ Only upper body
- ❌ Too far away
- ❌ Poor lighting
- ❌ Shaky camera
- ❌ Cluttered background

## Performance

### Analysis Speed

- **10 FPS sampling** - Analyzes 10 frames per second of video
- **Processing time** - ~1-2 seconds per second of video
- **Example:** 10-second video takes ~10-20 seconds to analyze

### Optimization Tips

1. **Shorter Videos**
   - 5-15 seconds is optimal
   - Captures enough data without long processing

2. **Lower Resolution**
   - 720p is sufficient
   - Faster processing than 1080p or 4K

3. **Stable Device**
   - Close other apps
   - Ensure good battery level
   - Avoid interruptions during analysis

## Troubleshooting

### "No pose detected in video"

**Causes:**
- Body not fully visible
- Poor lighting
- Low video quality
- Camera too far away

**Solutions:**
- Re-record with full body visible
- Improve lighting
- Move camera closer
- Use higher quality camera

### Analysis Takes Too Long

**Causes:**
- Very long video
- High resolution video
- Device performance

**Solutions:**
- Trim video to 5-15 seconds
- Use lower resolution
- Close other apps
- Restart app if stuck

### Low Scores Despite Good Form

**Causes:**
- Camera angle not optimal
- Partial body occlusion
- Lighting issues

**Solutions:**
- Record from side or 45° angle
- Ensure full body always visible
- Improve lighting conditions

### App Crashes During Analysis

**Causes:**
- Very large video file
- Low device memory
- App bug

**Solutions:**
- Use shorter video
- Restart app
- Clear app cache
- Update to latest version

## Technical Details

### Frame Sampling

```javascript
const frameRate = 10; // Frames per second
const frameInterval = 1 / frameRate; // 0.1 seconds

for (let time = 0; time < duration; time += frameInterval) {
  video.currentTime = time;
  // Analyze frame
}
```

### Score Calculation

```javascript
// Average across all frames
avgScore = sum(frameScores) / totalFrames;

// Common issues
issueFrequency = count(issue) / totalFrames * 100;
```

### Data Structure

```typescript
interface VideoAnalysisResult {
  totalFrames: number;
  duration: number;
  averageScores: {
    shoulder: number;
    hip: number;
    knee: number;
    balance: number;
  };
  frames: FrameAnalysis[];
  commonIssues: string[];
}
```

## Comparison: Live vs Video Analysis

| Feature | Live Detection | Video Analysis |
|---------|---------------|----------------|
| Real-time feedback | ✅ Yes | ❌ No |
| Historical analysis | ❌ No | ✅ Yes |
| Average scores | ❌ No | ✅ Yes |
| Common issues | ❌ No | ✅ Yes |
| Frame-by-frame | ❌ No | ✅ Yes |
| Requires camera | ✅ Yes | ❌ No |
| Works offline | ❌ No | ⚠️ Partial |

## Use Cases

### Training Sessions

1. **Record practice strokes**
2. **Analyze after session**
3. **Review common issues**
4. **Focus on problem areas**

### Progress Tracking

1. **Record weekly videos**
2. **Compare average scores**
3. **Track improvement**
4. **Identify persistent issues**

### Technique Comparison

1. **Record different techniques**
2. **Analyze each separately**
3. **Compare scores**
4. **Choose best approach**

### Coach Review

1. **Record during lesson**
2. **Analyze together**
3. **Discuss results**
4. **Plan improvements**

## Future Enhancements

### Planned Features

- [ ] **Video playback with overlay** - See skeleton on video
- [ ] **Frame-by-frame scrubbing** - Review specific moments
- [ ] **Export results** - Save analysis as PDF/JSON
- [ ] **Compare videos** - Side-by-side analysis
- [ ] **Stroke classification** - Identify forehand/backhand/serve
- [ ] **Slow motion playback** - Review technique in detail
- [ ] **Share results** - Send to coach or friends
- [ ] **Historical tracking** - Graph improvement over time

### Advanced Analysis

- [ ] **Swing speed** - Estimate racket velocity
- [ ] **Contact point** - Optimal ball contact location
- [ ] **Footwork** - Analyze movement patterns
- [ ] **Recovery time** - Time to return to ready position
- [ ] **Consistency score** - Variation across strokes

## API Reference

### Upload Video

```typescript
const result = await ImagePicker.launchImageLibraryAsync({
  mediaTypes: ImagePicker.MediaTypeOptions.Videos,
  allowsEditing: false,
  quality: 1,
});
```

### Analyze Video

```typescript
webViewRef.current?.postMessage(JSON.stringify({
  type: 'analyzeVideo',
  videoUri: videoUri,
}));
```

### Receive Results

```typescript
const handleMessage = (event) => {
  const data = JSON.parse(event.nativeEvent.data);
  
  if (data.type === 'result') {
    setResult(data.payload);
  }
};
```

## Files

```
src/app/(app)/
├── video-analysis.tsx          # Main video analysis screen
├── pose-detection-webview.tsx  # Live detection screen
└── (tabs)/
    └── index.tsx               # Updated navigation

VIDEO_ANALYSIS_GUIDE.md         # This file
```

## Support

### Common Questions

**Q: What video formats are supported?**  
A: MP4, MOV, and other formats supported by your device.

**Q: How long can videos be?**  
A: Recommended 5-15 seconds. Longer videos take more time to analyze.

**Q: Can I analyze videos offline?**  
A: First load requires internet for MediaPipe model. After that, analysis works offline.

**Q: Are videos stored or uploaded?**  
A: No. Videos are processed locally on your device and not uploaded anywhere.

**Q: Can I save analysis results?**  
A: Currently results are shown on screen. Export feature coming soon.

### Resources

- [MediaPipe Documentation](https://developers.google.com/mediapipe/solutions/vision/pose_landmarker)
- [Expo Image Picker](https://docs.expo.dev/versions/latest/sdk/imagepicker/)
- [React Native WebView](https://github.com/react-native-webview/react-native-webview)

## Conclusion

Video analysis provides detailed insights into your tennis technique by analyzing recorded videos frame-by-frame. It complements live detection by offering:

- ✅ Historical analysis
- ✅ Average scores
- ✅ Common issue identification
- ✅ Detailed review capability

Perfect for tracking progress and identifying areas for improvement!
