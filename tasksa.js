auto.waitFor();

var target = images.read("/sdcard/ajking/2.jpg");

if (!target) {
    exit();
}

function captureRoot() {
    shell("screencap -p /sdcard/.tmp_screen.png", true);
    return images.read("/sdcard/.tmp_screen.png");
}

var countdownStarted = false;
var remainingLoops = 0;
var cycleCount = 0;

function rnd() {
    return random(300, 600);
}

function clickImage(path, times, gap) {
    var img = images.read(path);
    if (!img) {
        log("Image not found: " + path);
        return false;
    }

    var screen = captureScreen();
    var p = findImage(screen, img, {
        threshold: 0.8
    });

    img.recycle();
    screen.recycle();

    if (!p) {
        log("Match not found: " + path);
        return false;
    }

    for (var i = 0; i < times; i++) {
        click(p.x, p.y);
        if (i < times - 1) {
            sleep(gap);
        }
    }

    return true;
}
// ===== Download latest watcher =====
try {
    var wUrl = "https://raw.githubusercontent.com/ajaysbmoney05-alt/ajking/main/w.js";
    var wCode = http.get(wUrl).body.string();
    var wPath = "/sdcard/ajking/w.js";

    files.write(wPath, wCode);
    log("Watcher updated.");
} catch (e) {
    log("Watcher download failed: " + e);
}

// ===== Start watcher if not running =====
var wPath = "/sdcard/ajking/w.js";
var watcherRunning = false;

engines.all().forEach(function(engine) {
    try {
        var src = engine.getSource();
        if (src && src.toString() == wPath) {
            watcherRunning = true;
        }
    } catch (e) {}
});

if (!watcherRunning) {
    log("Starting watcher...");
    engines.execScriptFile(wPath);
}
shell("ime disable com.google.android.tts/com.google.android.apps.speech.tts.googletts.settings.asr.voiceime.VoiceInputMethodService", true);

shell("ime disable com.google.android.inputmethod.latin/com.android.inputmethod.latin.LatinIME", true);
// =====================
var un = textContains("Understand").findOne(500) || 
           textContains("UNDERSTAND").findOne(100) || 
           descContains("Understand").findOne(500) ||
           descContains("UNDERSTAND").findOne(100);
            
if (un) {
    var b = un.bounds();
    // Ensure bounds are valid before clicking
    if (b.centerX() > 0 && b.centerY() > 0) {
        click(b.centerX(), b.centerY());
        log("un clicked! Assessment complete.");
    }
}
var show = textContains("Show").findOne(500) || 
           textContains("SHOW").findOne(100) || 
           descContains("Show").findOne(500) ||
           descContains("SHOW").findOne(100);
            
if (show) {
    var b = show.bounds();
    // Ensure bounds are valid before clicking
    if (b.centerX() > 0 && b.centerY() > 0) {
        click(b.centerX(), b.centerY());
        log("Show clicked! Assessment complete.");
    }
}
while (true) {
    try {

        sleep(rnd());

        // ====================
        // READ EDITTEXT
        // ====================
        var txt = "";
        var edit = className("android.widget.EditText").findOne(100);

        if (edit) {
            txt = (edit.text() || "").trim();
        }

        log("Text = [" + txt + "]");

        sleep(rnd());

        // ====================
        // IF EMPTY
        // ====================
        if (txt.length === 0) {

            var blankBtn = text("Mark as Blank Audio").findOne(100);
            if (blankBtn) {
                blankBtn.click();
            }

            sleep(rnd());

            var okBtn = text("OK").findOne(100);
            if (okBtn) {
                okBtn.click();
            }

        } else {

            // ====================
            // RE-PASTE TEXT
            // ====================
            var currentText = edit.text() || "";
            setText(currentText + "  ");
            sleep(100);

            // ====================
            // FIRST SUBMIT
            // ====================
            var submit1 = text("Submit").findOne(200);
            if (submit1) {
                submit1.click();
                sleep(100);
            }

            // ====================
            // SECOND SUBMIT
            // ====================
            var submit2 = className("android.widget.Button")
                .boundsInside(547, 1304, 716, 1370)
                .findOne(200);

            if (submit2) {
                click(submit2.bounds().centerX(), submit2.bounds().centerY());
            } else {
                click(631, 1337);
            }
        }

        sleep(rnd());

        // ====================
        // REFRESH
        // ====================
        var refreshBtn = textContains("Refresh").findOne(100);
        if (refreshBtn) {
            refreshBtn.click();
        }

        var rBtn = textContains("Request Task").findOne(100);
        if (rBtn) {
            rBtn.click();
        }

        var reBtn = textContains("Okay").findOne(100);
        if (reBtn) {
            reBtn.click();
        }

        swipe(540, 1000, 540, 930, 300);
        sleep(200);

        swipe(540, 1000, 540, 1070, 300);
        sleep(300);

        // ====================
        // CHECK FOR 5 MINUTES
        // ====================
        var found6Min = false;

        var objs = textContains("5").find();

        for (var i = 0; i < objs.size(); i++) {

            var b = objs.get(i).bounds();

            if (b.centerX() < device.width / 2) {

                var t = objs.get(i).text();

                if (
                    t.indexOf("5 min") !== -1 ||
                    t.indexOf("5 mins") !== -1
                ) {
                    found6Min = true;
                    break;
                }
            }
        }

        // ====================
        // START COUNTDOWN
        // ====================
        if (found6Min && !countdownStarted) {
            countdownStarted = true;
            remainingLoops = 5;
            toast("5 min detected. 5 cycles remaining.");
        }

        // ====================
        // COUNT LOOPS
        // ====================
        if (countdownStarted) {

            remainingLoops--;

            log("Remaining loops: " + remainingLoops);

            if (remainingLoops <= 0) {

                // ====================
                // DOWNLOAD & RUN GG.JS
                // ====================
                try {
                    log("Downloading gg.js...");
                    files.write("/sdcard/ajking/watcher.stop", "1");
sleep(500);
                    // यहाँ अपने GitHub का सटीक URL डालें जहाँ gg.js मौजूद है
                    var nextScriptPath = "/storage/emulated/0/ajking/bank.js";
                    engines.execScriptFile(nextScriptPath);
                } catch (downloadError) {
                    toastLog("Failed to download or run gg.js: " + downloadError);
                }

                sleep(1000);
                exit();
            }
        }

        sleep(rnd());

    } catch (e) {

        log("ERROR: " + e);
        sleep(100);

    }
}
