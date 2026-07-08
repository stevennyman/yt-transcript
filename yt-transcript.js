// YouTube Live Transcript (external window with visible scrollback)
// Steven Nyman
// 2/27/2022 revised 9/23/2022, 3/7/2026, 7/8/2026

// Fixed: Updated to work with YouTube's new JSON caption format and TrustedHTML requirements
// Fixed: Trigger captions via real CC button click instead of player API

(function() {
    var mp = document.getElementById("movie_player");
    if (!mp) {
        alert("YouTube player not found. Please run this on a YouTube video page.");
        return;
    }

    console.log('[YT Transcript] Starting bookmarklet...');

    window.tcur = -1;
    window.activeIdx = -1;
    window.scrollTimer = null;

    function escHtml(s) {
        return String(s)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    function scrollcheck() {
        if (!window.win || window.win.closed || !window.lines || !window.lineNodes) return;
        let tnewMs = Math.floor(mp.getCurrentTime() * 1000);
        let i = 0;
        while (i + 1 < window.lines.length && window.lines[i + 1].tStartMs <= tnewMs) {
            i++;
        }

        if (i !== window.activeIdx) {
            if (window.lineNodes[window.activeIdx]) {
                window.lineNodes[window.activeIdx].classList.remove("active");
            }
            if (window.lineNodes[i]) {
                window.lineNodes[i].classList.add("active");
                // Keep only a small tail (about 1-3 lines) below the active line.
                const linePx = 24;
                const tailLines = 4;
                const target = Math.max(
                    0,
                    window.lineNodes[i].offsetTop - (window.win.innerHeight - ((tailLines + 0.5) * linePx))
                );
                window.win.scrollTo(0, target);
            }
            window.activeIdx = i;
            window.tcur = tnewMs;
        }

        const current = window.lines[i] || { dDurationMs: 1000, tStartMs: tnewMs };
        const next = window.lines[i + 1];
        const nextMs = next ? (next.tStartMs - tnewMs) : current.dDurationMs;
        const delay = Math.max(200, Math.min(1500, nextMs / Math.max(0.25, mp.getPlaybackRate())));
        window.scrollTimer = setTimeout(scrollcheck, delay);
    }

    // Store original XMLHttpRequest
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;

    let xhrIntercepted = false;
    let transcriptBuilt = false;

    // Override XHR to intercept caption data
    XMLHttpRequest.prototype.open = function(method, url, ...args) {
        this.__url = url;
        return originalXHROpen.apply(this, [method, url, ...args]);
    };

    XMLHttpRequest.prototype.send = function(...args) {
        const url = this.__url;

        if (typeof url === 'string' && url.includes('timedtext') && url.includes('fmt=json3')) {
            xhrIntercepted = true;
            console.log('[YT Transcript] Intercepting timedtext request:', url.substring(0, 100));

            this.addEventListener('load', function() {
                if (this.status === 200) {
                    const text = this.responseText;
                    console.log('[YT Transcript] Response received, length:', text.length);

                    if (text.length > 0) {
                        try {
                            if (transcriptBuilt) return;
                            const data = JSON.parse(text);
                            console.log('[YT Transcript] Successfully parsed caption data, events:', data.events ? data.events.length : 0);
                            transcriptBuilt = true;

                            // Restore original XHR
                            XMLHttpRequest.prototype.open = originalXHROpen;
                            XMLHttpRequest.prototype.send = originalXHRSend;

                            // Keep the raw event list for debugging and timeout checks.
                            window.els = data.events || [];
                            window.lines = [];

                            var ns = "<style>body{font-size:20px;background-color:black;color:white;line-height:24px;margin:0;padding:12px}.yt-wrap{white-space:pre-wrap;font-family:monospace}.yt-line.active{color:#7dd3fc}</style><pre class=\"yt-wrap\">";
                            let row = 0;
                            for (const event of window.els) {
                                if (!event.segs || !event.segs.length) continue;
                                const startSeconds = event.tStartMs / 1000;
                                const lineText = event.segs.map(seg => seg.utf8).join('').replace(/\s+/g, ' ').trim();
                                if (!lineText) continue;
                                window.lines.push({
                                    tStartMs: event.tStartMs,
                                    dDurationMs: event.dDurationMs || 1000
                                });
                                ns += "<div class=\"yt-line\" data-idx=\"" + row + "\">" +
                                      String(parseInt(startSeconds / 60)).padStart(2, "0") + ":" +
                                      String(parseInt(startSeconds % 60)).padStart(2, "0") + "&#9;" +
                                      escHtml(lineText) + "</div>";
                                row++;
                            }
                            ns += "</pre>";

                            window.win = window.open("", "_blank", "toolbar=0,location=0,menubar=0");

                            // Use TrustedHTML if required
                            if (window.trustedTypes && window.trustedTypes.createPolicy) {
                                try {
                                    const policy = window.trustedTypes.createPolicy('yt-transcript', {
                                        createHTML: (string) => string
                                    });
                                    window.win.document.body.innerHTML = policy.createHTML(ns);
                                } catch (e) {
                                    // Policy might already exist, try direct assignment
                                    window.win.document.body.innerHTML = ns;
                                }
                            } else {
                                window.win.document.body.innerHTML = ns;
                            }

                            window.lineNodes = window.win.document.querySelectorAll('.yt-line');
                            if (window.scrollTimer) clearTimeout(window.scrollTimer);
                            window.activeIdx = -1;

                            console.log('[YT Transcript] Transcript window opened successfully!');
                            if (!window.lines.length) {
                                alert("No caption lines found for this video.");
                                return;
                            }
                            setTimeout(scrollcheck, 100);
                        } catch (e) {
                            console.error('[YT Transcript] Error parsing caption data:', e);
                            XMLHttpRequest.prototype.open = originalXHROpen;
                            XMLHttpRequest.prototype.send = originalXHRSend;
                            alert("Error parsing caption data: " + e.toString());
                        }
                    } else {
                        console.warn('[YT Transcript] Empty response from timedtext endpoint');
                    }
                }
            });
        }

        return originalXHRSend.apply(this, args);
    };

    console.log('[YT Transcript] XHR interceptor installed');

    // Enable captions to trigger loading
    const ccButton = document.querySelector('.ytp-subtitles-button');

    function clickCC() {
        if (ccButton) {
            ccButton.click();
        } else {
            mp.toggleSubtitlesOn();
        }
    }

    if (mp.isSubtitlesOn()) {
        console.log('[YT Transcript] Captions already on, toggling to reload...');
        clickCC();
        setTimeout(clickCC, 150);
    } else {
        console.log('[YT Transcript] Enabling captions...');
        clickCC();
    }

    // Timeout in case captions don't load
    setTimeout(() => {
        if (typeof window.els === 'undefined') {
            XMLHttpRequest.prototype.open = originalXHROpen;
            XMLHttpRequest.prototype.send = originalXHRSend;
            if (xhrIntercepted) {
                console.error('[YT Transcript] XHR was intercepted but returned empty data.');
                alert("Captions returned empty data. This may be due to YouTube's security measures. Try:\n1. Refresh the page and run the bookmarklet again\n2. Make sure auto-generated captions are available\n3. Check the browser console for more details");
            } else {
                console.error('[YT Transcript] No timedtext XHR detected.');
                alert("Captions did not load. Make sure auto-generated captions are available for this video.");
            }
        }
    }, 10000);
}());
