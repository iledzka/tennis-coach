import { Stack } from 'expo-router';
import { fbs } from 'fbtee';
import * as ImagePicker from 'expo-image-picker';
import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';

interface FrameAnalysis {
  frameNumber: number;
  timestamp: number;
  shoulderAlignment: number;
  hipAlignment: number;
  kneeFlexion: number;
  balanceScore: number;
  racketPosition: string;
  suggestions: string[];
}

interface VideoAnalysisResult {
  totalFrames: number;
  duration: number;
  averageScores: {
    shoulder: number;
    hip: number;
    knee: number;
    balance: number;
  };
  frames: FrameAnalysis[];
  commonIssues: string[];
}

export default function VideoAnalysisScreen() {
  const webViewRef = useRef<WebView>(null);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<VideoAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pickVideo = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant media library access to upload videos.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        setVideoUri(result.assets[0].uri);
        setResult(null);
        setError(null);
        setProgress(0);
      }
    } catch (err) {
      console.error('Error picking video:', err);
      setError('Failed to pick video');
    }
  };

  const analyzeVideo = () => {
    if (!videoUri) return;

    setIsAnalyzing(true);
    setProgress(0);
    setError(null);

    // Send message to WebView to start analysis
    webViewRef.current?.postMessage(JSON.stringify({
      type: 'analyzeVideo',
      videoUri: videoUri,
    }));
  };

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      switch (data.type) {
        case 'progress':
          setProgress(data.progress);
          break;
          
        case 'result':
          setResult(data.payload);
          setIsAnalyzing(false);
          break;
          
        case 'error':
          setError(data.message);
          setIsAnalyzing(false);
          break;
          
        case 'ready':
          console.log('WebView ready');
          break;
      }
    } catch (err) {
      console.error('Failed to parse WebView message:', err);
    }
  };

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { margin: 0; padding: 0; background: #000; }
        #container { position: relative; width: 100vw; height: 100vh; }
        #video { display: none; }
        #canvas { display: none; }
    </style>
</head>
<body>
    <div id="container">
        <video id="video" crossorigin="anonymous"></video>
        <canvas id="canvas"></canvas>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.js"></script>
    
    <script>
        let poseLandmarker;
        let video;
        let canvas;
        let ctx;

        function sendMessage(type, payload) {
            if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type, payload }));
            }
        }

        async function init() {
            try {
                video = document.getElementById('video');
                canvas = document.getElementById('canvas');
                ctx = canvas.getContext('2d');

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

                sendMessage('ready', {});

            } catch (error) {
                console.error('Initialization error:', error);
                sendMessage('error', { message: error.message });
            }
        }

        window.addEventListener('message', async (event) => {
            try {
                const data = JSON.parse(event.data);
                
                if (data.type === 'analyzeVideo') {
                    await analyzeVideo(data.videoUri);
                }
            } catch (error) {
                console.error('Message handler error:', error);
                sendMessage('error', { message: error.message });
            }
        });

        async function analyzeVideo(videoUri) {
            try {
                video.src = videoUri;
                
                await new Promise((resolve, reject) => {
                    video.onloadedmetadata = resolve;
                    video.onerror = reject;
                });

                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;

                const duration = video.duration;
                const frameRate = 10; // Analyze 10 frames per second
                const frameInterval = 1 / frameRate;
                const totalFrames = Math.floor(duration * frameRate);
                
                const frames = [];
                let frameNumber = 0;

                for (let time = 0; time < duration; time += frameInterval) {
                    video.currentTime = time;
                    
                    await new Promise(resolve => {
                        video.onseeked = resolve;
                    });

                    // Small delay to ensure frame is ready
                    await new Promise(resolve => setTimeout(resolve, 50));

                    const result = poseLandmarker.detectForVideo(video, time * 1000);

                    if (result.landmarks && result.landmarks.length > 0) {
                        const landmarks = result.landmarks[0];
                        const analysis = analyzeTennisPosture(landmarks);
                        
                        frames.push({
                            frameNumber: frameNumber,
                            timestamp: time,
                            ...analysis
                        });
                    }

                    frameNumber++;
                    const progress = Math.round((frameNumber / totalFrames) * 100);
                    sendMessage('progress', { progress });
                }

                // Calculate summary
                const summary = calculateSummary(frames, duration);
                sendMessage('result', { payload: summary });

            } catch (error) {
                console.error('Analysis error:', error);
                sendMessage('error', { message: error.message });
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

        function calculateSummary(frames, duration) {
            if (frames.length === 0) {
                return {
                    totalFrames: 0,
                    duration: duration,
                    averageScores: { shoulder: 0, hip: 0, knee: 0, balance: 0 },
                    frames: [],
                    commonIssues: ['No pose detected in video']
                };
            }

            const avgShoulder = frames.reduce((sum, f) => sum + f.shoulderAlignment, 0) / frames.length;
            const avgHip = frames.reduce((sum, f) => sum + f.hipAlignment, 0) / frames.length;
            const avgKnee = frames.reduce((sum, f) => sum + f.kneeFlexion, 0) / frames.length;
            const avgBalance = frames.reduce((sum, f) => sum + f.balanceScore, 0) / frames.length;

            // Find common issues
            const issueCount = {};
            frames.forEach(frame => {
                frame.suggestions.forEach(suggestion => {
                    issueCount[suggestion] = (issueCount[suggestion] || 0) + 1;
                });
            });

            const commonIssues = Object.entries(issueCount)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([issue, count]) => \`\${issue} (\${Math.round(count / frames.length * 100)}% of frames)\`);

            return {
                totalFrames: frames.length,
                duration: duration,
                averageScores: {
                    shoulder: Math.round(avgShoulder),
                    hip: Math.round(avgHip),
                    knee: Math.round(avgKnee),
                    balance: Math.round(avgBalance)
                },
                frames: frames,
                commonIssues: commonIssues.length > 0 ? commonIssues : ['Good form overall!']
            };
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
          title: String(fbs('Video Analysis', 'Video analysis screen title')),
          headerShown: true,
        }}
      />
      <View style={styles.container}>
        <WebView
          ref={webViewRef}
          source={{ html: htmlContent }}
          style={styles.webview}
          onMessage={handleMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowFileAccess={true}
          allowUniversalAccessFromFileURLs={true}
          mixedContentMode="always"
        />

        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={pickVideo}
            disabled={isAnalyzing}
          >
            <Text style={styles.buttonText}>
              {videoUri ? (
                <fbt desc="Change video button">Change Video</fbt>
              ) : (
                <fbt desc="Upload video button">Upload Video</fbt>
              )}
            </Text>
          </TouchableOpacity>

          {videoUri && !isAnalyzing && !result && (
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={analyzeVideo}
            >
              <Text style={styles.buttonText}>
                <fbt desc="Analyze button">Analyze Video</fbt>
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {isAnalyzing && (
          <View style={styles.progressOverlay}>
            <View style={styles.progressCard}>
              <ActivityIndicator size="large" color="#00ff00" />
              <Text style={styles.progressText}>
                <fbt desc="Analyzing message">Analyzing video...</fbt>
              </Text>
              <Text style={styles.progressPercent}>{progress}%</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
              </View>
            </View>
          </View>
        )}

        {error && (
          <View style={styles.errorOverlay}>
            <Text style={styles.errorText}>❌ {error}</Text>
          </View>
        )}

        {result && !isAnalyzing && (
          <ScrollView style={styles.resultsOverlay}>
            <View style={styles.resultsCard}>
              <Text style={styles.resultsTitle}>
                <fbt desc="Analysis results title">Analysis Results</fbt>
              </Text>

              <View style={styles.summarySection}>
                <Text style={styles.sectionTitle}>
                  <fbt desc="Summary section">Summary</fbt>
                </Text>
                <Text style={styles.summaryText}>
                  Duration: {result.duration.toFixed(1)}s
                </Text>
                <Text style={styles.summaryText}>
                  Frames Analyzed: {result.totalFrames}
                </Text>
              </View>

              <View style={styles.scoresSection}>
                <Text style={styles.sectionTitle}>
                  <fbt desc="Average scores section">Average Scores</fbt>
                </Text>
                
                <View style={styles.scoreRow}>
                  <Text style={styles.scoreLabel}>Shoulder Alignment:</Text>
                  <Text style={[styles.scoreValue, getScoreColor(result.averageScores.shoulder)]}>
                    {result.averageScores.shoulder}%
                  </Text>
                </View>

                <View style={styles.scoreRow}>
                  <Text style={styles.scoreLabel}>Hip Alignment:</Text>
                  <Text style={[styles.scoreValue, getScoreColor(result.averageScores.hip)]}>
                    {result.averageScores.hip}%
                  </Text>
                </View>

                <View style={styles.scoreRow}>
                  <Text style={styles.scoreLabel}>Knee Flexion:</Text>
                  <Text style={[styles.scoreValue, getScoreColor(result.averageScores.knee)]}>
                    {result.averageScores.knee}%
                  </Text>
                </View>

                <View style={styles.scoreRow}>
                  <Text style={styles.scoreLabel}>Balance:</Text>
                  <Text style={[styles.scoreValue, getScoreColor(result.averageScores.balance)]}>
                    {result.averageScores.balance}%
                  </Text>
                </View>
              </View>

              <View style={styles.issuesSection}>
                <Text style={styles.sectionTitle}>
                  <fbt desc="Common issues section">Common Issues</fbt>
                </Text>
                {result.commonIssues.map((issue, index) => (
                  <Text key={index} style={styles.issueText}>
                    • {issue}
                  </Text>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.button, styles.primaryButton, styles.newAnalysisButton]}
                onPress={() => {
                  setResult(null);
                  setVideoUri(null);
                }}
              >
                <Text style={styles.buttonText}>
                  <fbt desc="New analysis button">Analyze Another Video</fbt>
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
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
    opacity: 0, // Hidden since we only use it for processing
  },
  controls: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 140,
  },
  primaryButton: {
    backgroundColor: '#00ff00',
  },
  secondaryButton: {
    backgroundColor: '#0088ff',
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  progressOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    minWidth: 250,
  },
  progressText: {
    color: '#fff',
    fontSize: 18,
    marginTop: 16,
    marginBottom: 8,
  },
  progressPercent: {
    color: '#00ff00',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00ff00',
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
  resultsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
  },
  resultsCard: {
    padding: 20,
  },
  resultsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00ff00',
    marginBottom: 20,
    textAlign: 'center',
  },
  summarySection: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00ff00',
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 4,
  },
  scoresSection: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  scoreLabel: {
    fontSize: 14,
    color: '#aaa',
  },
  scoreValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  issuesSection: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
  },
  issueText: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 8,
    lineHeight: 20,
  },
  newAnalysisButton: {
    marginTop: 10,
    alignSelf: 'center',
  },
});
