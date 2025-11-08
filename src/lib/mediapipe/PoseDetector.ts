import { PoseLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision';

export interface PoseLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface PoseDetectionResult {
  landmarks: PoseLandmark[][];
  worldLandmarks: PoseLandmark[][];
  timestamp: number;
}

export interface TennisPostureAnalysis {
  shoulderAlignment: number; // 0-100 score
  hipAlignment: number;
  kneeFlexion: number;
  racketPosition: 'ready' | 'backswing' | 'contact' | 'follow-through' | 'unknown';
  balanceScore: number;
  suggestions: string[];
}

export class PoseDetector {
  private poseLandmarker: PoseLandmarker | null = null;
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );

      this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize PoseDetector:', error);
      throw error;
    }
  }

  async detectPose(
    videoFrame: HTMLVideoElement | HTMLCanvasElement,
    timestamp: number
  ): Promise<PoseDetectionResult | null> {
    if (!this.poseLandmarker || !this.initialized) {
      throw new Error('PoseDetector not initialized. Call initialize() first.');
    }

    try {
      const result = this.poseLandmarker.detectForVideo(videoFrame, timestamp);

      if (!result.landmarks || result.landmarks.length === 0) {
        return null;
      }

      return {
        landmarks: result.landmarks,
        worldLandmarks: result.worldLandmarks || [],
        timestamp,
      };
    } catch (error) {
      console.error('Pose detection error:', error);
      return null;
    }
  }

  analyzeTennisPosture(landmarks: PoseLandmark[]): TennisPostureAnalysis {
    if (landmarks.length < 33) {
      return {
        shoulderAlignment: 0,
        hipAlignment: 0,
        kneeFlexion: 0,
        racketPosition: 'unknown',
        balanceScore: 0,
        suggestions: ['Unable to detect full body pose'],
      };
    }

    // MediaPipe Pose landmark indices
    const LEFT_SHOULDER = 11;
    const RIGHT_SHOULDER = 12;
    const LEFT_HIP = 23;
    const RIGHT_HIP = 24;
    const LEFT_KNEE = 25;
    const RIGHT_KNEE = 26;
    const LEFT_ANKLE = 27;
    const RIGHT_ANKLE = 28;
    const LEFT_WRIST = 15;
    const RIGHT_WRIST = 16;

    const suggestions: string[] = [];

    // Calculate shoulder alignment (should be level)
    const shoulderDiff = Math.abs(
      landmarks[LEFT_SHOULDER].y - landmarks[RIGHT_SHOULDER].y
    );
    const shoulderAlignment = Math.max(0, 100 - shoulderDiff * 500);

    if (shoulderAlignment < 70) {
      suggestions.push('Keep your shoulders level and aligned');
    }

    // Calculate hip alignment
    const hipDiff = Math.abs(landmarks[LEFT_HIP].y - landmarks[RIGHT_HIP].y);
    const hipAlignment = Math.max(0, 100 - hipDiff * 500);

    if (hipAlignment < 70) {
      suggestions.push('Align your hips for better stability');
    }

    // Calculate knee flexion (angle between hip-knee-ankle)
    const leftKneeAngle = this.calculateAngle(
      landmarks[LEFT_HIP],
      landmarks[LEFT_KNEE],
      landmarks[LEFT_ANKLE]
    );
    const rightKneeAngle = this.calculateAngle(
      landmarks[RIGHT_HIP],
      landmarks[RIGHT_KNEE],
      landmarks[RIGHT_ANKLE]
    );
    const avgKneeAngle = (leftKneeAngle + rightKneeAngle) / 2;

    // Ideal knee flexion for tennis ready position: 140-160 degrees
    const kneeFlexion = 100 - Math.abs(150 - avgKneeAngle) * 2;

    if (avgKneeAngle > 165) {
      suggestions.push('Bend your knees more for better readiness');
    } else if (avgKneeAngle < 130) {
      suggestions.push('Your stance is too low, straighten up slightly');
    }

    // Determine racket position based on wrist position
    const avgWristY = (landmarks[LEFT_WRIST].y + landmarks[RIGHT_WRIST].y) / 2;
    const avgShoulderY = (landmarks[LEFT_SHOULDER].y + landmarks[RIGHT_SHOULDER].y) / 2;
    const avgWristX = (landmarks[LEFT_WRIST].x + landmarks[RIGHT_WRIST].x) / 2;

    let racketPosition: TennisPostureAnalysis['racketPosition'] = 'unknown';

    if (avgWristY < avgShoulderY - 0.1) {
      racketPosition = 'follow-through';
    } else if (avgWristY > avgShoulderY + 0.15) {
      racketPosition = 'backswing';
    } else if (Math.abs(avgWristX - 0.5) < 0.2) {
      racketPosition = 'ready';
    } else {
      racketPosition = 'contact';
    }

    // Calculate balance score based on center of mass
    const centerX = (landmarks[LEFT_HIP].x + landmarks[RIGHT_HIP].x) / 2;
    const feetCenterX = (landmarks[LEFT_ANKLE].x + landmarks[RIGHT_ANKLE].x) / 2;
    const balanceOffset = Math.abs(centerX - feetCenterX);
    const balanceScore = Math.max(0, 100 - balanceOffset * 300);

    if (balanceScore < 70) {
      suggestions.push('Improve your balance - center your weight over your feet');
    }

    if (suggestions.length === 0) {
      suggestions.push('Great form! Keep it up!');
    }

    return {
      shoulderAlignment: Math.round(shoulderAlignment),
      hipAlignment: Math.round(hipAlignment),
      kneeFlexion: Math.round(kneeFlexion),
      racketPosition,
      balanceScore: Math.round(balanceScore),
      suggestions,
    };
  }

  private calculateAngle(a: PoseLandmark, b: PoseLandmark, c: PoseLandmark): number {
    const radians =
      Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs((radians * 180.0) / Math.PI);

    if (angle > 180.0) {
      angle = 360 - angle;
    }

    return angle;
  }

  drawLandmarks(
    canvas: HTMLCanvasElement,
    landmarks: PoseLandmark[],
    connections?: Array<[number, number]>
  ): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw connections
    if (connections) {
      ctx.strokeStyle = '#00FF00';
      ctx.lineWidth = 2;

      connections.forEach(([start, end]) => {
        if (landmarks[start] && landmarks[end]) {
          ctx.beginPath();
          ctx.moveTo(
            landmarks[start].x * canvas.width,
            landmarks[start].y * canvas.height
          );
          ctx.lineTo(
            landmarks[end].x * canvas.width,
            landmarks[end].y * canvas.height
          );
          ctx.stroke();
        }
      });
    }

    // Draw landmarks
    ctx.fillStyle = '#FF0000';
    landmarks.forEach((landmark) => {
      ctx.beginPath();
      ctx.arc(
        landmark.x * canvas.width,
        landmark.y * canvas.height,
        5,
        0,
        2 * Math.PI
      );
      ctx.fill();
    });
  }

  dispose(): void {
    if (this.poseLandmarker) {
      this.poseLandmarker.close();
      this.poseLandmarker = null;
    }
    this.initialized = false;
  }
}

// Pose landmark connections for drawing skeleton
export const POSE_CONNECTIONS: Array<[number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8],
  [9, 10], [11, 12], [11, 13], [13, 15], [15, 17], [15, 19], [15, 21],
  [17, 19], [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
  [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [27, 29], [27, 31],
  [29, 31], [24, 26], [26, 28], [28, 30], [28, 32], [30, 32],
];
