package com.sojib.rickshaw;

import android.app.Activity;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.media.SoundPool;
import android.os.Build;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import org.json.JSONObject;
import java.util.HashSet;
import java.util.Set;

/** Narrow, local-content-only bridge. No paths, URLs, files or arbitrary commands. */
public final class GameAudio {
    private final Activity activity;
    private final WebView webView;
    private final AudioManager manager;
    private final AudioAttributes attributes;
    private final AudioManager.OnAudioFocusChangeListener focusListener;
    private AudioFocusRequest focusRequest;
    private MediaPlayer ride;
    private SoundPool effects;
    private final int[] samples = new int[4];
    private final Set<Integer> loaded = new HashSet<>();
    private final Set<Integer> streams = new HashSet<>();
    private volatile boolean ready, focused, playing, foreground = true, released;
    private volatile String error = "";

    public GameAudio(Activity activity, WebView webView) {
        this.activity = activity;
        this.webView = webView;
        manager = (AudioManager) activity.getSystemService(Activity.AUDIO_SERVICE);
        attributes = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_GAME)
                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build();
        focusListener = change -> {
            if (change == AudioManager.AUDIOFOCUS_LOSS ||
                    change == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT ||
                    change == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK) {
                focused = false;
                silence();
                webView.evaluateJavascript("document.dispatchEvent(new Event('rickshaw-audio-interrupted'))", null);
            }
            // Never auto-resume a ride after a call/another app; wait for a user tap.
        };
        if (Build.VERSION.SDK_INT >= 26) {
            focusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                    .setAudioAttributes(attributes).setOnAudioFocusChangeListener(focusListener).build();
        }
        try {
            ride = MediaPlayer.create(activity, R.raw.ride, attributes, 0);
            if (ride == null) throw new IllegalStateException("Ride clip could not be loaded");
            ride.setLooping(true);
            ride.setVolume(.7f, .7f);
            ride.setOnErrorListener((player, what, extra) -> {
                ready = false; playing = false; error = "Native playback error " + what;
                return true;
            });
            effects = new SoundPool.Builder().setMaxStreams(4).setAudioAttributes(attributes).build();
            effects.setOnLoadCompleteListener((pool, id, status) -> {
                if (released) return;
                if (status == 0) loaded.add(id); else error = "Sound clip load failed";
                ready = ride != null && loaded.size() == samples.length;
            });
            samples[0] = effects.load(activity, R.raw.start, 1);
            samples[1] = effects.load(activity, R.raw.steer, 1);
            samples[2] = effects.load(activity, R.raw.crash, 1);
            samples[3] = effects.load(activity, R.raw.test, 1);
        } catch (RuntimeException exception) {
            error = "Native audio initialization failed";
        }
    }

    private boolean focus() {
        if (focused) return true;
        int result;
        if (Build.VERSION.SDK_INT >= 26) result = manager.requestAudioFocus(focusRequest);
        else result = manager.requestAudioFocus(focusListener, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN);
        focused = result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED;
        if (!focused) error = "Audio focus denied; stop other audio and tap again";
        else error = "";
        return focused;
    }

    @JavascriptInterface
    public void configure(boolean enabled, boolean running) {
        activity.runOnUiThread(() -> {
            if (released) return;
            if (!enabled || !foreground) { silence(); abandonFocus(); return; }
            if (!focus()) return;
            try {
                if (ride != null && running && !ride.isPlaying()) ride.start();
                if (ride != null && !running && ride.isPlaying()) ride.pause();
                playing = ride != null && ride.isPlaying();
            } catch (RuntimeException exception) { error = "Native ride playback failed"; }
        });
    }

    @JavascriptInterface
    public void effect(int kind) {
        if (kind < 0 || kind >= samples.length) return;
        activity.runOnUiThread(() -> {
            if (released || !foreground || !ready || !focus()) return;
            // Bounded stream tracking; no accumulating stale IDs during long runs.
            if (streams.size() >= 16) { for (int id : streams) effects.stop(id); streams.clear(); }
            int stream = effects.play(samples[kind], .9f, .9f, 1, 0, 1f);
            if (stream != 0) streams.add(stream); else error = "Sound playback refused";
        });
    }

    @JavascriptInterface
    public void stopEffects() {
        activity.runOnUiThread(() -> {
            if (released || effects == null) return;
            for (int id : streams) effects.stop(id);
            streams.clear();
        });
    }

    @JavascriptInterface
    public String status() {
        JSONObject data = new JSONObject();
        try {
            data.put("ready", ready && !released);
            data.put("focused", focused);
            data.put("playing", playing);
            data.put("volume", manager.getStreamVolume(AudioManager.STREAM_MUSIC));
            data.put("maxVolume", manager.getStreamMaxVolume(AudioManager.STREAM_MUSIC));
            data.put("error", error);
        } catch (Exception ignored) { /* Return a parseable, possibly partial status. */ }
        return data.toString();
    }

    private void silence() {
        if (ride != null) {
            try { if (ride.isPlaying()) ride.pause(); } catch (RuntimeException ignored) {}
        }
        playing = false;
        if (effects != null) for (int id : streams) effects.stop(id);
        streams.clear();
    }

    private void abandonFocus() {
        if (Build.VERSION.SDK_INT >= 26) manager.abandonAudioFocusRequest(focusRequest);
        else manager.abandonAudioFocus(focusListener);
        focused = false;
    }

    public void onPause() {
        foreground = false;
        silence();
        abandonFocus();
    }

    public void onResume() { foreground = true; }

    public void release() {
        onPause();
        released = true;
        ready = false;
        if (ride != null) { ride.release(); ride = null; }
        if (effects != null) { effects.release(); effects = null; }
    }
}
