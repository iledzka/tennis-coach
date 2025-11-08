import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PoseDetector, PoseLandmark } from '../PoseDetector';

describe('PoseDetector', () => {
  let detector: PoseDetector;

  beforeEach(() => {
    detector = new PoseDetector();
  });

  afterEach(() => {
    detector.dispose();
  });

  describe('analyzeTennisPosture', () => {
    it('should return default analysis for insufficient landmarks', () => {
      const landmarks: PoseLandmark[] = [];
      const analysis = detector.analyzeTennisPosture(landmarks);

      expect(analysis.shoulderAlignment).toBe(0);
      expect(analysis.hipAlignment).toBe(0);
      expect(analysis.kneeFlexion).toBe(0);
      expect(analysis.racketPosition).toBe('unknown');
      expect(analysis.balanceScore).toBe(0);
      expect(analysis.suggestions).toContain('Unable to detect full body pose');
    });

    it('should analyze perfect posture correctly', () => {
      // Create mock landmarks for perfect tennis ready position
      const landmarks: PoseLandmark[] = Array(33).fill(null).map((_, i) => ({
        x: 0.5,
        y: 0.5,
        z: 0,
        visibility: 1,
      }));

      // Set specific landmarks for perfect alignment
      landmarks[11] = { x: 0.4, y: 0.3, z: 0, visibility: 1 }; // Left shoulder
      landmarks[12] = { x: 0.6, y: 0.3, z: 0, visibility: 1 }; // Right shoulder
      landmarks[23] = { x: 0.4, y: 0.5, z: 0, visibility: 1 }; // Left hip
      landmarks[24] = { x: 0.6, y: 0.5, z: 0, visibility: 1 }; // Right hip
      landmarks[25] = { x: 0.4, y: 0.7, z: 0, visibility: 1 }; // Left knee
      landmarks[26] = { x: 0.6, y: 0.7, z: 0, visibility: 1 }; // Right knee
      landmarks[27] = { x: 0.4, y: 0.9, z: 0, visibility: 1 }; // Left ankle
      landmarks[28] = { x: 0.6, y: 0.9, z: 0, visibility: 1 }; // Right ankle
      landmarks[15] = { x: 0.4, y: 0.35, z: 0, visibility: 1 }; // Left wrist
      landmarks[16] = { x: 0.6, y: 0.35, z: 0, visibility: 1 }; // Right wrist

      const analysis = detector.analyzeTennisPosture(landmarks);

      expect(analysis.shoulderAlignment).toBeGreaterThan(90);
      expect(analysis.hipAlignment).toBeGreaterThan(90);
      expect(analysis.balanceScore).toBeGreaterThan(90);
      expect(analysis.suggestions.length).toBeGreaterThan(0);
    });

    it('should detect poor shoulder alignment', () => {
      const landmarks: PoseLandmark[] = Array(33).fill(null).map((_, i) => ({
        x: 0.5,
        y: 0.5,
        z: 0,
        visibility: 1,
      }));

      // Set shoulders at different heights
      landmarks[11] = { x: 0.4, y: 0.3, z: 0, visibility: 1 }; // Left shoulder
      landmarks[12] = { x: 0.6, y: 0.4, z: 0, visibility: 1 }; // Right shoulder (lower)

      const analysis = detector.analyzeTennisPosture(landmarks);

      expect(analysis.shoulderAlignment).toBeLessThan(70);
      expect(analysis.suggestions).toContain('Keep your shoulders level and aligned');
    });

    it('should detect racket positions', () => {
      const landmarks: PoseLandmark[] = Array(33).fill(null).map((_, i) => ({
        x: 0.5,
        y: 0.5,
        z: 0,
        visibility: 1,
      }));

      // Set shoulders
      landmarks[11] = { x: 0.4, y: 0.3, z: 0, visibility: 1 };
      landmarks[12] = { x: 0.6, y: 0.3, z: 0, visibility: 1 };

      // Test ready position (wrists near center, at shoulder height)
      landmarks[15] = { x: 0.45, y: 0.3, z: 0, visibility: 1 };
      landmarks[16] = { x: 0.55, y: 0.3, z: 0, visibility: 1 };

      let analysis = detector.analyzeTennisPosture(landmarks);
      expect(analysis.racketPosition).toBe('ready');

      // Test backswing (wrists low)
      landmarks[15] = { x: 0.3, y: 0.5, z: 0, visibility: 1 };
      landmarks[16] = { x: 0.4, y: 0.5, z: 0, visibility: 1 };

      analysis = detector.analyzeTennisPosture(landmarks);
      expect(analysis.racketPosition).toBe('backswing');

      // Test follow-through (wrists high)
      landmarks[15] = { x: 0.6, y: 0.1, z: 0, visibility: 1 };
      landmarks[16] = { x: 0.7, y: 0.1, z: 0, visibility: 1 };

      analysis = detector.analyzeTennisPosture(landmarks);
      expect(analysis.racketPosition).toBe('follow-through');
    });

    it('should provide suggestions for poor balance', () => {
      const landmarks: PoseLandmark[] = Array(33).fill(null).map((_, i) => ({
        x: 0.5,
        y: 0.5,
        z: 0,
        visibility: 1,
      }));

      // Set hips off-center from feet
      landmarks[23] = { x: 0.3, y: 0.5, z: 0, visibility: 1 }; // Left hip
      landmarks[24] = { x: 0.4, y: 0.5, z: 0, visibility: 1 }; // Right hip
      landmarks[27] = { x: 0.6, y: 0.9, z: 0, visibility: 1 }; // Left ankle
      landmarks[28] = { x: 0.7, y: 0.9, z: 0, visibility: 1 }; // Right ankle

      const analysis = detector.analyzeTennisPosture(landmarks);

      expect(analysis.balanceScore).toBeLessThan(70);
      expect(analysis.suggestions).toContain(
        'Improve your balance - center your weight over your feet'
      );
    });
  });

  describe('POSE_CONNECTIONS', () => {
    it('should have valid connection pairs', () => {
      const { POSE_CONNECTIONS } = require('../PoseDetector');

      expect(POSE_CONNECTIONS).toBeDefined();
      expect(Array.isArray(POSE_CONNECTIONS)).toBe(true);
      expect(POSE_CONNECTIONS.length).toBeGreaterThan(0);

      // Check that all connections are valid pairs
      POSE_CONNECTIONS.forEach((connection: [number, number]) => {
        expect(connection).toHaveLength(2);
        expect(connection[0]).toBeGreaterThanOrEqual(0);
        expect(connection[1]).toBeGreaterThanOrEqual(0);
        expect(connection[0]).toBeLessThan(33);
        expect(connection[1]).toBeLessThan(33);
      });
    });
  });
});

describe('PoseDetector angle calculation', () => {
  it('should calculate 90 degree angle correctly', () => {
    const detector = new PoseDetector();

    // Create three points forming a 90 degree angle
    const a: PoseLandmark = { x: 0, y: 0, z: 0 };
    const b: PoseLandmark = { x: 1, y: 0, z: 0 };
    const c: PoseLandmark = { x: 1, y: 1, z: 0 };

    // Access private method through type assertion for testing
    const angle = (detector as any).calculateAngle(a, b, c);

    expect(angle).toBeCloseTo(90, 0);
  });

  it('should calculate 180 degree angle correctly', () => {
    const detector = new PoseDetector();

    // Create three points forming a straight line
    const a: PoseLandmark = { x: 0, y: 0, z: 0 };
    const b: PoseLandmark = { x: 1, y: 0, z: 0 };
    const c: PoseLandmark = { x: 2, y: 0, z: 0 };

    const angle = (detector as any).calculateAngle(a, b, c);

    expect(angle).toBeCloseTo(180, 0);
  });

  it('should calculate 45 degree angle correctly', () => {
    const detector = new PoseDetector();

    // Create three points forming a 45 degree angle
    const a: PoseLandmark = { x: 0, y: 0, z: 0 };
    const b: PoseLandmark = { x: 1, y: 0, z: 0 };
    const c: PoseLandmark = { x: 1, y: 1, z: 0 };

    const angle = (detector as any).calculateAngle(a, b, c);

    expect(angle).toBeGreaterThan(0);
    expect(angle).toBeLessThan(180);
  });
});
