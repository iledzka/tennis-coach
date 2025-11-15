import { Stack } from 'expo-router';
import { fbs } from 'fbtee';
import { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';

interface PoseAnalysis {
  balanceScore: number;
  fps: number;
  hipAlignment: number;
  kneeFlexion: number;
  racketPosition: string;
  shoulderAlignment: number;
  suggestions: Array<string>;
}

export default function PoseDetectionWebViewScreen() {
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [analysis, setAnalysis] = useState<PoseAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log(event);
      if (data.type === 'analysis') {
        setAnalysis(data.payload);
      } else if (data.type === 'error') {
        setError(data.message);
      } else if (data.type === 'ready') {
        setIsLoading(false);
      }
    } catch (error_) {
      console.error('Failed to parse WebView message:', error_);
    }
  };

  // HTML content with MediaPipe pose detection
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            background: #000;
            overflow: hidden;
            width: 100vw;
            height: 100vh;
        }
        #container {
            position: relative;
            width: 100%;
            height: 100%;
        }
        #video {
            position: absolute;
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        #canvas {
            position: absolute;
            width: 100%;
            height: 100%;
            pointer-events: none;
        }
        #status {
            position: absolute;
            top: 20px;
            left: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px;
            border-radius: 5px;
            font-family: Arial, sans-serif;
            font-size: 14px;
            z-index: 10;
        }
    </style>
</head>
<body>
    <div id="container">
        <video id="video" autoplay playsinline></video>
        <canvas id="canvas"></canvas>
        <div id="status">Initializing...</div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.js"></script>
    
    <script>
        let poseLandmarker;
        let video;
        let canvas;
        let ctx;
        let isDetecting = false;
        let animationFrameId;
        let lastFrameTime = 0;
        let fpsCounter = [];

        function sendMessage(type, payload) {
            if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type, payload }));
            }
        }

        function updateStatus(message) {
            document.getElementById('status').textContent = message;
        }

        async function init() {
            try {
                video = document.getElementById('video');
                canvas = document.getElementById('canvas');
                ctx = canvas.getContext('2d');

                updateStatus('Loading MediaPipe...');

                await new Promise(resolve => {
                    if (window.vision) {
                        resolve();
                    } else {
                        const checkInterval = setInterval(() => {
                            if (window.vision) {
                                clearInterval(checkInterval);
                                resolve();
                            }
                        }, 100);
                    }
                });

                const vision = await window.vision.FilesetResolver.forVisionTasks(
                    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
                );

                poseLandmarker = await window.vision.PoseLandmarker.createFromOptions(vision, {
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

                updateStatus('Starting camera...');
                await startCamera();
                
                sendMessage('ready', {});
                updateStatus('Detecting pose...');
                
                startDetection();

            } catch (error) {
                console.error('Initialization error:', error);
                updateStatus('Error: ' + error.message);
                sendMessage('error', { message: error.message });
            }
        }

        async function startCamera() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { 
                        facingMode: 'user',
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    }
                });
                video.srcObject = stream;
                
                await new Promise((resolve) => {
                    video.onloadedmetadata = () => {
                        video.play();
                        
                        // Set canvas size to match video
                        canvas.width = video.videoWidth;
                        canvas.height = video.videoHeight;
                        
                        resolve();
                    };
                });
                
                await new Promise(resolve => setTimeout(resolve, 500));
                
            } catch (error) {
                throw new Error('Camera access denied: ' + error.message);
            }
        }

        function startDetection() {
            isDetecting = true;
            detectPose();
        }

        function detectPose() {
            if (!isDetecting) return;

            const now = performance.now();

            try {
                if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
                    animationFrameId = requestAnimationFrame(detectPose);
                    return;
                }

                const result = poseLandmarker.detectForVideo(video, now);

                ctx.clearRect(0, 0, canvas.width, canvas.height);

                if (result.landmarks && result.landmarks.length > 0) {
                    const landmarks = result.landmarks[0];

                    drawLandmarks(landmarks);
                    const analysis = analyzeTennisPosture(landmarks);
                    
                    // Calculate FPS
                    const deltaTime = now - lastFrameTime;
                    if (deltaTime > 0) {
                        fpsCounter.push(1000 / deltaTime);
                        if (fpsCounter.length > 30) fpsCounter.shift();
                        const avgFps = fpsCounter.reduce((a, b) => a + b, 0) / fpsCounter.length;
                        analysis.fps = Math.round(avgFps);
                    }
                    lastFrameTime = now;

                    sendMessage('analysis', analysis);
                }

            } catch (error) {
                console.error('Detection error:', error);
                sendMessage('error', { message: error.message });
            }

            animationFrameId = requestAnimationFrame(detectPose);
        }

        function drawLandmarks(landmarks) {
            const connections = [
                [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
                [11, 23], [12, 24], [23, 24],
                [23, 25], [25, 27], [24, 26], [26, 28]
            ];

            ctx.strokeStyle = '#00FF00';
            ctx.lineWidth = 3;

            connections.forEach(([start, end]) => {
                if (landmarks[start] && landmarks[end]) {
                    ctx.beginPath();
                    ctx.moveTo(landmarks[start].x * canvas.width, landmarks[start].y * canvas.height);
                    ctx.lineTo(landmarks[end].x * canvas.width, landmarks[end].y * canvas.height);
                    ctx.stroke();
                }
            });

            ctx.fillStyle = '#FF0000';
            landmarks.forEach(landmark => {
                ctx.beginPath();
                ctx.arc(landmark.x * canvas.width, landmark.y * canvas.height, 6, 0, 2 * Math.PI);
                ctx.fill();
            });
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

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: String(fbs('Pose Detection', 'Pose detection screen title')),
        }}
      />
      <View style={styles.container}>
        <WebView
          allowsInlineMediaPlayback={true}
          domStorageEnabled={true}
          javaScriptEnabled={true}
          mediaPlaybackRequiresUserAction={false}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('WebView error:', nativeEvent);
            setError('WebView failed to load');
          }}
          onMessage={handleMessage}
          ref={webViewRef}
          source={{ html: htmlContent }}
          startInLoadingState={false}
          style={styles.webview}
        />

        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color="#00ff00" size="large" />
            <Text style={styles.loadingText}>
              <fbt desc="Loading message">Loading MediaPipe...</fbt>
            </Text>
          </View>
        )}

        {error && (
          <View style={styles.errorOverlay}>
            <Text style={styles.errorText}>❌ {error}</Text>
          </View>
        )}

        {analysis && !isLoading && (
          <View style={styles.analysisOverlay}>
            <View style={styles.analysisPanel}>
              <Text style={styles.analysisTitle}>
                <fbt desc="Analysis title">Tennis Posture Analysis</fbt>
              </Text>

              <View style={styles.metricsGrid}>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>
                    <fbt desc="FPS label">FPS</fbt>
                  </Text>
                  <Text style={styles.metricValue}>{analysis.fps}</Text>
                </View>

                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>
                    <fbt desc="Shoulder label">Shoulder</fbt>
                  </Text>
                  <Text
                    style={[
                      styles.metricValue,
                      getScoreColor(analysis.shoulderAlignment),
                    ]}
                  >
                    {analysis.shoulderAlignment}%
                  </Text>
                </View>

                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>
                    <fbt desc="Hip label">Hip</fbt>
                  </Text>
                  <Text
                    style={[
                      styles.metricValue,
                      getScoreColor(analysis.hipAlignment),
                    ]}
                  >
                    {analysis.hipAlignment}%
                  </Text>
                </View>

                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>
                    <fbt desc="Knee label">Knee</fbt>
                  </Text>
                  <Text
                    style={[
                      styles.metricValue,
                      getScoreColor(analysis.kneeFlexion),
                    ]}
                  >
                    {analysis.kneeFlexion}%
                  </Text>
                </View>

                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>
                    <fbt desc="Balance label">Balance</fbt>
                  </Text>
                  <Text
                    style={[
                      styles.metricValue,
                      getScoreColor(analysis.balanceScore),
                    ]}
                  >
                    {analysis.balanceScore}%
                  </Text>
                </View>

                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>
                    <fbt desc="Position label">Position</fbt>
                  </Text>
                  <Text style={styles.metricValue}>
                    {analysis.racketPosition}
                  </Text>
                </View>
              </View>

              <View style={styles.suggestions}>
                <Text style={styles.suggestionsTitle}>
                  <fbt desc="Suggestions title">Coaching Tips</fbt>
                </Text>
                {analysis.suggestions.map((suggestion, index) => (
                  <Text key={index} style={styles.suggestionText}>
                    • {suggestion}
                  </Text>
                ))}
              </View>
            </View>
          </View>
        )}
      </View>
    </>
  );
}

function getScoreColor(score: number) {
  if (score >= 80) {
    return { color: '#00FF00' };
  }
  if (score >= 60) {
    return { color: '#FFFF00' };
  }
  return { color: '#FF0000' };
}

const styles = StyleSheet.create({
  analysisOverlay: {
    left: 16,
    position: 'absolute',
    right: 16,
    top: 60,
  },
  analysisPanel: {
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: 12,
    padding: 16,
  },
  analysisTitle: {
    color: '#00FF00',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  container: {
    backgroundColor: '#000',
    flex: 1,
  },
  errorOverlay: {
    backgroundColor: 'rgba(255, 0, 0, 0.9)',
    borderRadius: 8,
    left: 20,
    padding: 16,
    position: 'absolute',
    right: 20,
    top: 20,
  },
  errorText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
  loadingOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
  },
  metric: {
    marginBottom: 12,
    width: '30%',
  },
  metricLabel: {
    color: '#aaa',
    fontSize: 11,
    marginBottom: 4,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  suggestions: {
    borderTopColor: '#333',
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 12,
  },
  suggestionsTitle: {
    color: '#00FF00',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  suggestionText: {
    color: '#fff',
    fontSize: 12,
    marginBottom: 4,
  },
  webview: {
    backgroundColor: '#000',
    flex: 1,
  },
});
