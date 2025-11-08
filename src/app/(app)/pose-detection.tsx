import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useEffect, useRef, useState } from 'react';
import { Button, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PoseDetector, TennisPostureAnalysis, POSE_CONNECTIONS } from '../../lib/mediapipe/PoseDetector';

export default function PoseDetectionScreen() {
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [isDetecting, setIsDetecting] = useState(false);
  const [analysis, setAnalysis] = useState<TennisPostureAnalysis | null>(null);
  const [fps, setFps] = useState(0);

  const poseDetectorRef = useRef<PoseDetector | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const fpsCounterRef = useRef<number[]>([]);

  useEffect(() => {
    initializePoseDetector();

    return () => {
      cleanup();
    };
  }, []);

  const initializePoseDetector = async () => {
    try {
      const detector = new PoseDetector();
      await detector.initialize();
      poseDetectorRef.current = detector;
      console.log('PoseDetector initialized successfully');
    } catch (error) {
      console.error('Failed to initialize PoseDetector:', error);
    }
  };

  const cleanup = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (poseDetectorRef.current) {
      poseDetectorRef.current.dispose();
    }
  };

  const startDetection = async () => {
    if (!poseDetectorRef.current) {
      console.error('PoseDetector not initialized');
      return;
    }

    setIsDetecting(true);
    detectPose();
  };

  const stopDetection = () => {
    setIsDetecting(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  };

  const detectPose = async () => {
    if (!isDetecting || !poseDetectorRef.current || !videoRef.current || !canvasRef.current) {
      return;
    }

    const now = performance.now();
    const detector = poseDetectorRef.current;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    try {
      // Detect pose
      const result = await detector.detectPose(video, now);

      if (result && result.landmarks.length > 0) {
        const landmarks = result.landmarks[0];

        // Analyze tennis posture
        const postureAnalysis = detector.analyzeTennisPosture(landmarks);
        setAnalysis(postureAnalysis);

        // Draw landmarks on canvas
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          detector.drawLandmarks(canvas, landmarks, POSE_CONNECTIONS);
        }
      }

      // Calculate FPS
      const deltaTime = now - lastFrameTimeRef.current;
      if (deltaTime > 0) {
        fpsCounterRef.current.push(1000 / deltaTime);
        if (fpsCounterRef.current.length > 30) {
          fpsCounterRef.current.shift();
        }
        const avgFps = fpsCounterRef.current.reduce((a, b) => a + b, 0) / fpsCounterRef.current.length;
        setFps(Math.round(avgFps));
      }
      lastFrameTimeRef.current = now;

    } catch (error) {
      console.error('Pose detection error:', error);
    }

    // Continue detection loop
    animationFrameRef.current = requestAnimationFrame(detectPose);
  };

  const toggleCameraFacing = () => {
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  };

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to show the camera</Text>
        <Button onPress={requestPermission} title="Grant Permission" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing={facing}>
        <View style={styles.overlay}>
          <canvas
            ref={canvasRef}
            style={styles.canvas}
            width={640}
            height={480}
          />
        </View>

        <View style={styles.controls}>
          <TouchableOpacity style={styles.button} onPress={toggleCameraFacing}>
            <Text style={styles.text}>Flip Camera</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, isDetecting && styles.buttonActive]}
            onPress={isDetecting ? stopDetection : startDetection}
          >
            <Text style={styles.text}>
              {isDetecting ? 'Stop Detection' : 'Start Detection'}
            </Text>
          </TouchableOpacity>
        </View>

        {isDetecting && analysis && (
          <View style={styles.analysisPanel}>
            <Text style={styles.analysisTitle}>Tennis Posture Analysis</Text>
            <Text style={styles.analysisFps}>FPS: {fps}</Text>
            
            <View style={styles.scoreRow}>
              <Text style={styles.scoreLabel}>Shoulder Alignment:</Text>
              <Text style={[styles.scoreValue, getScoreColor(analysis.shoulderAlignment)]}>
                {analysis.shoulderAlignment}%
              </Text>
            </View>

            <View style={styles.scoreRow}>
              <Text style={styles.scoreLabel}>Hip Alignment:</Text>
              <Text style={[styles.scoreValue, getScoreColor(analysis.hipAlignment)]}>
                {analysis.hipAlignment}%
              </Text>
            </View>

            <View style={styles.scoreRow}>
              <Text style={styles.scoreLabel}>Knee Flexion:</Text>
              <Text style={[styles.scoreValue, getScoreColor(analysis.kneeFlexion)]}>
                {analysis.kneeFlexion}%
              </Text>
            </View>

            <View style={styles.scoreRow}>
              <Text style={styles.scoreLabel}>Balance:</Text>
              <Text style={[styles.scoreValue, getScoreColor(analysis.balanceScore)]}>
                {analysis.balanceScore}%
              </Text>
            </View>

            <View style={styles.scoreRow}>
              <Text style={styles.scoreLabel}>Position:</Text>
              <Text style={styles.scoreValue}>{analysis.racketPosition}</Text>
            </View>

            <View style={styles.suggestions}>
              <Text style={styles.suggestionsTitle}>Suggestions:</Text>
              {analysis.suggestions.map((suggestion, index) => (
                <Text key={index} style={styles.suggestionText}>
                  • {suggestion}
                </Text>
              ))}
            </View>
          </View>
        )}
      </CameraView>
    </View>
  );
}

function getScoreColor(score: number): { color: string } {
  if (score >= 80) return { color: '#00FF00' };
  if (score >= 60) return { color: '#FFFF00' };
  return { color: '#FF0000' };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  message: {
    textAlign: 'center',
    paddingBottom: 10,
    color: '#fff',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  canvas: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  controls: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
  },
  button: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fff',
  },
  buttonActive: {
    backgroundColor: 'rgba(255, 0, 0, 0.6)',
  },
  text: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  analysisPanel: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 16,
    borderRadius: 12,
  },
  analysisTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  analysisFps: {
    fontSize: 12,
    color: '#aaa',
    marginBottom: 12,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  scoreLabel: {
    fontSize: 14,
    color: '#fff',
  },
  scoreValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  suggestions: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#444',
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 6,
  },
  suggestionText: {
    fontSize: 12,
    color: '#fff',
    marginBottom: 4,
  },
});
