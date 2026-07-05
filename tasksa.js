auto.waitFor();

var loopCount = 0;

function rnd() {
    return random(300, 600);
}

// =====================
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
        var found5Min = false;

        var objs = textContains("5").find();

        for (var i = 0; i < objs.size(); i++) {

            var b = objs.get(i).bounds();

            if (b.centerX() < device.width / 2) {

                var t = objs.get(i).text();

                if (
                    t.indexOf("5 min") !== -1 ||
                    t.indexOf("5 mins") !== -1
                ) {
                    found5Min = true;
                    break;
                }
            }
        }

        // ====================
        // LOOP COUNT
        // ====================
        if (found5Min) {

            loopCount++;
            log("5 min detected. Loop: " + loopCount + "/5");

            if (loopCount >= 5) {

                try {
                    var nextScriptPath = "/storage/emulated/0/ajking/bank.js";
                    engines.execScriptFile(nextScriptPath);
                } catch (e) {
                    toastLog(e);
                }

                sleep(1000);
                exit();
            }

        } else {

            // Restart script if 5 min not found
            sleep(rnd());

            engines.execScriptFile(engines.myEngine().getSource().toString());
            exit();
        }

        sleep(rnd());

    } catch (e) {

        log("ERROR: " + e);
        sleep(100);

    }
}
