package com.streamhub.app;

import android.content.SharedPreferences;
import android.os.Bundle;
import android.text.InputType;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

/**
 * SettingsActivity - Lets the user configure the StreamHub server URL.
 * Default is http://10.0.2.2:3000 (Android emulator host).
 * On a real device, the user should enter their server's LAN IP, e.g. http://192.168.1.50:3000
 */
public class SettingsActivity extends AppCompatActivity {

    private static final String PREFS_NAME = "streamhub_prefs";
    private static final String KEY_SERVER_URL = "server_url";

    private EditText urlInput;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_settings);

        urlInput = findViewById(R.id.url_input);
        Button saveButton = findViewById(R.id.save_button);
        Button resetButton = findViewById(R.id.reset_button);
        Button testButton = findViewById(R.id.test_button);

        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        String currentUrl = prefs.getString(KEY_SERVER_URL, getString(R.string.default_server_url));
        urlInput.setText(currentUrl);

        saveButton.setOnClickListener(v -> {
            String url = urlInput.getText().toString().trim();
            if (url.isEmpty()) {
                Toast.makeText(this, "URL cannot be empty", Toast.LENGTH_SHORT).show();
                return;
            }
            if (!url.startsWith("http://") && !url.startsWith("https://")) {
                url = "http://" + url;
            }
            // Strip trailing slash
            if (url.endsWith("/")) url = url.substring(0, url.length() - 1);

            prefs.edit().putString(KEY_SERVER_URL, url).apply();
            Toast.makeText(this, "Saved! Restart app to apply.", Toast.LENGTH_LONG).show();
            finish();
        });

        resetButton.setOnClickListener(v -> {
            prefs.edit().remove(KEY_SERVER_URL).apply();
            urlInput.setText(getString(R.string.default_server_url));
            Toast.makeText(this, "Reset to default", Toast.LENGTH_SHORT).show();
        });

        testButton.setOnClickListener(v -> {
            String url = urlInput.getText().toString().trim();
            if (url.isEmpty()) return;
            Toast.makeText(this, "Testing " + url + "…", Toast.LENGTH_SHORT).show();
            // Just attempt a fetch in background
            new Thread(() -> {
                try {
                    java.net.URL u = new java.net.URL(url);
                    java.net.HttpURLConnection conn = (java.net.HttpURLConnection) u.openConnection();
                    conn.setConnectTimeout(3000);
                    conn.setReadTimeout(5000);
                    conn.connect();
                    int code = conn.getResponseCode();
                    runOnUiThread(() -> Toast.makeText(this,
                        "Server responded: HTTP " + code, Toast.LENGTH_LONG).show());
                } catch (Exception e) {
                    runOnUiThread(() -> Toast.makeText(this,
                        "Connection failed: " + e.getMessage(), Toast.LENGTH_LONG).show());
                }
            }).start();
        });
    }
}
