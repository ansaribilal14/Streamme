package com.streamhub.app;

import android.annotation.SuppressLint;
import android.app.PictureInPictureParams;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.res.Configuration;
import android.graphics.Rect;
import android.net.http.SslError;
import android.os.Build;
import android.os.Bundle;
import android.util.Rational;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;
import android.webkit.ConsoleMessage;
import android.webkit.CookieManager;
import android.webkit.SslErrorHandler;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

/**
 * MainActivity - Hosts the StreamHub PWA in a fullscreen WebView.
 *
 * Features:
 *  - Loads the configured server URL (default: http://10.0.2.2:3000 for emulator,
 *    user-configurable for real devices via Settings).
 *  - Enables JavaScript, DOM storage, file access, hardware acceleration.
 *  - Native back-button navigation through WebView history.
 *  - Pull-to-refresh on connection error.
 *  - Picture-in-Picture support for video playback.
 *  - Fullscreen API passthrough for the player page.
 */
public class MainActivity extends AppCompatActivity {

    private static final String PREFS_NAME = "streamhub_prefs";
    private static final String KEY_SERVER_URL = "server_url";
    private static final String DEFAULT_URL = "http://10.0.2.2:3000";

    private WebView webView;
    private SwipeRefreshLayout swipeRefresh;
    private View errorView;
    private ProgressBar progressBar;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Edge-to-edge layout
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED
        );

        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.webview);
        swipeRefresh = findViewById(R.id.swipe_refresh);
        errorView = findViewById(R.id.error_view);
        progressBar = findViewById(R.id.progress_bar);

        // Configure SwipeRefreshLayout
        swipeRefresh.setOnRefreshListener(this::reload);
        swipeRefresh.setColorSchemeColors(
            getResources().getColor(R.color.accent, getTheme())
        );

        // Configure WebView
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);
        settings.setSupportMultipleWindows(false);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            settings.setSafeBrowsingEnabled(false);
        }

        // Enable cookies
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);

        // WebView client - handles URL loading, errors
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                // Keep all URLs inside the WebView
                return false;
            }

            @Override
            public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
                // For personal self-hosted apps, accept self-signed certs
                handler.proceed();
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) {
                    showError();
                }
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                swipeRefresh.setRefreshing(false);
                hideError();
                progressBar.setVisibility(View.GONE);
            }
        });

        // Chrome client - handles JS console, progress, fullscreen video
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                if (newProgress < 100) {
                    progressBar.setVisibility(View.VISIBLE);
                    progressBar.setProgress(newProgress);
                } else {
                    progressBar.setVisibility(View.GONE);
                }
            }

            @Override
            public boolean onConsoleMessage(ConsoleMessage cm) {
                // Forward console logs to logcat for debugging
                android.util.Log.d("StreamHubJS",
                    String.format("[%s] %s:%d · %s",
                        cm.messageLevel(),
                        cm.sourceId(),
                        cm.lineNumber(),
                        cm.message()));
                return true;
            }

            private View customView;
            private WebChromeClient.CustomViewCallback customViewCallback;

            @Override
            public void onShowCustomView(View view, WebChromeClient.CustomViewCallback callback) {
                // Fullscreen video mode
                if (customView != null) {
                    callback.onCustomViewHidden();
                    return;
                }
                customView = view;
                customViewCallback = callback;
                FrameLayout root = findViewById(R.id.webview_container);
                root.addView(view, new FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    FrameLayout.LayoutParams.MATCH_PARENT
                ));
                hideSystemUI();
            }

            @Override
            public void onHideCustomView() {
                FrameLayout root = findViewById(R.id.webview_container);
                root.removeView(customView);
                customView = null;
                if (customViewCallback != null) {
                    customViewCallback.onCustomViewHidden();
                    customViewCallback = null;
                }
                showSystemUI();
            }
        });

        // Long-press for settings shortcut
        webView.setOnLongClickListener(v -> {
            startActivity(new Intent(this, SettingsActivity.class));
            return true;
        });

        // Load the configured URL
        loadUrl();

        // Hide system UI on immersive mode
        showSystemUI();
    }

    private void loadUrl() {
        String url = getServerUrl();
        webView.loadUrl(url);
        progressBar.setVisibility(View.VISIBLE);
        progressBar.setProgress(0);
    }

    private String getServerUrl() {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        String url = prefs.getString(KEY_SERVER_URL, DEFAULT_URL);
        // Strip trailing slash
        if (url.endsWith("/")) url = url.substring(0, url.length() - 1);
        return url;
    }

    private void reload() {
        webView.reload();
    }

    private void showError() {
        runOnUiThread(() -> {
            errorView.setVisibility(View.VISIBLE);
            webView.setVisibility(View.GONE);
            swipeRefresh.setRefreshing(false);
            progressBar.setVisibility(View.GONE);
        });
    }

    private void hideError() {
        runOnUiThread(() -> {
            errorView.setVisibility(View.GONE);
            webView.setVisibility(View.VISIBLE);
        });
    }

    private void hideSystemUI() {
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        controller.hide(WindowInsetsCompat.Type.systemBars());
    }

    private void showSystemUI() {
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        controller.show(WindowInsetsCompat.Type.systemBars());
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        // Back button: WebView history, then default back
        if (keyCode == KeyEvent.KEYCODE_BACK && webView.canGoBack()) {
            webView.goBack();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        // Let WebView handle orientation changes without reload
    }

    /** Called from the error view's "Retry" button. */
    public void onRetryClick(View view) {
        hideError();
        loadUrl();
    }

    /** Called from the error view's "Settings" button. */
    public void onSettingsClick(View view) {
        startActivity(new Intent(this, SettingsActivity.class));
    }

    @Override
    public void onUserLeaveHint() {
        // Enter Picture-in-Picture when user leaves (e.g. presses Home) while video is playing
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                PictureInPictureParams params = new PictureInPictureParams.Builder()
                    .setAspectRatio(new Rational(16, 9))
                    .build();
                enterPictureInPictureMode(params);
            } catch (IllegalStateException ignored) {
                // PiP not supported / not allowed
            }
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) webView.onResume();
        // Recheck server URL in case user changed it
        if (webView != null && !webView.getUrl().startsWith(getServerUrl())) {
            loadUrl();
        }
    }

    @Override
    protected void onPause() {
        if (webView != null) webView.onPause();
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            ((FrameLayout) findViewById(R.id.webview_container)).removeView(webView);
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
