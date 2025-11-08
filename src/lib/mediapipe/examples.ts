/**
 * MediaPipe POC Usage Examples
 * 
 * This file contains example code snippets for using the MediaPipe integration.
 */

import { PoseDetector, PoseLandmark, POSE_CONNECTIONS } from './PoseDetector';

// ============================================================================
// Example 1: Basic Pose Detection
// ============================================================================

export async function basicPoseDetectionExample(
  videoElement: HTMLVideoElement
): Promise<void> {
  // Initialize detector
  const detector = new PoseDetector();
  await detector.initialize();

  // Detect pose from current video frame
  const timestamp = performance.now();
  const result = await detector.detectPose(videoElement, timestamp);

  if (result && result.landmarks.length > 0) {
    console.log('Pose detected!');
    console.log('Number of landmarks:', result.landmarks[0].length);
    console.log('First landmark (nose):', result.landmarks[0][0]);
  } else {
    console.log('No pose detected');
  }

  // Clean up
  detector.dispose();
}

// ============================================================================
// Example 2: Real-time Video Processing
// ============================================================================

export class RealtimePoseProcessor {
  private detector: PoseDetector;
  private isProcessing = false;
  private animationFrameId: number | null = null;

  constructor() {
    this.detector = new PoseDetector();
  }

  async start(
    videoElement: HTMLVideoElement,
    onPoseDetected: (landmarks: PoseLandmark[]) => void
  ): Promise<void> {
    await this.detector.initialize();
    this.isProcessing = true;

    const processFrame = async () => {
      if (!this.isProcessing) return;

      const timestamp = performance.now();
      const result = await this.detector.detectPose(videoElement, timestamp);

      if (result && result.landmarks.length > 0) {
        onPoseDetected(result.landmarks[0]);
      }

      this.animationFrameId = requestAnimationFrame(processFrame);
    };

    processFrame();
  }

  stop(): void {
    this.isProcessing = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.detector.dispose();
  }
}

// Usage:
// const processor = new RealtimePoseProcessor();
// await processor.start(videoElement, (landmarks) => {
//   console.log('Pose detected:', landmarks);
// });

// ============================================================================
// Example 3: Tennis Posture Analysis
// ============================================================================

export async function analyzeTennisPostureExample(
  videoElement: HTMLVideoElement
): Promise<void> {
  const detector = new PoseDetector();
  await detector.initialize();

  const result = await detector.detectPose(videoElement, performance.now());

  if (result && result.landmarks.length > 0) {
    const analysis = detector.analyzeTennisPosture(result.landmarks[0]);

    console.log('Tennis Posture Analysis:');
    console.log('- Shoulder Alignment:', analysis.shoulderAlignment + '%');
    console.log('- Hip Alignment:', analysis.hipAlignment + '%');
    console.log('- Knee Flexion:', analysis.kneeFlexion + '%');
    console.log('- Balance Score:', analysis.balanceScore + '%');
    console.log('- Racket Position:', analysis.racketPosition);
    console.log('- Suggestions:', analysis.suggestions);
  }

  detector.dispose();
}

// ============================================================================
// Example 4: Drawing Pose Overlay
// ============================================================================

export async function drawPoseOverlayExample(
  videoElement: HTMLVideoElement,
  canvas: HTMLCanvasElement
): Promise<void> {
  const detector = new PoseDetector();
  await detector.initialize();

  // Match canvas size to video
  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;

  const result = await detector.detectPose(videoElement, performance.now());

  if (result && result.landmarks.length > 0) {
    // Clear canvas
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    // Draw pose skeleton
    detector.drawLandmarks(canvas, result.landmarks[0], POSE_CONNECTIONS);
  }

  detector.dispose();
}

// ============================================================================
// Example 5: Custom Metric - Serve Analysis
// ============================================================================

export interface ServeAnalysis {
  tossHeight: number;
  armExtension: number;
  shoulderRotation: number;
  isGoodServe: boolean;
  feedback: string[];
}

export function analyzeServe(landmarks: PoseLandmark[]): ServeAnalysis {
  const RIGHT_SHOULDER = 12;
  const RIGHT_ELBOW = 14;
  const RIGHT_WRIST = 16;
  const LEFT_WRIST = 15;
  const NOSE = 0;

  const feedback: string[] = [];

  // Calculate toss height (left wrist relative to nose)
  const tossHeight = landmarks[NOSE].y - landmarks[LEFT_WRIST].y;
  const tossScore = tossHeight > 0.2 ? 100 : (tossHeight / 0.2) * 100;

  if (tossHeight < 0.15) {
    feedback.push('Toss the ball higher for better serve power');
  }

  // Calculate arm extension at contact
  const shoulderToElbow = Math.hypot(
    landmarks[RIGHT_ELBOW].x - landmarks[RIGHT_SHOULDER].x,
    landmarks[RIGHT_ELBOW].y - landmarks[RIGHT_SHOULDER].y
  );
  const elbowToWrist = Math.hypot(
    landmarks[RIGHT_WRIST].x - landmarks[RIGHT_ELBOW].x,
    landmarks[RIGHT_WRIST].y - landmarks[RIGHT_ELBOW].y
  );
  const armExtension = ((shoulderToElbow + elbowToWrist) / 0.5) * 100;

  if (armExtension < 80) {
    feedback.push('Extend your arm fully at contact');
  }

  // Calculate shoulder rotation (simplified)
  const shoulderRotation = Math.abs(
    landmarks[RIGHT_SHOULDER].x - landmarks[12].x
  ) * 200;

  if (shoulderRotation < 30) {
    feedback.push('Rotate your shoulders more for power');
  }

  const isGoodServe = tossScore > 70 && armExtension > 80 && shoulderRotation > 30;

  if (isGoodServe) {
    feedback.push('Excellent serve form!');
  }

  return {
    tossHeight: Math.round(tossScore),
    armExtension: Math.round(armExtension),
    shoulderRotation: Math.round(shoulderRotation),
    isGoodServe,
    feedback,
  };
}

// Usage:
// const result = await detector.detectPose(video, timestamp);
// if (result) {
//   const serveAnalysis = analyzeServe(result.landmarks[0]);
//   console.log(serveAnalysis);
// }

// ============================================================================
// Example 6: Comparing Two Poses (e.g., before/after)
// ============================================================================

export function comparePoses(
  pose1: PoseLandmark[],
  pose2: PoseLandmark[]
): {
  similarity: number;
  differences: Array<{ landmark: number; distance: number }>;
} {
  if (pose1.length !== pose2.length) {
    throw new Error('Poses must have the same number of landmarks');
  }

  const differences: Array<{ landmark: number; distance: number }> = [];
  let totalDistance = 0;

  for (let i = 0; i < pose1.length; i++) {
    const distance = Math.hypot(
      pose1[i].x - pose2[i].x,
      pose1[i].y - pose2[i].y,
      pose1[i].z - pose2[i].z
    );

    differences.push({ landmark: i, distance });
    totalDistance += distance;
  }

  // Calculate similarity (0-100, where 100 is identical)
  const avgDistance = totalDistance / pose1.length;
  const similarity = Math.max(0, 100 - avgDistance * 500);

  // Sort differences by distance (largest first)
  differences.sort((a, b) => b.distance - a.distance);

  return { similarity, differences };
}

// Usage:
// const comparison = comparePoses(studentPose, coachPose);
// console.log('Similarity:', comparison.similarity + '%');
// console.log('Biggest difference:', comparison.differences[0]);

// ============================================================================
// Example 7: Recording Pose Sequence
// ============================================================================

export class PoseSequenceRecorder {
  private frames: Array<{ timestamp: number; landmarks: PoseLandmark[] }> = [];
  private isRecording = false;

  startRecording(): void {
    this.frames = [];
    this.isRecording = true;
  }

  recordFrame(timestamp: number, landmarks: PoseLandmark[]): void {
    if (this.isRecording) {
      this.frames.push({ timestamp, landmarks });
    }
  }

  stopRecording(): Array<{ timestamp: number; landmarks: PoseLandmark[] }> {
    this.isRecording = false;
    return this.frames;
  }

  getFrameCount(): number {
    return this.frames.length;
  }

  getDuration(): number {
    if (this.frames.length < 2) return 0;
    return this.frames[this.frames.length - 1].timestamp - this.frames[0].timestamp;
  }

  exportToJSON(): string {
    return JSON.stringify(this.frames);
  }

  importFromJSON(json: string): void {
    this.frames = JSON.parse(json);
  }
}

// Usage:
// const recorder = new PoseSequenceRecorder();
// recorder.startRecording();
// 
// // In your detection loop:
// const result = await detector.detectPose(video, timestamp);
// if (result) {
//   recorder.recordFrame(timestamp, result.landmarks[0]);
// }
//
// const sequence = recorder.stopRecording();
// console.log('Recorded', sequence.length, 'frames');

// ============================================================================
// Example 8: Performance Monitoring
// ============================================================================

export class PerformanceMonitor {
  private frameTimes: number[] = [];
  private lastFrameTime = 0;

  recordFrame(): void {
    const now = performance.now();
    if (this.lastFrameTime > 0) {
      const frameTime = now - this.lastFrameTime;
      this.frameTimes.push(frameTime);

      // Keep only last 60 frames
      if (this.frameTimes.length > 60) {
        this.frameTimes.shift();
      }
    }
    this.lastFrameTime = now;
  }

  getAverageFPS(): number {
    if (this.frameTimes.length === 0) return 0;
    const avgFrameTime = this.frameTimes.reduce((a, b) => a + b) / this.frameTimes.length;
    return 1000 / avgFrameTime;
  }

  getMinFPS(): number {
    if (this.frameTimes.length === 0) return 0;
    const maxFrameTime = Math.max(...this.frameTimes);
    return 1000 / maxFrameTime;
  }

  getMaxFPS(): number {
    if (this.frameTimes.length === 0) return 0;
    const minFrameTime = Math.min(...this.frameTimes);
    return 1000 / minFrameTime;
  }

  reset(): void {
    this.frameTimes = [];
    this.lastFrameTime = 0;
  }
}

// Usage:
// const monitor = new PerformanceMonitor();
//
// // In your detection loop:
// monitor.recordFrame();
// console.log('FPS:', monitor.getAverageFPS().toFixed(1));
