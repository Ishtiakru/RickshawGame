package com.sojib.rickshaw;

import android.app.Activity;
import android.os.Bundle;
import android.media.AudioManager;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/** Offline shell. The game lives in assets/index.html, not a fragile Java string. */
public class MainActivity extends Activity {
    private WebView webView;
    private GameAudio gameAudio;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setVolumeControlStream(AudioManager.STREAM_MUSIC);
        webView = new WebView(this);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccess(false);
        // Only trusted, bundled content is loaded; JS still unlocks audio on Play/tap.
        settings.setMediaPlaybackRequiresUserGesture(false);
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return true; // No navigation out of the bundled game.
            }
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return true;
            }
        });
        // Bridge is only exposed to our bundled document: all navigation is blocked,
        // file/content access is disabled, CSP denies external content, and no INTERNET
        // permission is requested. Never load remote/user-provided pages into this view.
        gameAudio = new GameAudio(this, webView);
        webView.addJavascriptInterface(gameAudio, "RickshawAudio");
        setContentView(webView);
        webView.loadUrl("file:///android_asset/index.html");
    }

    @Override
    protected void onPause() {
        if (gameAudio != null) gameAudio.onPause();
        webView.evaluateJavascript("document.dispatchEvent(new Event('rickshaw-pause'))", null);
        webView.onPause();
        webView.pauseTimers();
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (gameAudio != null) gameAudio.onResume();
        if (webView != null) {
            webView.onResume();
            webView.resumeTimers();
            webView.evaluateJavascript("document.dispatchEvent(new Event('rickshaw-resume'))", null);
        }
    }

    @Override
    protected void onDestroy() {
        if (gameAudio != null) gameAudio.release();
        webView.removeJavascriptInterface("RickshawAudio");
        webView.destroy();
        super.onDestroy();
    }
}
