import { Stack } from 'expo-router';
import { fbs } from 'fbtee';
import { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';

interface PoseAnalysis {
  shoulderAlignment: number;
  hipAlignment: number;
  kneeFlexion: number;
  balanceScore: number;
  racketPosition: string;
  suggestions: string[];
  fps: number;
}

export default function PoseDetectionSimpleScreen() {
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [analysis, setAnalysis] = useState<PoseAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    console.log('📝', message);
    setLogs(prev => [...prev.slice(-10), `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      switch (data.type) {
        case 'analysis':
          setAnalysis(data.payload);
          break;
        case 'error':
          addLog(`Error: ${data.payload?.message || data.message}`);
          setError(data.payload?.message || data.message);
          setIsLoading(false);
          break;
        case 'ready':
          addLog('WebView ready!');
          setIsLoading(false);
          break;
        case 'log':
          addLog(`WebView: ${data.payload?.message || data.message}`);
          break;
      }
    } catch (err) {
      addLog(`Parse error: ${err}`);
    }
  };

  // Use a working CDN URL that we know loads properly
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #000; overflow: hidden; }
        #container { position: relative; width: 100vw; height: 100vh; }
        #video { position: absolute; width: 100%; height: 100%; object-fit: cover; }
        #canvas { position: absolute; width: 100%; height: 100%; pointer-events: none; }
        #status {
            position: absolute; top: 20px; left: 20px; right: 20px;
            background: rgba(0, 0, 0, 0.8); color: white; padding: 10px;
            border-radius: 5px; font-family: Arial, sans-serif; font-size: 14px;
        }
    </style>
</head>
<body>
    <div id="container">
        <video id="video" autoplay playsinline></video>
        <canvas id="canvas"></canvas>
        <div id="status">Initializing...</div>
    </div>

    <script type="module">
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
            console.log(msg);
            sendMessage('log', { message: msg });
        }

        function updateStatus(msg) {
            document.getElementById('status').textContent = msg;
            log(msg);
        }

        let video, canvas, ctx;
        let isDetecting = false;
        let animationFrameId;
        let lastFrameTime = 0;
        let fpsCounter = [];

        async function init() {
            try {
                log('Starting initialization');
                
                video = document.getElementById('video');
                canvas = document.getElementById('canvas');
                ctx = canvas.getContext('2d');

                updateStatus('Loading MediaPipe...');

                // Import MediaPipe using ES modules
                const { PoseLandmarker, FilesetResolver } = await import(
                    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14'
                );

                log('MediaPipe module imported');
                updateStatus('Initializing pose detector...');

                const vision = await FilesetResolver.forVisionTasks(
                    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
                );

                log('FilesetResolver created');

                const poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
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

                log('PoseLandmarker created');
                updateStatus('Starting camera...');

                await startCamera();
                
                log('Camera started');
                sendMessage('ready', {});
                updateStatus('Detecting pose...');
                
                startDetection(poseLandmarker);

            } catch (error) {
                log('Init error: ' + error.message);
                sendMessage('error', { message: 'Init error: ' + error.message });
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
                        canvas.width = video.videoWidth;
                        canvas.height = video.videoHeight;
                        resolve();
                    };
                });
                
                await new Promise(r => setTimeout(r, 500));
                
            } catch (error) {
                throw new Error('Camera error: ' + error.message);
            }
        }

        function startDetection(poseLandmarker) {
            isDetecting = true;
            
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
                    log('Detection error: ' + error.message);
                }

                animationFrameId = requestAnimationFrame(detectPose);
            }
            
            detectPose();
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
          title: String(fbs('Pose Detection (Simple)', 'Simple pose detection screen title')),
          headerShown: true,
        }}
      />
      <View style={styles.container}>
        <WebView
          ref={webViewRef}
          source={{ html: htmlContent }}
          style={styles.webview}
          onMessage={handleMessage}
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback={true}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={false}
          allowsProtectedMedia={true}
          mediaCapturePermissionGrantType="grant"
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            addLog(`WebView error: ${JSON.stringify(nativeEvent)}`);
            setError('WebView failed to load');
          }}
          onLoadStart={() => addLog('WebView loading started')}
          onLoadEnd={() => addLog('WebView loading completed')}
          onPermissionRequest={(request) => {
            addLog(`Permission requested: ${request.nativeEvent.resources.join(', ')}`);
            request.nativeEvent.resources.forEach((resource) => {
              if (resource === 'camera' || resource === 'microphone') {
                request.nativeEvent.grant(request.nativeEvent.resources);
              }
            });
          }}
        />

        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#00ff00" />
            <Text style={styles.loadingText}>Loading MediaPipe...</Text>
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
                <Text style={styles.suggestionsTitle}>Tips</Text>
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
          <Text style={styles.debugTitle}>Debug Logs:</Text>
          {logs.map((log, index) => (
            <Text key={index} style={styles.debugText}>{log}</Text>
          ))}
        </View>
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
  webview: {
    flex: 1,
    backgroundColor: '#000',
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
  errorOverlay: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 0, 0, 0.9)',
    padding: 16,
    borderRadius: 8,
  },
  errorText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
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
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#00FF00',
    marginBottom: 8,
  },
  suggestionText: {
    fontSize: 12,
    color: '#fff',
    marginBottom: 4,
  },
  debugPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    padding: 10,
    maxHeight: 150,
  },
  debugTitle: {
    color: '#00ff00',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  debugText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: 'monospace',
  },
});
