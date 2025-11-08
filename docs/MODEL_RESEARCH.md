# ML Models Research for Tennis Serve Coaching App

## Executive Summary

**Recommended Model: MediaPipe Pose (BlazePose) - Lite or Full variant**

For a tennis serve coaching app with real-time feedback, MediaPipe Pose offers the best balance of accuracy, performance, and ease of integration with React Native.

---

## 1. Available Pose Detection Models

### A. MediaPipe Pose (BlazePose) ⭐ RECOMMENDED

**Developer:** Google  
**Architecture:** BlazePose with GHUM 3D human shape modeling  
**Paper:** [BlazePose: On-device Real-time Body Pose tracking](https://arxiv.org/abs/2006.10204)

#### Variants:

| Variant   | Model Size | Accuracy | Speed     | Use Case                 |
| --------- | ---------- | -------- | --------- | ------------------------ |
| **Lite**  | ~3-4 MB    | Good     | 30-60 FPS | Real-time feedback (MVP) |
| **Full**  | ~5-6 MB    | Better   | 25-45 FPS | Balanced performance     |
| **Heavy** | ~8-10 MB   | Best     | 15-30 FPS | Detailed analysis mode   |

#### Key Features:

- **33 body keypoints** including:
  - Shoulders, elbows, wrists (critical for racket tracking)
  - Hips, knees, ankles (for leg drive and stance)
  - Torso and head (for body rotation)
- **3D world coordinates** (not just 2D screen coordinates)
- **On-device processing** (no server required)
- **Optimized for mobile** (runs on Pixel 2+, iPhone 8+)
- **Built-in tracking** (maintains identity across frames)

#### Tennis-Specific Advantages:

✅ High temporal resolution (tracks fast movements)  
✅ Accurate upper body tracking (shoulders, elbows, wrists)  
✅ 3D coordinates enable angle calculations  
✅ Proven for fitness applications  
✅ Handles occlusion reasonably well

#### Limitations:

⚠️ May struggle with very fast racket motion blur  
⚠️ Requires good lighting  
⚠️ Single person detection (not an issue for your use case)

---

### B. TensorFlow Lite MoveNet

**Developer:** Google/TensorFlow  
**Architecture:** MobileNetV2 backbone with feature pyramid

#### Variants:

| Variant       | Model Size | Keypoints | Speed     | Accuracy |
| ------------- | ---------- | --------- | --------- | -------- |
| **Lightning** | ~4 MB      | 17        | 50+ FPS   | Good     |
| **Thunder**   | ~12 MB     | 17        | 25-35 FPS | Better   |

#### Key Features:

- **17 body keypoints** (fewer than BlazePose)
- Very fast inference
- Good for general pose estimation
- Strong community support

#### Tennis-Specific Analysis:

✅ Excellent speed  
✅ Good for basic pose tracking  
⚠️ Only 17 keypoints (less granular than BlazePose)  
⚠️ No 3D coordinates (2D only)  
❌ Less detailed upper body tracking

**Verdict:** Good for basic movement tracking, but BlazePose provides more detail needed for serve analysis.

---

### C. TensorFlow Lite PoseNet

**Developer:** Google/TensorFlow  
**Architecture:** ResNet or MobileNet backbone

#### Specifications:

- **17 keypoints**
- Model size: 3-13 MB (depending on variant)
- Speed: 20-40 FPS
- Older architecture (2018)

#### Tennis-Specific Analysis:

⚠️ Older technology (superseded by MoveNet)  
⚠️ Less accurate than modern alternatives  
⚠️ Limited upper body detail

**Verdict:** Not recommended - use MoveNet or BlazePose instead.

---

### D. OpenPose (Not Recommended for Mobile)

**Developer:** CMU  
**Architecture:** Multi-stage CNN

#### Specifications:

- **25 body keypoints** (or 135 with hands/face)
- Very high accuracy
- Multi-person detection

#### Why Not Suitable:

❌ Too computationally expensive for mobile  
❌ Requires GPU for real-time performance  
❌ Model size: 200+ MB  
❌ 1-5 FPS on mobile devices

**Verdict:** Excellent for desktop/server processing, but not viable for real-time mobile use.

---

## 2. Tennis Serve Analysis Requirements

### Critical Keypoints for Serve Analysis:

```
Preparation Phase:
├── Feet position (ankles, knees)
├── Hip alignment
├── Shoulder position
└── Ball toss arm (shoulder, elbow, wrist)

Trophy Position:
├── Racket arm (shoulder, elbow, wrist)
├── Shoulder rotation
├── Hip rotation
└── Knee bend

Execution:
├── Leg drive (knees, hips)
├── Shoulder rotation velocity
├── Elbow extension
├── Wrist pronation
└── Body weight transfer

Follow-through:
├── Racket path
├── Body balance
└── Landing position
```

### Model Comparison for Tennis:

| Feature            | MediaPipe Pose | MoveNet    | PoseNet  |
| ------------------ | -------------- | ---------- | -------- |
| Upper body detail  | ⭐⭐⭐⭐⭐     | ⭐⭐⭐     | ⭐⭐⭐   |
| 3D coordinates     | ✅ Yes         | ❌ No      | ❌ No    |
| Keypoint count     | 33             | 17         | 17       |
| Wrist tracking     | ⭐⭐⭐⭐⭐     | ⭐⭐⭐⭐   | ⭐⭐⭐   |
| Fast motion        | ⭐⭐⭐⭐       | ⭐⭐⭐⭐⭐ | ⭐⭐⭐   |
| Mobile optimized   | ⭐⭐⭐⭐⭐     | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Tennis suitability | ⭐⭐⭐⭐⭐     | ⭐⭐⭐     | ⭐⭐     |

---

## 3. Performance Metrics

### MediaPipe Pose (Lite) - Recommended for MVP

**Device Performance:**

- iPhone 12/13: 50-60 FPS
- iPhone X/11: 35-45 FPS
- Pixel 5/6: 45-55 FPS
- Pixel 3/4: 30-40 FPS
- Samsung Galaxy S21+: 40-50 FPS

**Battery Impact:**

- Continuous use: ~15-20% per hour
- With camera: ~25-30% per hour

**Latency:**

- Frame-to-result: 16-33ms (30-60 FPS)
- End-to-end (camera to feedback): 50-100ms

### MediaPipe Pose (Full) - Recommended for Production

**Device Performance:**

- iPhone 12/13: 35-45 FPS
- iPhone X/11: 25-35 FPS
- Pixel 5/6: 30-40 FPS
- Pixel 3/4: 20-30 FPS

**Accuracy Improvement:**

- ~10-15% better keypoint localization
- Better handling of occlusion
- More stable tracking

---

## 4. React Native Integration Options

### Option 1: MediaPipe Tasks (Native Modules) ⭐ RECOMMENDED

**Approach:** Use official MediaPipe libraries with React Native bridges

**Pros:**

- Official support from Google
- Best performance (native code)
- Regular updates
- Complete feature set

**Cons:**

- Requires native module development
- More complex setup
- Platform-specific code

**Implementation:**

```javascript
// iOS: Use MediaPipe iOS SDK
// Android: Use MediaPipe Android SDK
// Bridge: Custom React Native module
```

**Libraries:**

- `react-native-mediapipe` (community, if available)
- Custom native module (recommended for production)

---

### Option 2: TensorFlow Lite with React Native

**Approach:** Use TensorFlow Lite models with React Native TensorFlow

**Pros:**

- Good community support
- Flexible model choice
- Easier to customize

**Cons:**

- Slightly lower performance than native MediaPipe
- More manual setup required

**Implementation:**

```javascript
// Use @tensorflow/tfjs-react-native
// Or react-native-tensorflow-lite
```

**Libraries:**

- `@tensorflow/tfjs-react-native`
- `react-native-tensorflow-lite`

---

### Option 3: Expo + TensorFlow.js (Quickest MVP)

**Approach:** Use Expo with TensorFlow.js for rapid prototyping

**Pros:**

- Fastest to implement
- No native code required
- Easy to test and iterate

**Cons:**

- Lower performance (~20-30% slower)
- Limited to TensorFlow models
- May not achieve real-time on older devices

**Implementation:**

```javascript
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';
import * as poseDetection from '@tensorflow-models/pose-detection';
```

---

## 5. Recommended Implementation Strategy

### Phase 1: MVP (2-4 weeks)

**Model:** MediaPipe Pose Lite  
**Integration:** Option 3 (Expo + TensorFlow.js) OR Option 2 (TFLite)  
**Features:**

- Basic pose detection
- 5-7 key form checks
- Simple visual overlay
- Record and replay

**Why:**

- Fastest time to market
- Validate concept
- Test with real users
- Iterate on feedback logic

---

### Phase 2: Production (1-2 months)

**Model:** MediaPipe Pose Full  
**Integration:** Option 1 (Native MediaPipe)  
**Features:**

- Enhanced accuracy
- More sophisticated analysis
- Better performance
- Advanced feedback

**Migration Path:**

1. Develop native modules for iOS/Android
2. Implement MediaPipe Pose SDK
3. Create React Native bridge
4. Migrate analysis logic
5. Optimize performance

---

## 6. Technical Implementation Details

### MediaPipe Pose Output Structure

```javascript
{
  landmarks: [
    // 33 keypoints, each with:
    {
      x: 0.5,        // Normalized [0-1] image coordinates
      y: 0.3,
      z: -0.1,       // Depth relative to hips
      visibility: 0.95  // Confidence [0-1]
    },
    // ... 32 more keypoints
  ],
  worldLandmarks: [
    // 33 keypoints in 3D world coordinates (meters)
    {
      x: 0.2,        // Real-world 3D position
      y: 1.5,
      z: -0.3,
      visibility: 0.95
    },
    // ... 32 more keypoints
  ]
}
```

### Key Landmark Indices for Tennis Serve

```javascript
const POSE_LANDMARKS = {
  // Upper body (critical for serve)
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,

  // Core
  LEFT_HIP: 23,
  RIGHT_HIP: 24,

  // Lower body (for leg drive)
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,

  // Additional
  NOSE: 0,
  LEFT_EYE: 2,
  RIGHT_EYE: 5,
};
```

### Example: Calculate Elbow Angle

```javascript
function calculateAngle(shoulder, elbow, wrist) {
  // Vector from elbow to shoulder
  const v1 = {
    x: shoulder.x - elbow.x,
    y: shoulder.y - elbow.y,
    z: shoulder.z - elbow.z,
  };

  // Vector from elbow to wrist
  const v2 = {
    x: wrist.x - elbow.x,
    y: wrist.y - elbow.y,
    z: wrist.z - elbow.z,
  };

  // Calculate angle using dot product
  const dotProduct = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
  const magnitude1 = Math.sqrt(v1.x ** 2 + v1.y ** 2 + v1.z ** 2);
  const magnitude2 = Math.sqrt(v2.x ** 2 + v2.y ** 2 + v2.z ** 2);

  const angle = Math.acos(dotProduct / (magnitude1 * magnitude2));
  return angle * (180 / Math.PI); // Convert to degrees
}

// Usage for serve analysis
const rightElbowAngle = calculateAngle(
  landmarks[POSE_LANDMARKS.RIGHT_SHOULDER],
  landmarks[POSE_LANDMARKS.RIGHT_ELBOW],
  landmarks[POSE_LANDMARKS.RIGHT_WRIST],
);

// Check if elbow is properly extended at contact
if (rightElbowAngle < 160) {
  feedback.push('Extend your elbow more at contact');
}
```

---

## 7. Serve-Specific Analysis Rules

### Trophy Position Check

```javascript
function checkTrophyPosition(landmarks) {
  const feedback = [];

  // 1. Racket arm elbow should be bent ~90-120 degrees
  const elbowAngle = calculateAngle(
    landmarks[RIGHT_SHOULDER],
    landmarks[RIGHT_ELBOW],
    landmarks[RIGHT_WRIST],
  );

  if (elbowAngle < 80 || elbowAngle > 130) {
    feedback.push({
      type: 'warning',
      message: 'Elbow angle in trophy position should be 90-120°',
      current: Math.round(elbowAngle),
    });
  }

  // 2. Shoulders should be rotated (side-on to net)
  const shoulderRotation = calculateShoulderRotation(landmarks);
  if (shoulderRotation < 45) {
    feedback.push({
      type: 'warning',
      message: 'Rotate shoulders more (turn sideways)',
    });
  }

  // 3. Knees should be bent
  const kneeBend = calculateKneeBend(landmarks);
  if (kneeBend > 160) {
    feedback.push({
      type: 'warning',
      message: 'Bend your knees more for power',
    });
  }

  return feedback;
}
```

### Ball Toss Analysis

```javascript
function analyzeBallToss(landmarks, previousLandmarks) {
  // Track left wrist movement (for right-handed player)
  const wristTrajectory = [];

  // Ideal toss:
  // - Straight up
  // - In front of body
  // - Reaches peak at right time

  const tossHeight = landmarks[LEFT_WRIST].y;
  const tossForward = landmarks[LEFT_WRIST].x - landmarks[NOSE].x;

  if (Math.abs(tossForward) > 0.15) {
    return {
      type: 'error',
      message: 'Ball toss too far forward/backward',
    };
  }

  if (tossHeight < landmarks[NOSE].y - 0.3) {
    return {
      type: 'warning',
      message: 'Toss the ball higher',
    };
  }

  return { type: 'success', message: 'Good toss!' };
}
```

### Contact Point Analysis

```javascript
function analyzeContactPoint(landmarks) {
  const feedback = [];

  // 1. Arm should be fully extended
  const armExtension = calculateAngle(
    landmarks[RIGHT_SHOULDER],
    landmarks[RIGHT_ELBOW],
    landmarks[RIGHT_WRIST],
  );

  if (armExtension < 160) {
    feedback.push({
      type: 'critical',
      message: 'Extend your arm fully at contact',
      current: Math.round(armExtension),
      target: '170-180°',
    });
  }

  // 2. Contact should be in front and high
  const contactHeight = landmarks[RIGHT_WRIST].y;
  const headHeight = landmarks[NOSE].y;

  if (contactHeight > headHeight - 0.2) {
    feedback.push({
      type: 'warning',
      message: 'Contact point too low - reach higher',
    });
  }

  // 3. Body should be extending upward (leg drive)
  const hipHeight = (landmarks[LEFT_HIP].y + landmarks[RIGHT_HIP].y) / 2;
  // Compare with previous frame to detect upward movement

  return feedback;
}
```

---

## 8. Performance Optimization Tips

### 1. Frame Rate Management

```javascript
// Don't process every frame - skip frames if needed
let frameCount = 0;
const PROCESS_EVERY_N_FRAMES = 2; // Process every 2nd frame

function onFrame(frame) {
  frameCount++;
  if (frameCount % PROCESS_EVERY_N_FRAMES !== 0) {
    return; // Skip this frame
  }

  // Process frame
  detectPose(frame);
}
```

### 2. Confidence Thresholds

```javascript
// Only analyze when confidence is high
const MIN_VISIBILITY = 0.7;

function isLandmarkReliable(landmark) {
  return landmark.visibility > MIN_VISIBILITY;
}

// Filter unreliable keypoints
const reliableLandmarks = landmarks.filter(isLandmarkReliable);
```

### 3. Temporal Smoothing

```javascript
// Smooth jittery detections over time
class LandmarkSmoother {
  constructor(smoothingFactor = 0.3) {
    this.smoothingFactor = smoothingFactor;
    this.previousLandmarks = null;
  }

  smooth(currentLandmarks) {
    if (!this.previousLandmarks) {
      this.previousLandmarks = currentLandmarks;
      return currentLandmarks;
    }

    const smoothed = currentLandmarks.map((landmark, i) => ({
      x:
        this.smoothingFactor * landmark.x +
        (1 - this.smoothingFactor) * this.previousLandmarks[i].x,
      y:
        this.smoothingFactor * landmark.y +
        (1 - this.smoothingFactor) * this.previousLandmarks[i].y,
      z:
        this.smoothingFactor * landmark.z +
        (1 - this.smoothingFactor) * this.previousLandmarks[i].z,
      visibility: landmark.visibility,
    }));

    this.previousLandmarks = smoothed;
    return smoothed;
  }
}
```

---

## 9. Alternative Approaches for Advanced Features

### Option A: Hybrid On-Device + Cloud

**Use Case:** Detailed post-serve analysis

**Architecture:**

1. Real-time feedback: On-device MediaPipe Pose
2. Detailed analysis: Upload video to cloud
3. Cloud processing: More sophisticated ML models
4. Return detailed report

**Benefits:**

- Best of both worlds
- Can use heavier models in cloud
- Compare against pro serves
- Generate detailed reports

---

### Option B: Custom Model Training

**Use Case:** Tennis-specific pose estimation

**Approach:**

1. Start with MediaPipe Pose as base
2. Collect tennis serve videos
3. Fine-tune model on tennis-specific data
4. Focus on racket tracking and serve phases

**Benefits:**

- Better accuracy for tennis movements
- Can detect racket position
- Understand serve phases automatically

**Challenges:**

- Requires ML expertise
- Need large dataset
- Training infrastructure
- Ongoing maintenance

---

## 10. Recommended Tech Stack Summary

### For MVP (Fastest Path to Market)

```javascript
{
  "framework": "React Native with Expo",
  "camera": "expo-camera",
  "ml": "@tensorflow-models/pose-detection (MoveNet)",
  "model": "MoveNet Lightning or MediaPipe Pose Lite",
  "visualization": "react-native-svg",
  "storage": "AsyncStorage + expo-file-system"
}
```

**Estimated Timeline:** 2-4 weeks  
**Performance:** 25-40 FPS on modern devices  
**Accuracy:** Good for basic feedback

---

### For Production (Best Performance)

```javascript
{
  "framework": "React Native (bare workflow)",
  "camera": "react-native-vision-camera",
  "ml": "MediaPipe iOS/Android SDK (native modules)",
  "model": "MediaPipe Pose Full",
  "visualization": "react-native-skia or react-native-reanimated",
  "storage": "SQLite + react-native-fs",
  "backend": "Optional: FastAPI for detailed analysis"
}
```

**Estimated Timeline:** 2-3 months  
**Performance:** 35-60 FPS on modern devices  
**Accuracy:** Excellent for detailed feedback

---

## 11. Cost Considerations

### On-Device Only (Recommended for MVP)

- **Development:** $0 (open-source models)
- **Runtime:** $0 (no API calls)
- **Scaling:** $0 (runs on user's device)

### Hybrid (On-Device + Cloud)

- **Development:** $0 (open-source models)
- **Runtime:**
  - Real-time: $0
  - Cloud analysis: ~$0.01-0.05 per video
- **Scaling:** Moderate costs as user base grows

### Fully Cloud-Based (Not Recommended)

- **Development:** $0-$500/month (API costs during dev)
- **Runtime:** $0.10-0.50 per video
- **Scaling:** High costs, not sustainable

---

## 12. Next Steps

### Immediate Actions:

1. **Set up development environment**
   - Install React Native / Expo
   - Set up iOS/Android emulators
   - Install TensorFlow.js or MediaPipe dependencies

2. **Build proof of concept**
   - Implement basic camera capture
   - Integrate pose detection
   - Display skeleton overlay
   - Test on real device

3. **Develop analysis logic**
   - Define serve phases
   - Implement angle calculations
   - Create feedback rules
   - Test with sample videos

4. **User testing**
   - Test with tennis players
   - Gather feedback on accuracy
   - Iterate on feedback messages
   - Optimize performance

---

## 13. Resources & References

### Documentation:

- [MediaPipe Pose Guide](https://developers.google.com/mediapipe/solutions/vision/pose_landmarker)
- [TensorFlow Pose Detection](https://www.tensorflow.org/lite/examples/pose_estimation/overview)
- [React Native Vision Camera](https://github.com/mrousavy/react-native-vision-camera)

### Research Papers:

- [BlazePose Paper](https://arxiv.org/abs/2006.10204)
- [MoveNet Paper](https://blog.tensorflow.org/2021/05/next-generation-pose-detection-with-movenet-and-tensorflowjs.html)

### Example Projects:

- [MediaPipe Pose Examples](https://github.com/google-ai-edge/mediapipe-samples)
- [TensorFlow Pose Detection Examples](https://github.com/tensorflow/tfjs-models/tree/master/pose-detection)

### Tennis Biomechanics:

- ITF Tennis Serve Biomechanics
- USTA Serve Technique Guidelines
- Sports Science Research on Tennis Serves

---

## Conclusion

**For your tennis serve coaching app, I recommend:**

1. **Start with MediaPipe Pose Lite** using Expo/TensorFlow.js for rapid MVP
2. **Focus on 5-7 key serve metrics** (elbow angle, shoulder rotation, knee bend, contact height, ball toss)
3. **Migrate to native MediaPipe** for production to achieve 40-60 FPS
4. **Consider hybrid approach** for detailed post-serve analysis

This approach balances development speed, performance, and accuracy while keeping costs minimal and providing a great user experience.
