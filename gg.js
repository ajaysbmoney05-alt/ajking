auto.waitFor();

// ==========================================
// CONFIGURATION & PATHS
// ==========================================
const OP_PATH = "/storage/emulated/0/ajking/op.json";
const RB_PATH = "/storage/emulated/0/ajking/rb.json";
const NEXT_SCRIPT_PATH = "/storage/emulated/0/ajking/tasksa.js";
const DEFAULT_TIMESTAMP = "2026-06-05 15:51:42";
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwDkHyfT4gjbMDVJCQ1p33Rxw3i9lmcTnnsWTmA-tGkUCROle9kMFW2JZ4MWYmZgCt1jQ/exec";
const NEXT_SCRIPT_URL = "https://raw.githubusercontent.com/ajaysbmoney05-alt/ajking/main/tasksa.js";

// ==========================================
// HELPER FUNCTIONS
// ==========================================
function clickCenter(obj) {
    if (!obj) return false;
    let b = obj.bounds();
    click(b.centerX(), b.centerY());
    return true;
}

function findRetry(selector) {
    let obj = selector.findOne(2000);
    if (!obj) obj = selector.findOne(8000);
    return obj;
}

function updateGoogleSheet(num, name, device, time) {
    try {
        var res = http.postJson(GOOGLE_SCRIPT_URL, {
            "number": num, "name": name, "device": device, "time": time
        });
        if (res && res.statusCode === 200) log("✅ Google Sheet updated!");
        else log("❌ Google Sheet update failed: " + (res ? res.statusCode : "No response"));
    } catch (e) { log("❌ Google Sheet error: " + e); }
}

// ==========================================
// 1. LAUNCH & SETUP
// ==========================================
shell("am force-stop com.machiav3lli.backup", true);
sleep(1000);
app.launchPackage("com.machiav3lli.backup");
sleep(7000);
swipe(device.width / 2, 500, device.width / 2, 1800, 300);
sleep(2000);
let ff = findRetry(text("Firefox"));
if (ff) {
    clickCenter(ff);
    sleep(2000);
}

// Read op.json
if (!files.exists(OP_PATH)) {
    files.ensureDir(OP_PATH);
    files.write(OP_PATH, JSON.stringify({ timestamp: DEFAULT_TIMESTAMP }));
}
let opData = JSON.parse(files.read(OP_PATH));
let currentTimestamp = opData.timestamp;
log("Looking for: " + currentTimestamp);

// ==========================================
// 2. SWIPE & FIND CURRENT BACKUP
// ==========================================
let targetFound = false;
let currentBackupObj = null;

for (let i = 0; i < 20; i++) {
    currentBackupObj = text(currentTimestamp).findOnce();
    
    if (currentBackupObj) {
        targetFound = true;
        log("Found current backup at loop: " + i);
        break;
    }

    log("Swiping to find: " + currentTimestamp);
    swipe(device.width / 2, 1800, device.width / 2, 500, 300);
    sleep(1500);
}

if (!targetFound) {
    toastLog("Timestamp not found after scrolling. Exiting.");
    exit();
}

// ==========================================
// 3. FIND IMMEDIATELY NEWER BACKUP
// ==========================================
// स्क्रीन पर मौजूद सभी टाइमस्टैम्प्स (जो डेट फॉर्मेट में दिखते हैं) को ढूँढना
let allTimestamps = textMatches(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/).find();

let sortedBackups = [];
allTimestamps.forEach(b => {
    sortedBackups.push({ text: b.text(), y: b.bounds().centerY(), obj: b });
});

// Y-coordinate के हिसाब से सॉर्ट करें (Newest ऊपर)
sortedBackups.sort((a, b) => a.y - b.y);

let currentIndex = sortedBackups.findIndex(b => b.text === currentTimestamp);
let newerIndex = currentIndex - 1; // ऊपर वाला आइटम मतलब Newer

if (newerIndex < 0) {
    toastLog("No newer backup found");
    exit();
}

let newerBackup = sortedBackups[newerIndex];
let newerTimestamp = newerBackup.text;
log("Found Newer Backup: " + newerTimestamp);

// ==========================================
// 4. UPDATE FILES & RESTORE (UPDATED)
// ==========================================

// Overwrite op.json with newer timestamp
files.write(OP_PATH, JSON.stringify({ timestamp: newerTimestamp }));

let newerTimeOnly = newerTimestamp.split(" ")[1]; // HH:mm:ss निकालें
let rbData = [newerTimeOnly, "", "Reworked", "", "kashmiri"]; // Default Format if not exists

if (files.exists(RB_PATH)) {
    try {
        let fileContent = files.read(RB_PATH);
        let parsedData = JSON.parse(fileContent);
        if (Array.isArray(parsedData) && parsedData.length >= 5) {
            rbData = parsedData;
            rbData[0] = newerTimeOnly; // सिर्फ index 0 (समय) अपडेट करें
        }
    } catch (e) {
        log("rb.json read error, using default layout: " + e);
    }
} else {
    log("rb.json not found. Creating new file with default structure.");
    files.ensureDir(RB_PATH);
}

// फ़ाइल को अपडेटेड डेटा के साथ सेव करें
files.write(RB_PATH, JSON.stringify(rbData));

// रीस्टोर से ठीक पहले Google Sheet पर अपलोड करें (ताकि डेटा मिस न हो)
let num = rbData[3];
let name = rbData[2];
let dev = rbData[4];
let time = rbData[0];

// Click Restore button near the newer backup
let restores = text("Restore").find();
let bestRestoreBtn = null;
let bestDist = 999999;

restores.forEach(r => {
    let dist = Math.abs(r.bounds().centerY() - newerBackup.y);
    if (dist < bestDist) {
        bestDist = dist;
        bestRestoreBtn = r;
    }
});

if (bestRestoreBtn) {
    clickCenter(bestRestoreBtn);
    sleep(1500);
    let restoreOk = findRetry(textMatches(/OK|Ok|Confirm/));
    if (restoreOk) clickCenter(restoreOk);
    sleep(10000); // Restore होने के लिए सेफ टाइमिंग
} else {
    toastLog("Restore button not found");
    exit();
}

app.launchPackage("org.mozilla.firefox");
shell("am force-stop com.machiav3lli.backup", true);
sleep(5000);
// =====================
// ADDRESS BAR FIX (RETRY + FORCE TAP)
// =====================

var x = 419;
var y = 172;

// multiple attempts (UI lag fix)
for (var i = 0; i < 3; i++) {
    click(x, y);
    sleep(400);
}

sleep(500);

// force focus check
click(x, y);
sleep(500);
// set URL
setText("https://joshjobs.joshtalks.com/transcription?job_id=757");
sleep(500);
// ENTER
shell("input keyevent 66", true);
sleep(6000);
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
// ==========================================
// 5. UPLOAD & NEXT SCRIPT
// ==========================================
if (files.exists(RB_PATH)) {
    let rbData = JSON.parse(files.read(RB_PATH));
    updateGoogleSheet(rbData[3], rbData[2], rbData[4], rbData[0]);
    files.remove(RB_PATH);
    toastLog("Data uploaded and rb.json cleared");
}

sleep(3000);
try {
    var code = http.get(NEXT_SCRIPT_URL).body.string();
    files.write(NEXT_SCRIPT_PATH, code);
    engines.execScriptFile(NEXT_SCRIPT_PATH);
} catch (e) {
    toastLog("Failed to run next script: " + e);
}

exit();
