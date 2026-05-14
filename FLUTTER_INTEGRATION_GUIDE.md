# Flutter Integration Guide for RukkooIn

This guide documents how to implement the Flutter Bridge in your Android/iOS app to enable Native Camera functionality within the React Web App (`PartnerProfile`, `AddHotel`, etc.).

## 1. Overview

The Wrapper App (Flutter) and the Web App (React) communicate via a **JavaScript Bridge**.

- **Web App** calls: `window.flutter_inappwebview.callHandler('openCamera')`
- **Flutter App** listens for: `openCamera` handler
- **Flutter App** returns: JSON object with Base64 image data

---

## 2. Dependencies

Ensure your `pubspec.yaml` includes:

```yaml
dependencies:
  flutter:
    sdk: flutter
  flutter_inappwebview: ^6.0.0 # or latest
  image_picker: ^1.0.4
  image_cropper: ^5.0.0 # Optional, for cropping
  mime: ^1.0.4 
```

---

## 3. Flutter Implementation (Dart)

In your `WebView` screen, register the `openCamera` JavaScript handler.

```dart
import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mime/mime.dart';

class WebViewScreen extends StatefulWidget {
  final String url;
  const WebViewScreen({Key? key, required this.url}) : super(key: key);

  @override
  _WebViewScreenState createState() => _WebViewScreenState();
}

class _WebViewScreenState extends State<WebViewScreen> {
  final ImagePicker _picker = ImagePicker();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: InAppWebView(
          initialUrlRequest: URLRequest(url: WebUri(widget.url)),
          initialSettings: InAppWebViewSettings(
            javaScriptEnabled: true,
            useHybridComposition: true, // Important for Android
            allowsInlineMediaPlayback: true,
          ),
          onWebViewCreated: (controller) {
            // Register Handler
            controller.addJavaScriptHandler(
              handlerName: 'openCamera',
              callback: (args) async {
                return await _handleCameraCapture();
              },
            );
          },
          onConsoleMessage: (controller, consoleMessage) {
            print("WEBVIEW LOG: ${consoleMessage.message}");
          },
        ),
      ),
    );
  }

  // Handle Camera Capture
  Future<Map<String, dynamic>> _handleCameraCapture() async {
    try {
      final XFile? photo = await _picker.pickImage(
        source: ImageSource.camera,
        preferredCameraDevice: CameraDevice.rear,
        imageQuality: 70, // Optimize size (Very Important)
        maxWidth: 1920,   // Resize large images
        maxHeight: 1920,
      );

      if (photo == null) {
        return {'success': false, 'message': 'User cancelled'};
      }

      // Convert to Base64
      final bytes = await File(photo.path).readAsBytes();
      final String base64String = base64Encode(bytes);
      final String? mimeType = lookupMimeType(photo.path) ?? 'image/jpeg';
      final String fileName = photo.name;
      
      // Return expected JSON format
      return {
        'success': true,
        'base64': base64String, // Do NOT include "data:image/..." prefix here if already handled by backend utils, but safer to send raw base64.
        'mimeType': mimeType,
        'fileName': fileName
      };
    } catch (e) {
      print("Camera Error: $e");
      return {'success': false, 'message': e.toString()};
    }
  }
}
```

> **Note:** The `imageQuality: 70` and `maxWidth: 1920` are CRITICAL to keep payload size reasonable (under 5MB) for smoother uploads.

---

## 4. Backend Configurations

The app communicates with the following endpoints for image uploads. Ensure your Production Server allows traffic to these and supports large payloads.

### API Endpoints Used

| Feature | Endpoint | Method | Handling Controller |
| :--- | :--- | :--- | :--- |
| **Partner Profile Avatar** | `/api/auth/partner/upload-docs-base64` | POST | `authController.uploadDocsBase64` |
| **Hotel/Property Images** | `/api/hotels/upload-base64` | POST | `hotelController.uploadImagesBase64` |

*Note: These endpoints expect a JSON body with a large Base64 string.*

### Nginx Configuration (Production)
If you encounter `413 Request Entity Too Large` or `Unexpected end of JSON input` errors, update your Nginx config:

```nginx
server {
    # ...
    client_max_body_size 50M; # Increase from default 1M
    # ...
}
```

### Express Configuration
Ensure `server.js` has appropriate limits (already configured in codebase):
```javascript
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
```

---

## 5. Troubleshooting "Unexpected end of JSON"

If you see `[Upload Base64] Error: SyntaxError: ... Unexpected end of JSON`, it means the Backend returned a **Non-JSON** response (likely HTML error page).

**Potential Causes:**
1.  **Payload Too Large:** The Base64 string exceeded Server (Nginx) limits. -> **Fix:** Compress image in Flutter (`imageQuality: 60`) or increase Nginx limit.
2.  **404 Not Found:** The endpoint URL is incorrect or the backend code is not deployed. -> **Fix:** Deploy latest `backend` code.
3.  **Timeout:** Upload took too long (> 60s). -> **Fix:** Compress image or improve network.
