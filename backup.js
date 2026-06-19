auto.waitFor();

function clickCenter(obj) {
    if (!obj) return false;
    if (typeof obj.bounds !== 'function') {
        log("Object does not have bounds method");
        return false;
    }
    let b = obj.bounds();
    click(b.centerX(), b.centerY());
    return true;
}

function findRetry(selector) {
    let obj = selector.findOne(2000);
    if (!obj) {
        log("Retrying search...");
        obj = selector.findOne(8000);
    }
    return obj;
}

shell("am force-stop com.machiav3lli.backup", true);
sleep(1000);
app.launchPackage("com.machiav3lli.backup");
sleep(10000);
let ff = findRetry(text("Firefox"));

if (ff) {
    clickCenter(ff);
    sleep(300);
}
let bk = findRetry(text("Backup"));

if (bk) {
    clickCenter(bk);
    sleep(300);
}
sleep(300);

// Click APK
let apk = findRetry(text("APK"));

if (apk) {
    clickCenter(apk);
    sleep(300);
}

// Confirm Backup
let ok = findRetry(textMatches(/OK|Ok|Confirm/));

if (ok) {
    clickCenter(ok);
}

sleep(10000);

// =====================
// FIND TARGET BACKUP
// =====================

let latestDate = null;
let dateSelector = textMatches(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);
if (findRetry(dateSelector)) {
    let dateElements = dateSelector.find();

    if (dateElements.length > 0) {
        let topElement = dateElements[0];
        for (let i = 1; i < dateElements.length; i++) {
            if (dateElements[i].bounds().top < topElement.bounds().top) {
                topElement = dateElements[i];
            }
        }
        let fullDate = topElement.text();
        latestDate = fullDate;
        
        // Extract time (HH:mm:ss) from "YYYY-MM-DD HH:mm:ss"
        let timeOnly = "";
        let timeMatch = fullDate.match(/\d{2}:\d{2}:\d{2}/);
        if (timeMatch) {
            timeOnly = timeMatch[0];
        }

        let rbPath = "/storage/emulated/0/ajking/rb.json";
        files.ensureDir("/storage/emulated/0/ajking/");
        
        let rbData = ["", "", "", "", ""];
        if (files.exists(rbPath)) {
            try {
                let existingData = JSON.parse(files.read(rbPath));
                if (Array.isArray(existingData)) {
                    rbData = existingData;
                }
            } catch (e) {
                log("Error reading existing rb.json: " + e);
            }
        }
        
        // Format: [time, nothing, name, number, device]
        rbData[0] = timeOnly;
        files.write(rbPath, JSON.stringify(rbData));
        
        toastLog("Latest backup time saved to rb.json: " + timeOnly);
    }
}

// =====================
// RESTORE OLD BACKUP
// =====================

let targetDate = "2026-06-05 15:51:42";
let targetFound = false;

for (let i = 0; i < 25; i++) {

    let target = text(targetDate).findOnce();

    if (target) {

        targetFound = true;

        let targetY = target.bounds().centerY();

        let restores = text("Restore").find();

        let best = null;
        let bestDist = 999999;

        restores.forEach(r => {
            let dist = Math.abs(
                r.bounds().centerY() - targetY
            );

            if (dist < bestDist) {
                bestDist = dist;
                best = r;
            }
        });

        if (best) {

            clickCenter(best);
            sleep(1500);

            let restoreOk = findRetry(textMatches(/OK|Ok|Confirm/));

            if (restoreOk) {
                clickCenter(restoreOk);
            }

            sleep(5000);
        }

        break;
    }

    swipe(
        device.width / 2,
        1800,
        device.width / 2,
        500,
        300
    );

    sleep(1000);
}

if (!targetFound) {
    exit();
}

// =====================
// UPLOAD DATA & CLEANUP
// =====================
let rbPath = "/storage/emulated/0/ajking/rb.json";
if (files.exists(rbPath)) {
    try {
        let rbData = JSON.parse(files.read(rbPath));
        // Format: [time, nothing, name, number, device]
        if (Array.isArray(rbData) && rbData.length >= 5) {
            let time = rbData[0];
            let name = rbData[2];
            let num = rbData[3];
            let dev = rbData[4];

            updateGoogleSheet(num, name, dev, time);

            // Clear rb.json
            files.remove(rbPath);
            toastLog("Data uploaded and rb.json cleared");
        }
    } catch (e) {
        log("Upload/Cleanup error: " + e);
    }
}

// =====================
// RUN NEXT SCRIPT
// =====================
sleep(5000);

try {
    var url = "https://raw.githubusercontent.com/ajaysbmoney05-alt/ajking/main/number.js";

    var code = http.get(url).body.string();

    var nextScriptPath = "/storage/emulated/0/ajking/number.js";

    files.write(nextScriptPath, code);

    engines.execScriptFile(nextScriptPath);

} catch (e) {
    toastLog("Failed to download tests.js: " + e);
}


// =========================================================
// ⚙️ कस्टम फंक्शन्स (Custom Functions Area)
// =========================================================

function updateGoogleSheet(num, name, device, time) {
    var GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwDkHyfT4gjbMDVJCQ1p33Rxw3i9lmcTnnsWTmA-tGkUCROle9kMFW2JZ4MWYmZgCt1jQ/exec";
    try {
        var res = http.postJson(GOOGLE_SCRIPT_URL, {
            "number": num,
            "name": name,
            "device": device,
            "time": time
        });
        if (res && res.statusCode === 200) {
            log("✅ Google Sheet updated successfully!");
        } else {
            log("❌ Google Sheet update failed. Status: " + (res ? res.statusCode : "No response"));
        }
    } catch (e) {
        log("❌ Google Sheet network error: " + e);
    }
}

exit();
