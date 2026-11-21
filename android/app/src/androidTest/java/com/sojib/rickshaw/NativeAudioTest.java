package com.sojib.rickshaw;

import android.os.SystemClock;
import android.view.ViewGroup;
import android.webkit.WebView;
import androidx.lifecycle.Lifecycle;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import org.junit.Test;
import org.junit.runner.RunWith;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import static org.junit.Assert.*;

/** Emulator smoke test: actual JS bridge, decoded PCM, MediaPlayer and Activity lifecycle. */
@RunWith(AndroidJUnit4.class)
public class NativeAudioTest {
    private String js(ActivityScenario<MainActivity> scenario, String code) throws Exception {
        AtomicReference<String> result = new AtomicReference<>();
        CountDownLatch done = new CountDownLatch(1);
        scenario.onActivity(activity -> {
            WebView webView = (WebView) ((ViewGroup) activity.findViewById(android.R.id.content)).getChildAt(0);
            webView.evaluateJavascript(code, value -> { result.set(value); done.countDown(); });
        });
        assertTrue("JavaScript callback timed out", done.await(5, TimeUnit.SECONDS));
        return result.get();
    }

    private void waitFor(ActivityScenario<MainActivity> scenario, String predicate) throws Exception {
        long deadline = SystemClock.uptimeMillis() + 20000;
        do {
            if ("true".equals(js(scenario, "Boolean(" + predicate + ")"))) return;
            SystemClock.sleep(150);
        } while (SystemClock.uptimeMillis() < deadline);
        fail("Condition not met: " + predicate + "\n" + js(scenario, "document.getElementById('audio-status')?.textContent"));
    }

    @Test
    public void nativeAudioPlaysAndStopsAcrossLifecycle() throws Exception {
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            waitFor(scenario, "document.getElementById('test-sound') && window.RickshawAudio");
            waitFor(scenario, "JSON.parse(RickshawAudio.status()).ready");
            js(scenario, "Math.random = () => 0; document.getElementById('test-sound').click()");
            waitFor(scenario, "JSON.parse(RickshawAudio.status()).focused");
            js(scenario, "document.getElementById('play').click()");
            waitFor(scenario, "JSON.parse(RickshawAudio.status()).playing");
            assertEquals("false", js(scenario, "Boolean(document.querySelector('audio'))"));
            js(scenario, "document.getElementById('pause').click()");
            waitFor(scenario, "!JSON.parse(RickshawAudio.status()).playing");
            js(scenario, "document.getElementById('play').click()");
            waitFor(scenario, "JSON.parse(RickshawAudio.status()).playing");
            scenario.moveToState(Lifecycle.State.CREATED);
            scenario.moveToState(Lifecycle.State.RESUMED);
            waitFor(scenario, "!JSON.parse(RickshawAudio.status()).playing");
            waitFor(scenario, "document.getElementById('play').textContent.includes('CONTINUE')");
            js(scenario, "document.getElementById('play').click()");
            waitFor(scenario, "JSON.parse(RickshawAudio.status()).playing");
            waitFor(scenario, "document.getElementById('sound').getAttribute('aria-pressed') === 'true'");
            js(scenario, "document.getElementById('sound').click()");
            waitFor(scenario, "!JSON.parse(RickshawAudio.status()).playing");
        }
    }
}
