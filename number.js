var API_KEY = "7a59386130273197734175d23e6cac15a6a1";
var url = "https://api.temporasms.com/stubs/handler_api.php" +
          "?api_key=" + API_KEY +
          "&action=getNumberV2" +
          "&service=hxaj" +      // Joshjobs
          "&country=22" +        // India
          "&operator=10";

var activationId = null;
var number = null;
var currentName = ""; // नाम स्टोर करने के लिए वेरिएबल
log("नंबर ढूंढने का प्रोसेस शुरू...");
// 1
while (true) {
    var res = null;
    try {
        res = http.get(url);
    } catch (e) {
        log("नेटवर्क की समस्या: " + e + " | 5 सेकंड में दोबारा कोशिश...");
        sleep(5000);
        continue;
    }

    if (res && res.statusCode === 200) {
        var body = res.body.string().trim();
        log("पैनल का जवाब: " + body);

        if (body.startsWith("{")) {
            try {
                var jsonData = JSON.parse(body);
                if (jsonData.phoneNumber || jsonData.number) {
                    activationId = jsonData.activationId;
                    var rawNumber = String(jsonData.phoneNumber || jsonData.number);
                    number = rawNumber.replace(/^(\+?91)/, ""); 
                    
                    toastLog("🔥 नंबर मिल गया: " + number);
                    break; 
                }
            } catch (jsonErr) {
                log("JSON पार्स एरर: " + jsonErr);
            }
        }

        if (body.indexOf("ACCESS_NUMBER") === 0) {
            var parts = body.split(":");
            activationId = parts[1];
            number = parts[2].replace(/^(\+?91)/, "");
            
            toastLog("🔥 नंबर मिल गया: " + number);
            break; 
        } 
        
        if (body === "NO_NUMBERS") {
            log("⏳ स्टॉक खाली है (NO_NUMBERS)। 8 सेकंड में फिर प्रयास...");
            sleep(2000);
            continue; 
        } 
        
        if (body === "NO_BALANCE") {
            log("❌ बैलेंस खत्म!");
            alert("कृपया रीचार्ज करें!");
            exit();
        }
        if (body === "BAD_KEY") {
            log("❌ गलत API Key!");
            exit();
        }

        log("कोई अन्य रिस्पॉन्स, 5 सेकंड में रीट्राई...");
        sleep(2000);
    } else {
        log("सर्वर रिस्पॉन्स फेल, रीट्राई कर रहे हैं...");
        sleep(2000);
    }
}

// =====================
// OPEN FIREFOX ONLY
// =====================

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
setText("https://joshjobs.joshtalks.com/register?direct=true");
sleep(500);

// ENTER
shell("input keyevent 66", true);

sleep(3000);
// 2. नंबर को एडिट बॉक्स में पेस्ट करना
log("नंबर पेस्ट करने का प्रोसेस शुरू...");
var phoneField = className("EditText").text("Enter Phone Number").findOne(5000) || className("EditText").findOne(2000); 

if (phoneField) {
    phoneField.setText(number);
    log("नंबर बॉक्स में डाल दिया गया है।");
    
    var nextBtn = text("Next").findOne(2000) || text("Get OTP").findOne(2000);
    if (nextBtn) { 
        nextBtn.click(); 
        log("Next बटन पर क्लिक कर दिया गया।");
    }
} else {
    log("फोन नंबर का एडिट बॉक्स नहीं मिला!");
}

var cp = text("Send OTP").findOne(5000);
if (cp) {
    clickCenter(cp);
    log("Send OTP पर क्लिक किया गया।");
    sleep(1000);
}
sleep(1000);
var cn = text("Continue").findOne(5000);
if (cn) {
    clickCenter(cn);
    log("Continue पर क्लिक किया गया।");
    sleep(1000);
}
// 3. OTP का इन्तजार और पेस्ट करना
var otpStartTime = new Date().getTime();
var OTP_TIMEOUT = 180000; // 3 min

log("OTP का इन्तजार कर रहे हैं...");

while (true) {

    // 3 minute timeout
    if (new Date().getTime() - otpStartTime > OTP_TIMEOUT) {

        log("⏰ OTP timeout (3 min)");

        try {
            http.get(
                "https://api.temporasms.com/stubs/handler_api.php" +
                "?api_key=" + API_KEY +
                "&action=setStatus" +
                "&status=8" +
                "&id=" + activationId
            );

            log("✅ Number cancelled");
        } catch (e) {
            log("Cancel error: " + e);
        }
        toastLog("OTP timeout. Restarting script...");
        sleep(2000);
        engines.execScriptFile(engines.myEngine().source);
        exit();
    }

    var statusRes = null;

    try {
        statusRes = http.get(
            "https://api.temporasms.com/stubs/handler_api.php" +
            "?api_key=" + API_KEY +
            "&action=getStatus" +
            "&id=" + activationId
        );
    } catch(err) {
        sleep(5000);
        continue;
    }

    if (statusRes && statusRes.statusCode === 200) {

        var status = statusRes.body.string().trim();

        log("OTP Status: " + status);

        var finalOtp = null;

        if (status.indexOf("STATUS_OK:") === 0) {

            var otpMatch = status.split(":")[1].match(/\d{4}/);

            if (otpMatch) {
                finalOtp = otpMatch[0];
            }

        } else if (status.startsWith("{")) {

            try {

                var jsonStatus = JSON.parse(status);

                if (jsonStatus.status === "STATUS_OK" && jsonStatus.sms) {

                    var otpMatchJson = String(jsonStatus.sms).match(/\d{4}/);

                    if (otpMatchJson) {
                        finalOtp = otpMatchJson[0];
                    }
                }

            } catch(e) {}
        }

        if (finalOtp) {

            toastLog("🎉 OTP मिला: " + finalOtp);

            var allFields = className("EditText").find();
            var fields = [];

            for (var k = 0; k < allFields.length; k++) {

                if (
                    allFields[k].text() === "" ||
                    allFields[k].text().length <= 1
                ) {
                    fields.push(allFields[k]);
                }
            }

            if (fields.length >= 4) {

                for (var i = 0; i < 4; i++) {
                    fields[i].setText(finalOtp[i]);
                    sleep(250);
                }

                log("✅ OTP entered");

            } else {

                var fallbackField = className("EditText").findOne(2000);

                if (fallbackField) {
                    fallbackField.setText(finalOtp);
                }
            }

            break;
        }

        if (
            status === "STATUS_CANCEL" ||
            status === "STATUS_BANNED" ||
            status.indexOf("CANCEL") >= 0
        ) {

            log("❌ Number cancelled from panel");

            sleep(2000);

            engines.execScriptFile(engines.myEngine().source);
            exit();
        }
    }

    sleep(2000);
}

var op = findRetry(text("Verify OTP"));

if (op) {
    clickCenter(op);
    log("Verify OTP clicked");
    sleep(3000);
}
// 4. name.json से नाम निकालना, पेस्ट करना और डिलीट करना
log("नाम पेस्ट करने का प्रोसेस शुरू...");

var currentName = getAndRemoveFirstName();

if (!currentName) {
    log("❌ name.json खाली है या नहीं मिली!");
    exit();
}

var field = findRetry(className("android.widget.EditText"));

if (field) {
    field.setText(currentName);
    log("✅ Name entered: " + currentName);
    sleep(1500);

    // ==========================
    // Spinner -> Language Select
    // ==========================
    var spinner = findRetry(className("android.widget.Spinner"));

    if (spinner) {

        clickCenter(spinner);
        log("✅ Spinner clicked");

        sleep(1500);

        var config = getConfig();
        var targetLang = config.lang;
        var langFound = null;

        for (var i = 0; i < 5; i++) {

            langFound = findRetry(textContains(targetLang));

            if (langFound) {
                clickCenter(langFound);
                log("✅ Language selected: " + targetLang);
                break;
            }

            swipe(
                device.width / 2,
                device.height * 0.75,
                device.width / 2,
                device.height * 0.45,
                300
            );

            sleep(800);
        }

        if (!langFound) {
            log("❌ Language not found: " + targetLang);
        }

    } else {
        log("❌ Spinner not found");
    }

    sleep(1000);
    // rb.json update
    updateRbJson(number, currentName, config.lang);
} else {
    log("❌ Name field not found");
}
var opi = findRetry(text("Next"));
if (opi) {
    clickCenter(opi);
    log("Verify OTP पर क्लिक कर दिया गया।");
    sleep(3000); // अगले पेज (Name screen) के लोड होने का इंतज़ार
}
// =====================
// RUN NEXT SCRIPT
// =====================
sleep(5000);

try {
    var url = "https://raw.githubusercontent.com/ajaysbmoney05-alt/ajking/main/apply.js";

    var code = http.get(url).body.string();

    var nextScriptPath = "/storage/emulated/0/ajking/apply.js";

    files.write(nextScriptPath, code);

    engines.execScriptFile(nextScriptPath);

} catch (e) {
    toastLog("Failed to download tests.js: " + e);
}


// =========================================================
// ⚙️ कस्टम फंक्शन्स (Custom Functions Area)
// =========================================================

function findRetry(selector) {
    let obj = selector.findOne(1500);
    if (!obj) {
        log("Retrying search...");
        obj = selector.findOne(2000);
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

// name.json से पहली लाइन पढ़ने और उसे फाइल से हटाने का फंक्शन
function getAndRemoveFirstName() {
    var path = files.getSdcardPath() + "/ajking/name.json";
    if (!files.exists(path)) {
        log("फाइल नहीं मिली: " + path);
        return null;
    }
    
    try {
        var content = files.read(path).trim();
        if (!content) return null;
        
        var nameList = [];
        // अगर फाइल JSON Array फॉर्मेट `["name1", "name2"]` में है
        if (content.startsWith("[")) {
            nameList = JSON.parse(content);
            if (nameList.length === 0) return null;
            var firstName = nameList.shift(); // पहला नाम निकाला
            files.write(path, JSON.stringify(nameList, null, 4)); // बाकी नाम वापस सेव किये
            return firstName;
        } else {
            // अगर फाइल नॉर्मल लाइन-बाय-लाइन टेक्स्ट फॉर्मेट में है
            nameList = content.split("\n");
            var firstNameTxt = nameList.shift().trim(); // पहली लाइन निकाली
            files.write(path, nameList.join("\n")); // बाकी लाइन्स वापस सेव कीं
            return firstNameTxt;
        }
    } catch (err) {
        log("फाइल ऑपरेशन में एरर: " + err);
        return null;
    }
}

// rb.json में डेटा अपडेट करने का फंक्शन
function updateRbJson(num, name, device) {
    var path = files.getSdcardPath() + "/ajking/rb.json";
    try {
        files.ensureDir(files.getSdcardPath() + "/ajking/");
        
        // Format: [time, nothing, name, number, device]
        // Since number.js runs first, we initialize with empty time
        var rbData = ["", "", name, num, device];
        
        files.write(path, JSON.stringify(rbData));
        log("✅ rb.json initialized with user data!");
    } catch (e) {
        log("❌ rb.json update error: " + e);
    }
}

function clickCenter(element) {
    if (element) {
        var b = element.bounds();
        if (b) {
            var x = b.centerX();
            var y = b.centerY();
            click(x, y);
            return true;
        }
    }
    return false;
}
