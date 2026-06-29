# StreamHub — Android APK

This is the native Android wrapper for the StreamHub PWA. It packages the Next.js web app inside a fullscreen WebView, with extras:
- Native splash screen with StreamHub logo
- Configurable server URL (Settings page — accessible via long-press on the WebView or the error screen)
- Picture-in-Picture support when leaving the app during video playback
- Fullscreen video mode (WebChromeClient custom view)
- Pull-to-refresh on connection errors
- Cleartext HTTP support for `localhost`, `10.0.2.2`, LAN IPs, and `space-z.ai`
- Back button navigates WebView history

## Build

```bash
# One-time: install Android SDK + JDK 21
/home/z/my-project/scripts/setup-android-sdk.sh
# (JDK 21 is at /home/z/my-project/jdk21 — must include jlink + jmod)

# Build the APK
/home/z/my-project/scripts/build-apk.sh
# Output: /home/z/my-project/download/streamhub.apk
```

## Install on a device

```bash
adb install /home/z/my-project/download/streamhub.apk
```

Or copy the APK to your phone manually and install (enable "Install from unknown sources" in Android settings).

## First run

1. The app launches and shows the splash screen for ~1.2s.
2. It then tries to load the configured server URL (default: `http://10.0.2.2:3000` — the Android emulator's host).
3. **On a real device**, you need to point it at your computer's LAN IP:
   - Long-press anywhere on the WebView → Settings page opens.
   - Or wait for the error screen → tap "Settings".
   - Enter your server URL, e.g. `http://192.168.1.50:3000`.
   - Tap "Test" to verify connectivity, then "Save".
   - Restart the app.

## Architecture

- `SplashActivity` — fullscreen splash, transitions to MainActivity.
- `MainActivity` — hosts the WebView with full JS/DOM/cookies/hardware-accel support.
- `SettingsActivity` — server URL configuration (stored in SharedPreferences).

## Notes

- The APK is **debug-signed** for personal use. For production distribution you would generate a release keystore, but for personal self-hosted use this is fine.
- The app works on Android 6.0+ (API 23+).
- All network traffic goes to your StreamHub server (frontend + backend). No external services are called by the wrapper itself.
