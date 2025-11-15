import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Stack } from 'expo-router';
import { fbs } from 'fbtee';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Button, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';

interface PoseAnalysis {
  shoulderAlignment: number;
  hipAlignment: number;
  kneeFlexion: number;
  balanceScore: number;
  racketPosition: string;
  suggestions: string[];
  fps: number;
}

export default function PoseDetectionHybridScreen() {
  const [facing, setFacing] = useState<CameraType>('front');
  const [permission, requestPermission] = useCameraPermissions();
  const [isDetecting, setIsDetecting] = useState(false);
  const [analysis, setAnalysis] = useState<PoseAnalysis | null>(null);
  const [isMediaPipeReady, setIsMediaPipeReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const webViewRef = useRef<WebView>(null);
  const cameraRef = useRef<CameraView>(null);
  const processingRef = useRef(false);

  const addLog = (message: string) => {
    console.log('📝', message);
    setLogs(prev => [...prev.slice(-5), `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    return () => {
      setIsDetecting(false);
    };
  }, []);

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      switch (data.type) {
        case 'ready':
          addLog('MediaPipe ready!');
          setIsMediaPipeReady(true);
          break;
        case 'analysis':
          if (isDetecting) {
            setAnalysis(data.payload);
          }
          processingRef.current = false; // Ready for next frame
          break;
        case 'error':
          addLog(`Error: ${data.payload?.message || data.message}`);
          setError(data.payload?.message || data.message);
          processingRef.current = false;
          break;
        case 'log':
          addLog(`WebView: ${data.payload?.message || data.message}`);
          break;
      }
    } catch (err) {
      addLog(`Parse error: ${err}`);
      processingRef.current = false;
    }
  };

  const captureAndProcess = async () => {
    if (!cameraRef.current || !isMediaPipeReady || processingRef.current || !isDetecting) {
      return;
    }

    try {
      processingRef.current = true;

      // Take a picture
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.5,
        base64: true,
        skipProcessing: true,
      });

      if (photo?.base64 && isDetecting) {
        // Send to WebView for processing
        webViewRef.current?.postMessage(JSON.stringify({
          type: 'processFrame',
          imageData: `data:image/jpeg;base64,${photo.base64}`,
          timestamp: Date.now(),
        }));
      } else {
        processingRef.current = false;
      }
    } catch (err) {
      addLog(`Capture error: ${err}`);
      processingRef.current = false;
    }
  };

  useEffect(() => {
    if (!isDetecting || !isMediaPipeReady) {
      processingRef.current = false;
      return;
    }

    const interval = setInterval(() => {
      captureAndProcess();
    }, 100); // 10 FPS

    return () => {
      clearInterval(interval);
      processingRef.current = false;
    };
  }, [isDetecting, isMediaPipeReady]);

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { margin: 0; padding: 0; background: #000; }
        #canvas { display: none; }
    </style>
</head>
<body>
    <canvas id="canvas"></canvas>

    <script type="module">
        let poseLandmarker;
        let canvas, ctx;
        let lastFrameTime = 0;
        let fpsCounter = [];

        function sendMessage(type, payload) {
            try {
                if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({ type, payload: payload || {} }));
                }
            } catch (e) {
                console.error('Send error:', e);
            }
        }

        function log(msg) {
            sendMessage('log', { message: msg });
        }

        async function init() {
            try {
                log('Initializing MediaPipe...');
                
                canvas = document.getElementById('canvas');
                ctx = canvas.getContext('2d');

                const { PoseLandmarker, FilesetResolver } = await import(
                    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14'
                );

                log('MediaPipe module imported');

                const vision = await FilesetResolver.forVisionTasks(
                    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
                );

                poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
                        delegate: 'GPU',
                    },
                    runningMode: 'IMAGE',
                    numPoses: 1,
                    minPoseDetectionConfidence: 0.5,
                    minPosePresenceConfidence: 0.5,
                    minTrackingConfidence: 0.5,
                });

                log('PoseLandmarker created');
                sendMessage('ready', {});

            } catch (error) {
                log('Init error: ' + error.message);
                sendMessage('error', { message: 'Init error: ' + error.message });
            }
        }

        window.addEventListener('message', async (event) => {
            try {
                const data = JSON.parse(event.data);
                
                if (data.type === 'processFrame') {
                    await processFrame(data.imageData, data.timestamp);
                }
            } catch (error) {
                sendMessage('error', { message: 'Message handler error: ' + error.message });
            }
        });

        async function processFrame(imageData, timestamp) {
            try {
                const img = new Image();
                img.onload = async () => {
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);

                    const result = poseLandmarker.detect(canvas);

                    if (result.landmarks && result.landmarks.length > 0) {
                        const landmarks = result.landmarks[0];
                        const analysis = analyzeTennisPosture(landmarks);
                        
                        const now = performance.now();
                        const deltaTime = now - lastFrameTime;
                        if (deltaTime > 0) {
                            fpsCounter.push(1000 / deltaTime);
                            if (fpsCounter.length > 30) fpsCounter.shift();
                            const avgFps = fpsCounter.reduce((a, b) => a + b, 0) / fpsCounter.length;
                            analysis.fps = Math.round(avgFps);
                        }
                        lastFrameTime = now;

                        sendMessage('analysis', analysis);
                    } else {
                        sendMessage('analysis', {
                            shoulderAlignment: 0,
                            hipAlignment: 0,
                            kneeFlexion: 0,
                            balanceScore: 0,
                            racketPosition: 'unknown',
                            suggestions: ['No pose detected'],
                            fps: 0
                        });
                    }
                };
                img.onerror = () => {
                    sendMessage('error', { message: 'Failed to load image' });
                };
                img.src = imageData;

            } catch (error) {
                sendMessage('error', { message: 'Process error: ' + error.message });
            }
        }

        function analyzeTennisPosture(landmarks) {
            const shoulderDiff = Math.abs(landmarks[11].y - landmarks[12].y);
            const shoulderAlignment = Math.max(0, 100 - shoulderDiff * 500);

            const hipDiff = Math.abs(landmarks[23].y - landmarks[24].y);
            const hipAlignment = Math.max(0, 100 - hipDiff * 500);

            const leftKneeAngle = calculateAngle(landmarks[23], landmarks[25], landmarks[27]);
            const rightKneeAngle = calculateAngle(landmarks[24], landmarks[26], landmarks[28]);
            const avgKneeAngle = (leftKneeAngle + rightKneeAngle) / 2;
            const kneeFlexion = 100 - Math.abs(150 - avgKneeAngle) * 2;

            const centerX = (landmarks[23].x + landmarks[24].x) / 2;
            const feetCenterX = (landmarks[27].x + landmarks[28].x) / 2;
            const balanceOffset = Math.abs(centerX - feetCenterX);
            const balanceScore = Math.max(0, 100 - balanceOffset * 300);

            const avgWristY = (landmarks[15].y + landmarks[16].y) / 2;
            const avgShoulderY = (landmarks[11].y + landmarks[12].y) / 2;
            let racketPosition = 'unknown';
            if (avgWristY < avgShoulderY - 0.1) racketPosition = 'follow-through';
            else if (avgWristY > avgShoulderY + 0.15) racketPosition = 'backswing';
            else racketPosition = 'ready';

            const suggestions = [];
            if (shoulderAlignment < 70) suggestions.push('Keep shoulders level');
            if (hipAlignment < 70) suggestions.push('Align your hips');
            if (avgKneeAngle > 165) suggestions.push('Bend knees more');
            if (balanceScore < 70) suggestions.push('Center your weight');
            if (suggestions.length === 0) suggestions.push('Great form!');

            return {
                shoulderAlignment: Math.round(shoulderAlignment),
                hipAlignment: Math.round(hipAlignment),
                kneeFlexion: Math.round(kneeFlexion),
                balanceScore: Math.round(balanceScore),
                racketPosition,
                suggestions
            };
        }

        function calculateAngle(a, b, c) {
            const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
            let angle = Math.abs((radians * 180.0) / Math.PI);
            if (angle > 180.0) angle = 360 - angle;
            return angle;
        }

        init();
    </script>
</body>
</html>
  `;

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Camera permission required</Text>
        <Button onPress={requestPermission} title="Grant Permission" />
        <Text style={[styles.message, { marginTop: 20, fontSize: 12, color: '#888' }]}>
          Note: Camera doesn't work in iOS Simulator.{'\n'}
          Please test on a real device.
        </Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: String(fbs('Pose Detection (Hybrid)', 'Hybrid pose detection screen title')),
          headerShown: true,
        }}
      />
      <View style={styles.container}>
        <CameraView 
          ref={cameraRef} 
          style={styles.camera} 
          facing={facing}
          mode="picture"
        >
          <View style={styles.controls}>
            <TouchableOpacity style={styles.button} onPress={toggleCameraFacing}>
              <Text style={styles.text}>Flip</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, isDetecting && styles.buttonActive]}
              onPress={() => {
                const newState = !isDetecting;
                setIsDetecting(newState);
                if (!newState) {
                  // Stopping - clear analysis
                  setAnalysis(null);
                  processingRef.current = false;
                  addLog('Detection stopped');
                }
              }}
              disabled={!isMediaPipeReady}
            >
              <Text style={styles.text}>
                {isDetecting ? 'Stop' : 'Start'}
              </Text>
            </TouchableOpacity>
          </View>

          {!isMediaPipeReady && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#00ff00" />
              <Text style={styles.loadingText}>Loading MediaPipe...</Text>
            </View>
          )}

          {analysis && isDetecting && (
            <View style={styles.analysisOverlay}>
              <View style={styles.analysisPanel}>
                <Text style={styles.analysisTitle}>Analysis</Text>
                
                <View style={styles.metricsGrid}>
                  <View style={styles.metric}>
                    <Text style={styles.metricLabel}>FPS</Text>
                    <Text style={styles.metricValue}>{analysis.fps}</Text>
                  </View>

                  <View style={styles.metric}>
                    <Text style={styles.metricLabel}>Shoulder</Text>
                    <Text style={[styles.metricValue, getScoreColor(analysis.shoulderAlignment)]}>
                      {analysis.shoulderAlignment}%
                    </Text>
                  </View>

                  <View style={styles.metric}>
                    <Text style={styles.metricLabel}>Hip</Text>
                    <Text style={[styles.metricValue, getScoreColor(analysis.hipAlignment)]}>
                      {analysis.hipAlignment}%
                    </Text>
                  </View>

                  <View style={styles.metric}>
                    <Text style={styles.metricLabel}>Knee</Text>
                    <Text style={[styles.metricValue, getScoreColor(analysis.kneeFlexion)]}>
                      {analysis.kneeFlexion}%
                    </Text>
                  </View>

                  <View style={styles.metric}>
                    <Text style={styles.metricLabel}>Balance</Text>
                    <Text style={[styles.metricValue, getScoreColor(analysis.balanceScore)]}>
                      {analysis.balanceScore}%
                    </Text>
                  </View>

                  <View style={styles.metric}>
                    <Text style={styles.metricLabel}>Position</Text>
                    <Text style={styles.metricValue}>{analysis.racketPosition}</Text>
                  </View>
                </View>

                <View style={styles.suggestions}>
                  {analysis.suggestions.map((suggestion, index) => (
                    <Text key={index} style={styles.suggestionText}>
                      • {suggestion}
                    </Text>
                  ))}
                </View>
              </View>
            </View>
          )}

          <View style={styles.debugPanel}>
            <Text style={styles.debugTitle}>Status:</Text>
            {logs.map((log, index) => (
              <Text key={index} style={styles.debugText}>{log}</Text>
            ))}
          </View>
        </CameraView>

        {/* Hidden WebView for MediaPipe processing */}
        <WebView
          ref={webViewRef}
          source={{ html: htmlContent }}
          style={styles.hiddenWebview}
          onMessage={handleMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
        />
      </View>
    </>
  );
}

function getScoreColor(score: number) {
  if (score >= 80) return { color: '#00FF00' };
  if (score >= 60) return { color: '#FFFF00' };
  return { color: '#FF0000' };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  message: {
    textAlign: 'center',
    paddingBottom: 10,
    color: '#fff',
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
    backgroundColor: 'rgba(0, 255, 0, 0.6)',
  },
  text: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
  },
  analysisOverlay: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
  },
  analysisPanel: {
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: 12,
    padding: 16,
  },
  analysisTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00FF00',
    marginBottom: 12,
    textAlign: 'center',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metric: {
    width: '30%',
    marginBottom: 12,
  },
  metricLabel: {
    fontSize: 11,
    color: '#aaa',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  suggestions: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  suggestionText: {
    fontSize: 12,
    color: '#fff',
    marginBottom: 4,
  },
  debugPanel: {
    position: 'absolute',
    bottom: 80,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 8,
    borderRadius: 5,
  },
  debugTitle: {
    color: '#00ff00',
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  debugText: {
    color: '#fff',
    fontSize: 9,
    fontFamily: 'monospace',
  },
  hiddenWebview: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
});
