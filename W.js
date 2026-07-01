auto.waitFor();

var MAIN_SCRIPT = "/sdcard/ajking/tasksa.js";   // <-- apne main script ka path

toast("Watchdog Started");

while (true) {
    try {

        var running = false;
        var list = engines.all();

        for (var i = 0; i < list.length; i++) {

            var engine = list[i];

            try {
                var src = engine.getSource();

                if (src && src.toString() == MAIN_SCRIPT) {
                    running = true;
                    break;
                }
            } catch (e) {}
        }

        if (!running) {

            log("Main script not running. Restarting...");

            if (files.exists(MAIN_SCRIPT)) {
                engines.execScriptFile(MAIN_SCRIPT);
                sleep(3000);
            } else {
                log("Main script not found: " + MAIN_SCRIPT);
            }
        }

    } catch (e) {
        log("Watchdog Error: " + e);
    }

    sleep(5000); // har 5 sec check
}
