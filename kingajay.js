// ==UserScript==
// @name         Pro Transcription Automation (Stability Patch v14)
// @namespace    https://github.com/ajaysbmoney05-alt
// @version      15.0
// @match        *://*/*
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/ajaysbmoney05-alt/ajking/main/kingajay.js
// @updateURL    https://raw.githubusercontent.com/ajaysbmoney05-alt/ajking/main/kingajay.js
// ==/UserScript==

(async () => {
    'use strict';

    const CONFIG = {
        PROFILE: "P01",
        API_URL: "https://king.ajaykokate.online/v1/chat/completions",
        SYSTEM_PROMPT: "Remove all English alphabets and symbols. " +
                        "Do not correct grammar, pronunciation, or wording. " +
                        "Do not guess unclear words. " +
                        "Remove all special characters. " +
                        "Return text in the same language as input. " +
                        "Never repeat, duplicate, or restart any word, phrase, sentence, or any part of the text. Every part of the output must appear exactly once. " +
                        "Return the entire corrected text as a single continuous line. Never insert line breaks, newlines, or paragraph breaks. " +
                        "Never translate. " +
                        "Never add words. " +
                        "Do not explain. " +
                        "Output only corrected text.\n\n",
        PASTE_WAIT: 20000,
        AI_TIMEOUT: 20000,
        LOG_LIMIT: 10,
        JITTER_MIN: 1000,
        JITTER_MAX: 3000,
        COOLDOWN_FAIL_LIMIT: 3,
        COOLDOWN_TIME: 30000,
        SHEET_URL: "https://script.google.com/macros/s/AKfycby59yad9faY1EAcB2aoWsJi33wCv-saZ_9ffaVh2OT5xmvpdAXpeRLMOvZrfITTGCAu/exec"
    };

    const STATE = {
        status: "RUNNING",
        currentStep: "Initializing",
        lastProcessedText: "",
        processing: false,
        lastAiResponse: "No response yet.",
        consecutiveFails: 0,
        countdown: null,
        logs: [],
        currentTextPreview: "",
        instanceID: null,
        lastSentStep: null,
        lastSentQuality: null,
        lastSentEarnings: null,
        lastSentCountdown: null
    };

    // Sleep function with fallback to prevent browser throttling
    const sleep = (ms) => new Promise(resolve => {
        const start = Date.now();
        function check() {
            if (Date.now() - start >= ms) {
                resolve();
            } else {
                // Use both requestAnimationFrame and setTimeout as fallback
                requestAnimationFrame(check);
                setTimeout(check, 10); // extra wakeup
            }
        }
        requestAnimationFrame(check);
    });

    // Helper: Find visible element by text (avoiding matching parent containers)
    const findEl = (text) => {
        const els = Array.from(document.querySelectorAll('button, div, span, a'))
            .filter(e => e.innerText?.trim() === text && (e.offsetWidth > 0 || e.offsetHeight > 0));
        return els.find(e => !els.some(other => other !== e && e.contains(other)));
    };

    // Helper: Get current quality from the Okay/Poor button
    function getCurrentQuality() {
        const qualityEl = document.querySelector('.ChunkTranscription-module__00EzxW__okay_btn');
        if (qualityEl) {
            const text = qualityEl.textContent.trim();
            if (text === 'Okay' || text === 'Poor') {
                return text;
            }
        }
        return null;
    }

    // Helper: Get current earnings from the table cell (specifically the one with ₹)
    function getCurrentEarnings() {
        try {
            const cells = Array.from(document.querySelectorAll('.WorkReport-module__x6OV4a__tableCell'));
            const earningEl = cells.find(td => td.textContent.includes('₹'));
            if (earningEl) return earningEl.textContent.trim();
        } catch {}
        return "N/A";
    }

    // Helper: Get dynamic wait time based on audio timestamps
    function getDynamicWaitTime() {
        const spans = Array.from(document.querySelectorAll('span'));
        // Filter spans that look like timestamps (e.g., 0:00.0 or 1:23.4)
        const timeSpans = spans.filter(s => /^\d+:\d+(\.\d+)?$/.test(s.textContent.trim()));

        if (timeSpans.length >= 2) {
            // The second timestamp is the end time
            const timeStr = timeSpans[1].textContent.trim();
            const parts = timeStr.split(':');
            const minutes = parseInt(parts[0], 10);
            const seconds = parseFloat(parts[1]);
            const totalSeconds = (minutes * 60) + seconds;

            // Wait time = duration * 2, minimum 15 seconds
            const waitSeconds = Math.max(18, totalSeconds * 2);
            return Math.ceil(waitSeconds); // return as integer seconds
        }
        return 18; // fallback to 15 seconds if timestamps not found
    }

    // Helper: Initialize and get instance ID (stored in window.name)
    function initializeInstanceID() {
        if (!window.name) {
            const randomID = 'P' + Math.floor(100 + Math.random() * 900);
            window.name = randomID;
        }
        return window.name;
    }

    // Helper: Send data to Google Sheet (using Image to avoid CORS issues)
    let blinkCounter = 0;
    function sendToSheet(instance, step, quality, earnings, countdown) {
        if (!CONFIG.SHEET_URL) return;
        try {
            blinkCounter++; // Increment on every call
            const url = new URL(CONFIG.SHEET_URL);
            url.searchParams.set('instance', instance);
            url.searchParams.set('step', step);
            url.searchParams.set('quality', quality || 'Unknown');
            url.searchParams.set('earnings', earnings || 'N/A');
            url.searchParams.set('countdown', countdown !== null ? String(countdown) : '0');
            url.searchParams.set('blink', blinkCounter % 2 === 0 ? '1' : '0'); // Alternate every call
            url.searchParams.set('_', Date.now()); // cache-busting
            // Use Image to send GET request (more reliable than fetch with no-cors)
            new Image().src = url.toString();
        } catch (e) {}
    }

    // Helper: Click element safely (using forceClick as the primary robust clicker)
    const clickEl = (el) => {
        return forceClick(el);
    };

    // Log tracking (minimal console only)
    const log = (msg, step = null) => {
        if (step) STATE.currentStep = step;
        STATE.logs = STATE.logs || [];
        const timestamp = new Date().toLocaleTimeString();
        STATE.logs.unshift(`[${timestamp}] ${msg}`);
        if (STATE.logs.length > CONFIG.LOG_LIMIT) STATE.logs.pop();
        console.log(`%c[${STATE.instanceID || CONFIG.PROFILE}] ${STATE.currentStep || 'SYSTEM'}: ${msg}`, 'color: #dfe6e9; background: #2d3436; padding: 2px 4px; border-radius: 3px;');
    };

    // Hash profile name to a unique, consistent HSL color
    function getProfileColor(profile) {
        let hash = 0;
        for (let i = 0; i < profile.length; i++) {
            hash = profile.charCodeAt(i) + ((hash << 5) - hash);
        }
        const hue = Math.abs(hash) % 360;
        return `hsl(${hue}, 85%, 60%)`;
    }

    // AI correction function
    async function aiFix(textInput) {
        STATE.status = "🔵 AI";
        STATE.currentStep = "AI";

        const jitter = Math.floor(Math.random() * (CONFIG.JITTER_MAX - CONFIG.JITTER_MIN + 1)) + CONFIG.JITTER_MIN;
        log(`Calling AI API in ${(jitter/1000).toFixed(1)}s (jitter)...`);
        await sleep(jitter);

        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), CONFIG.AI_TIMEOUT);

        try {
            const res = await fetch(CONFIG.API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: "gpt-4", provider: "CopilotApp", temperature: 0,
                    messages: [
                        { role: "system", content: CONFIG.SYSTEM_PROMPT },
                        { role: "user", content: textInput }
                    ]
                }),
                signal: controller.signal
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const data = await res.json();
            const fixed = data.choices?.[0]?.message?.content?.trim();

            if (fixed && typeof fixed === "string" && fixed.trim() !== "") {
                STATE.consecutiveFails = 0;
                STATE.lastAiResponse = fixed;
                log("AI fix successful.");
                return fixed;
            } else {
                throw new Error("Invalid/empty response payload");
            }
        } catch (e) {
            STATE.consecutiveFails++;
            if (e.name === 'AbortError') log("AI API call timed out!", "AI Fail");
            else log(`AI API call failed: ${e.message}`, "AI Fail");

            if (STATE.consecutiveFails >= CONFIG.COOLDOWN_FAIL_LIMIT) {
                log(`Too many failures. Cooling down for ${CONFIG.COOLDOWN_TIME/1000}s...`, "Cooldown");
                STATE.status = "🔴 COOLDOWN";
                await sleep(CONFIG.COOLDOWN_TIME);
                STATE.consecutiveFails = 0;
            }
        } finally {
            clearTimeout(tid);
        }
        return null;
    }

    // Double submit handling sequence
    async function submitTask() {
        STATE.status = "🟣 SUBMIT";
        STATE.currentStep = "Submit";
        log("Submitting main task...");

        const submits = Array.from(document.querySelectorAll("button"))
            .filter(e => e.innerText?.trim() === "Submit" && (e.offsetWidth > 0 || e.offsetHeight > 0));

        if (submits.length > 0) {
            clickEl(submits[0]);
        } else {
            const fallbackSubmit = findEl("Submit");
            if (fallbackSubmit) clickEl(fallbackSubmit);
            else { log("Submit button not found!", "Submit"); return; }
        }

        await sleep(1000);
        STATE.currentStep = "Popup";
        log("Confirming popup submission...");

        const submits2 = Array.from(document.querySelectorAll("button"))
            .filter(e => e.innerText?.trim() === "Submit" && (e.offsetWidth > 0 || e.offsetHeight > 0));

        if (submits2.length > 1) {
            clickEl(submits2[submits2.length - 1]);
            log("Popup submit clicked.");
        } else {
            const okBtn = findEl("OK") || findEl("Confirm");
            if (okBtn) { clickEl(okBtn); log("Popup OK clicked."); }
            else log("Popup confirmation not detected.");
        }
    }

    // Robust multi-strategy refresh button finder
    function findRefreshBtn() {
        let btn = document.querySelector('button[class*="refresh_button"]');
        if (btn) return btn;

        btn = [...document.querySelectorAll("button")].find(b => b.textContent.trim() === "Refresh");
        if (btn) return btn;

        const exact = findEl("Refresh");
        if (exact) return exact;

        const allClickable = Array.from(document.querySelectorAll('button, div, span, a, [role="button"], [role="link"]'))
            .filter(e => e.offsetWidth > 0 || e.offsetHeight > 0);
        const caseInsensitive = allClickable.find(e => e.textContent?.trim().toLowerCase() === "refresh");
        if (caseInsensitive) return caseInsensitive;

        const ariaMatch = document.querySelector('[aria-label*="refresh" i], [title*="refresh" i], [data-tooltip*="refresh" i]');
        if (ariaMatch && (ariaMatch.offsetWidth > 0 || ariaMatch.offsetHeight > 0)) return ariaMatch;

        return null;
    }

    // More reliable click
    function forceClick(el) {
        if (!el) return false;
        try {
            el.scrollIntoView({ behavior: "instant", block: "center", inline: "center" });
        } catch {}
        const rect = el.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;

        ["pointerdown", "mousedown", "click"].forEach(type => {
            el.dispatchEvent(new MouseEvent(type, {
                bubbles: true,
                cancelable: true,
                clientX: x,
                clientY: y
            }));
        });
        el.click?.();
        return true;
    }

    // Robust Refresh polling with retry loop
    async function refreshTask(oldTextarea, oldText) {
        STATE.status = "🔄 REFRESH";
        STATE.currentStep = "Refresh";
        log("Waiting for refresh button to appear...");

        const startTime = Date.now();
        const timeout = 8000;
        let refreshBtn = null;
        let clicked = false;

        while (Date.now() - startTime < timeout) {
            refreshBtn = findRefreshBtn();
            if (refreshBtn) {
                const isVisible = refreshBtn.offsetWidth > 0 || refreshBtn.offsetHeight > 0;
                const isDisabled = refreshBtn.hasAttribute('disabled') || refreshBtn.classList.contains('disabled');
                if (isVisible && !isDisabled) {
                    clicked = forceClick(refreshBtn);
                    if (clicked) {
                        log(`Refresh clicked successfully: "${refreshBtn.textContent.trim()}"`);
                        break;
                    }
                }
            }
            await sleep(200);
        }

        if (!clicked) {
            log("Refresh button not found or click failed within timeout!", "Refresh");
            return;
        }

        const waitStart = Date.now();
        const waitTimeout = 5000;
        while (Date.now() - waitStart < waitTimeout) {
            await sleep(100);
            const currentTextarea = document.querySelector('textarea:not([disabled])');
            if (oldTextarea && !document.body.contains(oldTextarea)) break;
            if (currentTextarea && currentTextarea.value.trim() !== oldText) break;
        }
        log("Refresh completed.");
    }

    // Main work cycle
    async function processTask() {
        if (STATE.processing) { await sleep(100); return; }

        const textarea = document.querySelector('textarea:not([disabled])');
        if (!textarea) {
            STATE.status = "🟡 WAITING";
            STATE.currentStep = "Waiting Textarea";
            STATE.currentTextPreview = "No active textarea found.";
            return;
        }

        const text = textarea.value.trim();
        STATE.currentTextPreview = text.slice(0, 40) + (text.length > 40 ? "..." : "");

        if (text === "") {
            STATE.processing = true;
            STATE.status = "🟣 BLANK";
            STATE.currentStep = "Submit";
            log("Blank Task Detected.");
            await sleep(4000);

            const blankBtn = findEl("Mark as Blank Audio") || document.querySelector('div[class*="blank_mark_btn"]');
            if (blankBtn) {
                clickEl(blankBtn);
                await sleep(500);
                STATE.currentStep = "Popup";
                await sleep(300);
                const allBtns = Array.from(document.querySelectorAll('button')).filter(e => e.offsetWidth > 0 || e.offsetHeight > 0);
                const okBtn = findEl("OK") || findEl("Confirm") || findEl("Yes") ||
                    document.querySelector('button[class*="confirm"], button[class*="ok"]') || allBtns[allBtns.length - 1];
                if (okBtn) { clickEl(okBtn); log("Blank popup OK clicked."); }
                else log("Blank popup OK not found.");
                await sleep(1000);
            } else {
                log("Mark btn not found. Pasting [blank] and submitting...", "Submit");
                const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set;
                setter.call(textarea, "[blank]");
                textarea.dispatchEvent(new InputEvent("input", { bubbles: true }));
                textarea.dispatchEvent(new Event("change", { bubbles: true }));
                textarea.dispatchEvent(new Event("blur", { bubbles: true }));
                await sleep(500);
                await submitTask();
                await sleep(1000);
            }

            const transitionStart = Date.now();
            while (Date.now() - transitionStart < 5000) {
                await sleep(100);
                const currentTextarea = document.querySelector('textarea:not([disabled])');
                if (textarea && !document.body.contains(textarea)) break;
                if (currentTextarea && currentTextarea.value.trim() !== "") break;
            }
            STATE.processing = false;
            STATE.status = "🟢 RUNNING";
            STATE.currentStep = "Idle";
        } else if (text.toLowerCase() === "[blank]") {
            STATE.processing = true;
            STATE.status = "🟣 BLANK";
            STATE.currentStep = "Submit";
            await sleep(4000);
            log("[blank] text detected. Submitting directly...");
            STATE.lastProcessedText = text;
            await submitTask();
            const transitionStart2 = Date.now();
            while (Date.now() - transitionStart2 < 5000) {
                await sleep(100);
                const currentTextarea = document.querySelector('textarea:not([disabled])');
                if (textarea && !document.body.contains(textarea)) break;
                if (currentTextarea && currentTextarea.value.trim() !== text) break;
            }
            STATE.processing = false;
            STATE.status = "🟢 RUNNING";
            STATE.currentStep = "Idle";
        } else if (text !== "" && text !== STATE.lastProcessedText) {
            STATE.processing = true;
            const fixed = await aiFix(text);
            if (!fixed) {
                STATE.processing = false;
                STATE.status = "🟢 RUNNING";
                STATE.currentStep = "Idle";
                return;
            }

            STATE.status = "🟢 PASTE";
            STATE.currentStep = "Paste";
            log("Pasting fixed text...");
            textarea.focus();
            const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set;
            setter.call(textarea, fixed);
            textarea.dispatchEvent(new InputEvent("input", { bubbles: true }));
            textarea.dispatchEvent(new Event("change", { bubbles: true }));
            textarea.dispatchEvent(new Event("blur", { bubbles: true }));
            STATE.lastProcessedText = text;

            const waitSeconds = getDynamicWaitTime();
            log(`Waiting for ${waitSeconds}s (Dynamic Wait)...`);
            for (let i = waitSeconds; i > 0; i--) {
                STATE.currentStep = `Wait Countdown`;
                STATE.countdown = i;
                console.log(`%c[COUNTDOWN] ${i}s remaining...`, 'color: #fdcb6e; font-weight: bold;');
                await sleep(1000);
            }
            STATE.countdown = null;

            await submitTask();
            await refreshTask(textarea, text);
            STATE.processing = false;
            STATE.status = "🟢 RUNNING";
            STATE.currentStep = "Idle";
        } else {
            STATE.status = "🟢 RUNNING";
            STATE.currentStep = "Idle";
        }
    }

    // UI Interface removed for RAM optimization
    // Initialize Instance ID
    const instanceID = initializeInstanceID();
    STATE.instanceID = instanceID;
    log("System Initialized.", "Idle");

    // Send initial state to sheet
    const initialQuality = getCurrentQuality();
    const initialEarnings = getCurrentEarnings();
    const initialCountdown = STATE.countdown;
    sendToSheet(instanceID, STATE.currentStep, initialQuality, initialEarnings, initialCountdown);

    // Set up interval to update sheet every 2 seconds (countdown value + blink)
    setInterval(() => {
        const currentStep = STATE.currentStep;
        const currentQuality = getCurrentQuality();
        const currentEarnings = getCurrentEarnings();
        const currentCountdown = STATE.countdown;
        sendToSheet(instanceID, currentStep, currentQuality, currentEarnings, currentCountdown);
    }, 2000);

    // --- MAIN EXECUTION LOOP ---
    let loopCount = 0;
    while (true) {
        try {
            loopCount++;
            if (loopCount % 20 === 0) { // Log every 20 loops (approx 10s) to avoid spam
                console.log(`%c[LOOP] Cycle ${loopCount} | Status: ${STATE.status} | Step: ${STATE.currentStep} | Processing: ${STATE.processing}`, 'color: #0984e3; font-weight: bold;');
            }
            await processTask();
        } catch (e) {
            log(`Err: ${e.message}`, "CRASH");
            console.error(`%c[CRASH] ${e.message}`, 'color: #d63031; font-weight: bold;');
            STATE.processing = false;
        }
        await sleep(500);
    }
})();
