// YouTube Live Transcript (external window with visible scrollback)
// Steven Nyman
// 2/27/2022 revised 9/23/2022

// TODO: handle play/pause events better, bubble search, display last caption

(function () {
    var mp = document.getElementById("movie_player");
    window.tcur = -1;

    function scrollcheck() {
        let tnew = mp.getCurrentTime();
        let i = 1;
        for (i = 1; i < window.els.length; i++) {
            if (parseFloat(window.els[i].getAttribute("start")) > tnew) {
                if (tnew != window.tcur) {
                    window.tcur = tnew;
                    window.win.scrollTo(0, ((24 * (i)) - (window.win.innerHeight - 12)));
                }
                break;
            }
        }
        setTimeout(scrollcheck, (parseFloat(window.els[i - 1].getAttribute("dur")) * 100) / mp.getPlaybackRate());
    }
    for (const el of document.getElementsByTagName("ytd-app")[0].data.playerResponse.captions.playerCaptionsTracklistRenderer.captionTracks) {
        if (el.kind === "asr") {
            fetch(el.baseUrl)
            .then(response => response.text())
            .then((response) => {
                let parser = new DOMParser();
                let xmlDoc = parser.parseFromString(response, "text/xml");
                window.els = xmlDoc.getElementsByTagName("text");
                var ns = "<pre><style>body{font-size:20px;background-color:black;color:white;line-height:24px}</style>";
                for (const el of window.els) {
                    ns += String(parseInt(el.getAttribute("start") / 60)).padStart(2, "0") + ":" + String(parseInt(parseInt(el.getAttribute("start")) % 60)).padStart(2, "0") + "&#9;" + el.textContent + "<br>";
                }
                ns += "</pre>"
                window.win = window.open("", "_blank", "toolbar=0,location=0,menubar=0");
                window.win.document.body.innerHTML = ns;
                setTimeout(scrollcheck, (parseFloat(window.els[0].getAttribute("dur")) * 100) / mp.getPlaybackRate());
            })
            .catch(err => console.log(err));
        }
    }
}());