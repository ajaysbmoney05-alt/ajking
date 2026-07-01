auto.waitFor();

var MAIN = "/sdcard/ajking/tasksa.js";
var STOP = "/sdcard/ajking/watcher.stop";

while (true) {
    try {

        // Main ne bola stop ho jao
        if (files.exists(STOP)) {
            files.remove(STOP);
            log("Stop signal received.");
            exit();
        }

        var running = false;
        var list = engines.all();

        for (var i = 0; i < list.length; i++) {

            try {
                var src = list[i].getSource();

                if (src && src.toString() == MAIN) {
                    running = true;
                    break;
                }

            } catch (e) {}
        }

        // Main crash ho gaya
        if (!running) {

            log("Main crashed. Restarting...");

            if (files.exists(MAIN)) {
                engines.execScriptFile(MAIN);
            }

            // Restart ke baad watcher khud band
            exit();
        }

    } catch (e) {
        log("Watcher Error: " + e);
    }

    sleep(3000);
}
