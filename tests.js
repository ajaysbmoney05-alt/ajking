auto.waitFor();

function getConfig() {
    var path = files.getSdcardPath() + "/ajking/ci.json";
    if (files.exists(path)) {
        try {
            return JSON.parse(files.read(path));
        } catch (e) {
            log("Config parse error: " + e);
        }
    }
    return {};
}

var config = getConfig();
var TEXT1 = config.t1 || "";
var TEXT2 = config.t2 || "";

var t1Done = false;
var t2Done = false;
var tasksStarted = false; // "Continue to Tasks" click hone ke baad true hoga
var startTime = Date.now();

log("Reliable tests.js started...");

while (true) {
    if (Date.now() - startTime > 300000) {
        log("Timeout: 5 mins passed, restarting...");
        engines.myEngine().forceStop();
    }

    try {
        // --- UNIVERSAL OVERLAY HANDLERS ---

        // 1. Sign/Continue logic
        var sign = textMatches(/Sign document|Sign NDA and Offer Letter|Sign Document|Continue|Agree/).findOne(100);
        if (sign) {
            var b = sign.bounds();
            click(b.centerX(), b.centerY());
            log("Handled: " + sign.text());
            sleep(1500);
            
            // Coordinate click as requested (Center of 269,994,811,1059 is approx 540, 1026)
            click(540, 1026);
            log("NDA coordinate click done");
            
            sleep(1000);
            continue;
        }

        // 2. CONTINUE TO TASKS (Exit Gate trigger)
        var contTasks = textMatches(/Continue to Tasks|Start Tasks|Continue to tasks/).findOne(100);
        if (contTasks) {
            var b = contTasks.bounds();
            click(b.centerX(), b.centerY());
            log("Continue to Tasks clicked. Now waiting for 'Show' button.");
            tasksStarted = true;
            sleep(2000);
            continue;
        }

        // 3. SHOW BUTTON (Only scan after tasksStarted is true)
        if (tasksStarted) {
            // Broadened selector for Show
            var show = textContains("Show").findOne(100) || 
                       textContains("SHOW").findOne(100) || 
                       descContains("Show").findOne(100) ||
                       descContains("SHOW").findOne(100);
            
            if (show) {
                var b = show.bounds();
                // Ensure bounds are valid before clicking
                if (b.centerX() > 0 && b.centerY() > 0) {
                    click(b.centerX(), b.centerY());
                    log("Show clicked! Assessment complete.");
                    break; 
                }
            }
        }

        // --- STEP BY STEP LOGIC (Form Filling) ---
        var editBoxes = className("android.widget.EditText").find();

        if (!t1Done && editBoxes.length > 0) {
            var e1 = editBoxes[0];
            if (e1.text() !== TEXT1) {
                e1.setText(TEXT1);
                log("T1 entered");
            }
            var nextBtn = textMatches(/Next|NEXT/).findOne(200);
            if (nextBtn) {
                click(nextBtn.bounds().centerX(), nextBtn.bounds().centerY());
                t1Done = true;
                log("Next clicked after T1");
                sleep(2000);
            }
        }

        if (t1Done && !t2Done) {
            var editBoxes2 = className("android.widget.EditText").find();
            if (editBoxes2.length > 0) {
                var e2 = editBoxes2[editBoxes2.length - 1];
                if (e2.text() !== TEXT2) {
                    e2.setText(TEXT2);
                    log("T2 entered");
                }
                var submitBtn = textMatches(/Submit|SUBMIT/).findOne(200);
                if (submitBtn) {
                    click(submitBtn.bounds().centerX(), submitBtn.bounds().centerY());
                    t2Done = true;
                    log("Submit clicked");
                    sleep(2000);
                }
            }
        }

        // --- FALLBACKS (If buttons are invisible but state is advanced) ---
        if (t1Done && t2Done && !tasksStarted) {
            // Coordinate clicks for signing if text detection fails
            click(540, 1338); 
            sleep(500);
            click(540, 1221);
        }

    } catch (err) {
        log("State Loop Err: " + err);
    }

    sleep(1000); 
}

// Trigger next script
var nextScriptPath = "/storage/emulated/0/ajking/tasksa.js";
if (files.exists(nextScriptPath)) {
    engines.execScriptFile(nextScriptPath);
} else {
    toastLog("Error: tasksa.js file nahi mili!");
}
exit();