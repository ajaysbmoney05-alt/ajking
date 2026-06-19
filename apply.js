auto.waitFor();

function findRetry(selector, quickTime, retryTime) {
    let q = quickTime || 800;
    let r = retryTime || 1500;
    let obj = selector.findOne(q);
    if (!obj) {
        log("Retrying search...");
        obj = selector.findOne(r);
    }
    return obj;
}

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

// 1. Config once load karein
var config = getConfig();
var targetJob = config.apply || "Dogri Transcription (Shortlisted only)";
var applied = false;

// Page 25 se 11 tak sequentially
for (var p = 25; p >= 11; p--) {
    // 2. Page Number Click (Timeout kam kiya)
    var target = desc(p.toString()).findOne(400) || text(p.toString()).findOne(400);
    
    if (target) {
        target.click();
        sleep(300); // Page transition time
    }

    // 3. Job Selection (Fast findRetry)
    var targetText = findRetry(textContains(targetJob), 800, 1200);

    if (targetText) {
        var parentBox = targetText.parent(); 
        var applyBtn = parentBox.findOne(text("Apply Now"));
        
        if (!applyBtn) {
            // Original logic preserved
            var allButtons = text("Apply Now").find();
            var targetRect = targetText.bounds();
            var bestBtn = null;
            var minDistance = 9999;
            
            allButtons.forEach(btn => {
                var btnRect = btn.bounds();
                var dist = Math.abs(btnRect.centerY() - targetRect.centerY());
                if (dist < minDistance) {
                    minDistance = dist;
                    bestBtn = btn;
                }
            });
            applyBtn = bestBtn;
        }
        
        if (applyBtn) {
            applyBtn.click();
            log("Sahi 'Apply Now' click ho gaya page " + p);
            applied = true;
            break; 
        }
    }
}

// 4. Next script (Keeping 5s sleep as requested)
sleep(5000);

try {
    var url = "https://raw.githubusercontent.com/ajaysbmoney05-alt/ajking/main/tests.js";

    var code = http.get(url).body.string();

    var nextScriptPath = "/storage/emulated/0/ajking/tests.js";

    files.write(nextScriptPath, code);

    engines.execScriptFile(nextScriptPath);

} catch (e) {
    toastLog("Failed to download tests.js: " + e);
}

exit();
