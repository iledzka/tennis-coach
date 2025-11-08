# MediaPipe Integration

This directory contains the MediaPipe Pose Detection integration for tennis coaching.

## Files

- **PoseDetector.ts** - Core pose detection and analysis logic

## Quick Start

```typescript
import { PoseDetector } from './mediapipe/PoseDetector';

// Initialize detector
const detector = new PoseDetector();
await detector.initialize();

// Detect pose from video frame
const result = await detector.detectPose(videoElement, timestamp);

if (result && result.landmarks.length > 0) {
  // Analyze tennis posture
  const analysis = detector.analyzeTennisPosture(result.landmarks[0]);
  
  console.log('Shoulder Alignment:', analysis.shoulderAlignment);
  console.log('Suggestions:', analysis.suggestions);
}

// Clean up
detector.dispose();
```

## API Reference

### PoseDetector

#### Methods

##### `initialize(): Promise<void>`
Initializes the MediaPipe Pose Landmarker. Must be called before detection.

##### `detectPose(videoFrame, timestamp): Promise<PoseDetectionResult | null>`
Detects pose landmarks from a video frame.

**Parameters:**
- `videoFrame`: HTMLVideoElement or HTMLCanvasElement
- `timestamp`: number (in milliseconds)

**Returns:** PoseDetectionResult or null if no pose detected

##### `analyzeTennisPosture(landmarks): TennisPostureAnalysis`
Analyzes pose landmarks for tennis-specific metrics.

**Parameters:**
- `landmarks`: Array of PoseLandmark (33 landmarks)

**Returns:** TennisPostureAnalysis object with scores and suggestions

##### `drawLandmarks(canvas, landmarks, connections?): void`
Draws pose landmarks and connections on a canvas.

**Parameters:**
- `canvas`: HTMLCanvasElement
- `landmarks`: Array of PoseLandmark
- `connections`: Optional array of landmark index pairs

##### `dispose(): void`
Cleans up resources. Call when done with detector.

### Types

#### PoseLandmark
```typescript
interface PoseLandmark {
  x: number;        // Normalized x coordinate (0-1)
  y: number;        // Normalized y coordinate (0-1)
  z: number;        // Depth (relative to hips)
  visibility?: number; // Confidence (0-1)
}
```

#### TennisPostureAnalysis
```typescript
interface TennisPostureAnalysis {
  shoulderAlignment: number;  // 0-100 score
  hipAlignment: number;       // 0-100 score
  kneeFlexion: number;        // 0-100 score
  racketPosition: 'ready' | 'backswing' | 'contact' | 'follow-through' | 'unknown';
  balanceScore: number;       // 0-100 score
  suggestions: string[];      // Coaching tips
}
```

## Landmark Indices

MediaPipe Pose provides 33 landmarks:

```
0: nose
1-4: eyes and ears
5-10: mouth
11-12: shoulders
13-14: elbows
15-16: wrists
17-22: hands
23-24: hips
25-26: knees
27-28: ankles
29-32: feet
```

## Example: Custom Analysis

```typescript
function analyzeServe(landmarks: PoseLandmark[]): ServeAnalysis {
  const RIGHT_SHOULDER = 12;
  const RIGHT_ELBOW = 14;
  const RIGHT_WRIST = 16;
  
  // Calculate elbow angle
  const elbowAngle = calculateAngle(
    landmarks[RIGHT_SHOULDER],
    landmarks[RIGHT_ELBOW],
    landmarks[RIGHT_WRIST]
  );
  
  // Check if arm is extended at contact
  const isExtended = elbowAngle > 160;
  
  return {
    elbowAngle,
    isExtended,
    suggestion: isExtended 
      ? 'Good arm extension!' 
      : 'Extend your arm more at contact'
  };
}
```

## Performance Tips

1. **Use GPU acceleration** - Already enabled by default
2. **Optimize canvas size** - Match video resolution
3. **Throttle analysis** - Don't analyze every frame if not needed
4. **Cache calculations** - Store previous frame data for comparison

## Debugging

Enable debug logging:

```typescript
const detector = new PoseDetector();
await detector.initialize();

// Log all landmarks
const result = await detector.detectPose(video, Date.now());
if (result) {
  console.log('Detected landmarks:', result.landmarks[0]);
}
```

## See Also

- [MEDIAPIPE_POC_SETUP.md](../../MEDIAPIPE_POC_SETUP.md) - Full setup guide
- [MediaPipe Documentation](https://developers.google.com/mediapipe/solutions/vision/pose_landmarker)
