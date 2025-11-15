# Fix: "Failed to load MediaPipe script"

Your logs show the MediaPipe script is failing to load from the CDN. This is a network/CORS issue.

## The Problem

```
LOG  📝 Received: {"type":"error","payload":{"message":"Failed to load MediaPipe script"}}
```

This means the WebView cannot download the MediaPipe library from the CDN.

## Quick Fixes

### Fix 1: Allow HTTP/HTTPS Loading (iOS)

iOS blocks non-HTTPS content by default. You need to allow it.

#### Step 1: Run prebuild to generate iOS folder

```bash
pnpm prebuild
```

#### Step 2: Edit Info.plist

Open `ios/tenniscoach/Info.plist` (or similar path) and add:

```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <true/>
    <key>NSAllowsArbitraryLoadsInWebContent</key>
    <true/>
</dict>
```

#### Step 3: Rebuild

```bash
cd ios && pod install && cd ..
pnpm ios
```

### Fix 2: Allow HTTP/HTTPS Loading (Android)

#### Step 1: Edit AndroidManifest.xml

Open `android/app/src/main/AndroidManifest.xml` and add:

```xml
<application
    android:usesCleartextTraffic="true"
    android:networkSecurityConfig="@xml/network_security_config"
    ...>
```

#### Step 2: Create network_security_config.xml

Create `android/app/src/main/res/xml/network_security_config.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="true">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">cdn.jsdelivr.net</domain>
        <domain includeSubdomains="true">unpkg.com</domain>
        <domain includeSubdomains="true">storage.googleapis.com</domain>
    </domain-config>
</network-security-config>
```

#### Step 3: Rebuild

```bash
cd android && ./gradlew clean && cd ..
pnpm android
```

### Fix 3: Use app.json Configuration (Easier)

Add to your `app.json`:

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSAppTransportSecurity": {
          "NSAllowsArbitraryLoads": true,
          "NSAllowsArbitraryLoadsInWebContent": true
        }
      }
    },
    "android": {
      "usesCleartextTraffic": true
    }
  }
}
```

Then rebuild:

```bash
pnpm prebuild --clean
pnpm ios  # or pnpm android
```

### Fix 4: Check Internet Connection

Make sure you have a working internet connection:

```bash
# Test CDN access
curl -I https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.js

# Should return: HTTP/2 200
```

If this fails:
- Check WiFi/cellular connection
- Try different network
- Disable VPN
- Check firewall settings

### Fix 5: Use Updated Debug Version

I've updated the debug version to try multiple CDNs automatically:

1. jsdelivr.net (primary)
2. unpkg.com (fallback)
3. skypack.dev (fallback)

Pull latest changes:

```bash
git pull origin feature/mediapipe-pose-detection-poc
pnpm prebuild --clean
pnpm ios
```

## Verification

After applying fixes, you should see:

```
LOG  📝 Trying CDN: https://cdn.jsdelivr.net/...
LOG  📝 MediaPipe loaded from: https://cdn.jsdelivr.net/...
LOG  📝Init: MediaPipe script loaded
LOG  📝 WebView: Creating FilesetResolver
LOG  📝 WebView: Creating PoseLandmarker
LOG  📝 WebView ready!
```

## Still Not Working?

### Option 1: Test Network Access

Create a simple test:

```typescript
const testHtml = \`
<!DOCTYPE html>
<html>
<body>
  <h1>Network Test</h1>
  <div id="status">Testing...</div>
  <script>
    fetch('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.js')
      .then(r => {
        document.getElementById('status').textContent = 'CDN accessible! Status: ' + r.status;
        window.ReactNativeWebView.postMessage('SUCCESS');
      })
      .catch(e => {
        document.getElementById('status').textContent = 'CDN failed: ' + e.message;
        window.ReactNativeWebView.postMessage('FAILED: ' + e.message);
      });
  </script>
</body>
</html>
\`;

<WebView
  source={{ html: testHtml }}
  onMessage={(e) => console.log('Network test:', e.nativeEvent.data)}
/>
```

### Option 2: Bundle MediaPipe Locally

Download and bundle the files:

```bash
# Download MediaPipe files
mkdir -p assets/mediapipe
cd assets/mediapipe

# Download vision bundle
curl -O https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.js

# Download wasm files
mkdir wasm
cd wasm
curl -O https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm/vision_wasm_internal.js
curl -O https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm/vision_wasm_internal.wasm
curl -O https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm/vision_wasm_nosimd_internal.js
curl -O https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm/vision_wasm_nosimd_internal.wasm
```

Then update HTML to use local files:

```javascript
// Instead of CDN
<script src="file:///path/to/assets/mediapipe/vision_bundle.js"></script>
```

### Option 3: Use Alternative Approach

If CDN loading continues to fail, consider:

1. **TensorFlow.js** - Native React Native implementation
2. **Native MediaPipe** - Platform-specific modules
3. **Server-side processing** - Send video to server

## Common Causes

### iOS Simulator

iOS Simulator sometimes has network restrictions:
- Try on real device
- Check simulator network settings
- Reset simulator: Device > Erase All Content and Settings

### Corporate Network

If on corporate WiFi:
- CDN might be blocked
- Try cellular data
- Check with IT department

### VPN/Proxy

VPN can interfere:
- Disable VPN temporarily
- Check proxy settings
- Try different VPN server

### Firewall

Firewall might block CDN:
- Check firewall rules
- Whitelist CDN domains
- Try different network

## Expected Behavior

**Before fix:**
```
❌ Failed to load MediaPipe script
```

**After fix:**
```
✅ MediaPipe loaded from: https://cdn.jsdelivr.net/...
✅ Creating FilesetResolver
✅ Creating PoseLandmarker
✅ WebView ready!
```

## Summary

The issue is that WebView cannot load external scripts from CDN. This is usually due to:

1. **iOS App Transport Security** - Blocks non-HTTPS or arbitrary loads
2. **Android cleartext traffic** - Blocks HTTP by default
3. **Network issues** - No internet or CDN blocked
4. **CORS restrictions** - CDN not allowing WebView access

Apply **Fix 3** (app.json configuration) as it's the easiest and works for both platforms.

## Next Steps

1. Apply Fix 3 (app.json)
2. Run `pnpm prebuild --clean`
3. Run `pnpm ios` or `pnpm android`
4. Check logs - should see "MediaPipe loaded"
5. If still fails, try Fix 1 or Fix 2
6. If all fails, use Option 2 (bundle locally)

Let me know which fix works for you!
