# MediaPipe POC Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Tennis Coach App                         │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Pose Detection Screen                         │
│                  (pose-detection.tsx)                            │
│                                                                   │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐         │
│  │   Camera    │  │   Canvas     │  │   Analysis     │         │
│  │   View      │  │   Overlay    │  │   Panel        │         │
│  └─────────────┘  └──────────────┘  └────────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      PoseDetector Class                          │
│                    (PoseDetector.ts)                             │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  initialize()                                             │  │
│  │  • Load MediaPipe model                                   │  │
│  │  • Configure GPU acceleration                             │  │
│  │  • Set confidence thresholds                              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  detectPose(videoFrame, timestamp)                        │  │
│  │  • Process video frame                                    │  │
│  │  • Extract 33 body landmarks                              │  │
│  │  • Return pose data                                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  analyzeTennisPosture(landmarks)                          │  │
│  │  • Calculate shoulder alignment                           │  │
│  │  • Calculate hip alignment                                │  │
│  │  • Calculate knee flexion                                 │  │
│  │  • Calculate balance score                                │  │
│  │  • Detect racket position                                 │  │
│  │  • Generate coaching suggestions                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  drawLandmarks(canvas, landmarks, connections)            │  │
│  │  • Draw skeleton connections                              │  │
│  │  • Draw landmark points                                   │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    MediaPipe Pose Landmarker                     │
│                  (@mediapipe/tasks-vision)                       │
│                                                                   │
│  • 33-point body landmark detection                              │
│  • GPU-accelerated processing                                    │
│  • Real-time video mode                                          │
│  • Confidence scoring                                            │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

```
┌──────────────┐
│ Camera Feed  │
└──────┬───────┘
       │ Video Stream
       ▼
┌──────────────────┐
│  Video Frame     │ (HTMLVideoElement)
└──────┬───────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  PoseDetector.detectPose()           │
│  • Timestamp: performance.now()      │
│  • Frame: current video frame        │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  MediaPipe Processing                │
│  • Detect body landmarks             │
│  • Calculate 3D positions            │
│  • Assign confidence scores          │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  PoseDetectionResult                 │
│  {                                   │
│    landmarks: PoseLandmark[][],      │
│    worldLandmarks: PoseLandmark[][],│
│    timestamp: number                 │
│  }                                   │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  PoseDetector.analyzeTennisPosture() │
│  • Extract key landmarks             │
│  • Calculate angles                  │
│  • Compute alignment scores          │
│  • Detect racket position            │
│  • Generate suggestions              │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  TennisPostureAnalysis               │
│  {                                   │
│    shoulderAlignment: 85,            │
│    hipAlignment: 92,                 │
│    kneeFlexion: 78,                  │
│    racketPosition: 'ready',          │
│    balanceScore: 88,                 │
│    suggestions: [...]                │
│  }                                   │
└──────┬───────────────────────────────┘
       │
       ├─────────────────┬──────────────┐
       │                 │              │
       ▼                 ▼              ▼
┌─────────────┐  ┌─────────────┐  ┌──────────┐
│   Canvas    │  │  Analysis   │  │  State   │
│   Overlay   │  │   Panel     │  │  Update  │
└─────────────┘  └─────────────┘  └──────────┘
```

## Component Interaction

```
┌─────────────────────────────────────────────────────────────┐
│                    React Component Lifecycle                 │
└─────────────────────────────────────────────────────────────┘

useEffect (mount)
    │
    ├─→ initializePoseDetector()
    │       │
    │       └─→ new PoseDetector()
    │       └─→ detector.initialize()
    │
    └─→ cleanup()
            └─→ detector.dispose()

User Action: "Start Detection"
    │
    └─→ startDetection()
            │
            └─→ detectPose() [recursive]
                    │
                    ├─→ detector.detectPose(video, timestamp)
                    │       │
                    │       └─→ MediaPipe processing
                    │
                    ├─→ detector.analyzeTennisPosture(landmarks)
                    │       │
                    │       └─→ Calculate metrics
                    │
                    ├─→ detector.drawLandmarks(canvas, landmarks)
                    │       │
                    │       └─→ Render skeleton
                    │
                    ├─→ setAnalysis(result)
                    │       │
                    │       └─→ Update UI
                    │
                    └─→ requestAnimationFrame(detectPose)
                            │
                            └─→ Loop continues...

User Action: "Stop Detection"
    │
    └─→ stopDetection()
            │
            └─→ cancelAnimationFrame()
```

## Landmark Detection

```
MediaPipe 33-Point Body Landmarks

        0 (nose)
       / \
      1   4 (eyes)
     2     5 (ears)
      \   /
       \ /
    11─┬─12 (shoulders)
       │
    13─┼─14 (elbows)
       │
    15─┼─16 (wrists)
       │
    23─┼─24 (hips)
       │
    25─┼─26 (knees)
       │
    27─┼─28 (ankles)
       │
    29─┴─32 (feet)

Key Landmarks for Tennis Analysis:
• Shoulders (11, 12) → Alignment
• Hips (23, 24) → Stability
• Knees (25, 26) → Flexion
• Ankles (27, 28) → Balance
• Wrists (15, 16) → Racket position
```

## Tennis Metrics Calculation

```
┌─────────────────────────────────────────────────────────────┐
│                  Shoulder Alignment                          │
│                                                              │
│  leftShoulder.y ─────────────────────────────────────────   │
│                                                              │
│  rightShoulder.y ────────────────────────────────────────   │
│                                                              │
│  diff = |leftShoulder.y - rightShoulder.y|                  │
│  score = max(0, 100 - diff * 500)                           │
│                                                              │
│  Perfect: diff ≈ 0 → score = 100                            │
│  Poor: diff > 0.2 → score < 0                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    Knee Flexion                              │
│                                                              │
│         hip                                                  │
│          │                                                   │
│          │ angle                                            │
│          │/                                                 │
│        knee                                                  │
│          │                                                   │
│          │                                                   │
│        ankle                                                 │
│                                                              │
│  angle = calculateAngle(hip, knee, ankle)                   │
│  ideal = 150° (tennis ready position)                       │
│  score = 100 - |ideal - angle| * 2                          │
│                                                              │
│  Perfect: 140-160° → score > 80                             │
│  Too straight: > 165° → "Bend knees more"                   │
│  Too low: < 130° → "Straighten up slightly"                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    Balance Score                             │
│                                                              │
│         hips center                                          │
│             │                                                │
│             │ offset                                         │
│             │                                                │
│         feet center                                          │
│                                                              │
│  hipCenter = (leftHip.x + rightHip.x) / 2                   │
│  feetCenter = (leftAnkle.x + rightAnkle.x) / 2              │
│  offset = |hipCenter - feetCenter|                          │
│  score = max(0, 100 - offset * 300)                         │
│                                                              │
│  Perfect: offset ≈ 0 → score = 100                          │
│  Poor: offset > 0.33 → score < 0                            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  Racket Position Detection                   │
│                                                              │
│  avgWristY = (leftWrist.y + rightWrist.y) / 2               │
│  avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2      │
│  avgWristX = (leftWrist.x + rightWrist.x) / 2               │
│                                                              │
│  if avgWristY < avgShoulderY - 0.1:                         │
│      position = 'follow-through'                            │
│  else if avgWristY > avgShoulderY + 0.15:                   │
│      position = 'backswing'                                 │
│  else if |avgWristX - 0.5| < 0.2:                           │
│      position = 'ready'                                     │
│  else:                                                       │
│      position = 'contact'                                   │
└─────────────────────────────────────────────────────────────┘
```

## Performance Optimization

```
┌─────────────────────────────────────────────────────────────┐
│                   Optimization Strategy                      │
└─────────────────────────────────────────────────────────────┘

1. GPU Acceleration
   ├─→ MediaPipe configured with GPU delegate
   └─→ Hardware-accelerated inference

2. Lite Model
   ├─→ Smaller model size (faster loading)
   ├─→ Optimized for mobile devices
   └─→ Trade-off: slightly less accurate

3. Video Mode
   ├─→ Optimized for continuous frames
   ├─→ Temporal smoothing
   └─→ Better tracking consistency

4. Canvas Optimization
   ├─→ Match video resolution
   ├─→ Clear only when needed
   └─→ Efficient drawing operations

5. Frame Processing
   ├─→ Process every frame (no skipping)
   ├─→ Use requestAnimationFrame
   └─→ Async/await for non-blocking

6. Memory Management
   ├─→ Dispose detector on unmount
   ├─→ Cancel animation frames
   └─→ Clear references
```

## Error Handling

```
┌─────────────────────────────────────────────────────────────┐
│                     Error Flow                               │
└─────────────────────────────────────────────────────────────┘

Initialization Error
    │
    ├─→ Network error (model download)
    │   └─→ Show error message
    │   └─→ Retry option
    │
    ├─→ WebAssembly not supported
    │   └─→ Show compatibility error
    │   └─→ Suggest alternative
    │
    └─→ GPU not available
        └─→ Fallback to CPU
        └─→ Warn about performance

Detection Error
    │
    ├─→ No pose detected
    │   └─→ Return null
    │   └─→ Continue processing
    │
    ├─→ Invalid frame
    │   └─→ Skip frame
    │   └─→ Log warning
    │
    └─→ Processing timeout
        └─→ Cancel operation
        └─→ Restart detection

Camera Error
    │
    ├─→ Permission denied
    │   └─→ Show permission prompt
    │   └─→ Guide to settings
    │
    ├─→ Camera not available
    │   └─→ Show error message
    │   └─→ Check device
    │
    └─→ Camera in use
        └─→ Request release
        └─→ Retry
```

## State Management

```
┌─────────────────────────────────────────────────────────────┐
│                   Component State                            │
└─────────────────────────────────────────────────────────────┘

useState
    ├─→ facing: 'front' | 'back'
    ├─→ isDetecting: boolean
    ├─→ analysis: TennisPostureAnalysis | null
    └─→ fps: number

useRef
    ├─→ poseDetectorRef: PoseDetector | null
    ├─→ canvasRef: HTMLCanvasElement | null
    ├─→ videoRef: HTMLVideoElement | null
    ├─→ animationFrameRef: number | null
    ├─→ lastFrameTimeRef: number
    └─→ fpsCounterRef: number[]

useEffect
    ├─→ Initialize detector on mount
    └─→ Cleanup on unmount

State Updates
    ├─→ setAnalysis() → Triggers UI re-render
    ├─→ setFps() → Updates performance display
    └─→ setIsDetecting() → Controls detection loop
```

This architecture provides a clear separation of concerns, efficient processing, and a smooth user experience for real-time tennis pose analysis.
