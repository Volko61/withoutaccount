/**
 * QR Code Tool Logic
 * Handles generation and scanning functionality
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- State & DOM Elements ---
    const state = {
        lastContent: '',
        isScanning: false,
        qrCodeInstance: null,
        html5QrCode: null
    };

    const els = {
        tabs: document.querySelectorAll('.tab-btn'),
        sections: {
            generator: document.getElementById('section-generator'),
            scanner: document.getElementById('section-scanner')
        },
        gen: {
            text: document.getElementById('qr-input-text'),
            colorDark: document.getElementById('qr-color-dark'),
            colorDarkVal: document.getElementById('qr-color-dark-val'),
            colorLight: document.getElementById('qr-color-light'),
            colorLightVal: document.getElementById('qr-color-light-val'),
            size: document.getElementById('qr-size'),
            level: document.getElementById('qr-correct-level'),
            output: document.getElementById('qr-output'),
            download: document.getElementById('btn-download-png')
        },
        scan: {
            container: document.getElementById('reader'),
            resultBox: document.getElementById('scan-result-container'),
            resultText: document.getElementById('scan-result'),
            btnStart: document.getElementById('btn-start-scan'),
            btnStop: document.getElementById('btn-stop-scan'),
            btnCopy: document.getElementById('btn-copy-result'),
            btnOpen: document.getElementById('btn-open-result'),
            fileInput: document.getElementById('scan-file-input')
        }
    };

    // --- Tab Switching ---
    window.switchTab = (tabName) => {
        // Update buttons
        els.tabs.forEach(btn => {
            if (btn.id === `tab-${tabName}`) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Update sections
        Object.keys(els.sections).forEach(key => {
            if (key === tabName) {
                els.sections[key].classList.remove('hidden');
                // Trigger resize in case of layout shifts affecting canvas
                if (key === 'generator') generateQR();
            } else {
                els.sections[key].classList.add('hidden');
                if (key === 'scanner' && state.isScanning) stopScanner();
            }
        });
    };

    // --- Generator Logic ---

    function initGenerator() {
        // Debounce text input
        let debounceTimer;
        els.gen.text.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(generateQR, 300);
        });

        // Direct updates for other inputs
        [els.gen.colorDark, els.gen.colorLight, els.gen.size, els.gen.level].forEach(input => {
            input.addEventListener('input', (e) => {
                if (e.target === els.gen.colorDark) els.gen.colorDarkVal.textContent = e.target.value;
                if (e.target === els.gen.colorLight) els.gen.colorLightVal.textContent = e.target.value;
                generateQR();
            });
        });

        // Download
        els.gen.download.addEventListener('click', downloadQR);

        // Initial generation
        els.gen.text.value = 'https://withoutaccount.com';
        generateQR();
    }

    function generateQR() {
        const text = els.gen.text.value || ' '; // Empty string might fail in some libs
        const size = parseInt(els.gen.size.value) || 300;
        const colorDark = els.gen.colorDark.value;
        const colorLight = els.gen.colorLight.value;
        const correctLevel = QRCode.CorrectLevel[els.gen.level.value];

        // Clear previous
        els.gen.output.innerHTML = '';

        try {
            state.qrCodeInstance = new QRCode(els.gen.output, {
                text: text,
                width: size,
                height: size,
                colorDark: colorDark,
                colorLight: colorLight,
                correctLevel: correctLevel
            });

            // Adjust title attribute to not show annoying tooltip on hover
            setTimeout(() => {
                const img = els.gen.output.querySelector('img');
                if (img) img.title = '';
            }, 100);

        } catch (e) {
            console.error("QR Gen Error:", e);
        }
    }

    function downloadQR() {
        // Re-find the img tag as the library creates a new one on generation
        const img = els.gen.output.querySelector('img');
        if (!img || !img.src) {
            // If the library renders canvas instead of img (browser dependent sometimes)
            const canvas = els.gen.output.querySelector('canvas');
            if (canvas) {
                triggerDownload(canvas.toDataURL("image/png"));
                return;
            }
            return;
        }
        triggerDownload(img.src);
    }

    function triggerDownload(url) {
        const a = document.createElement('a');
        a.href = url;
        a.download = 'qrcode.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }


    // --- Scanner Logic ---

    function initScanner() {
        els.scan.btnStart.addEventListener('click', startScanner);
        els.scan.btnStop.addEventListener('click', stopScanner);

        els.scan.fileInput.addEventListener('change', (e) => {
            if (e.target.files.length === 0) return;
            scanFile(e.target.files[0]);
        });

        els.scan.btnCopy.addEventListener('click', () => {
            navigator.clipboard.writeText(els.scan.resultText.textContent);
            const originalText = els.scan.btnCopy.textContent;
            els.scan.btnCopy.textContent = 'Copied!';
            setTimeout(() => els.scan.btnCopy.textContent = originalText, 2000);
        });
    }

    async function startScanner() {
        // Initialize if not already
        if (!state.html5QrCode) {
            state.html5QrCode = new Html5Qrcode("reader");
        }

        const config = { fps: 10, qrbox: { width: 250, height: 250 } };

        try {
            await state.html5QrCode.start(
                { facingMode: "environment" },
                config,
                onScanSuccess
            );

            state.isScanning = true;
            els.scan.btnStart.classList.add('hidden');
            els.scan.btnStop.classList.remove('hidden');
            els.scan.resultBox.classList.add('hidden');
            els.scan.fileInput.parentElement.classList.add('opacity-50', 'pointer-events-none');

        } catch (err) {
            console.error("Error starting scanner", err);
            alert("Could not start camera. Please ensure you have granted permission.");
        }
    }

    async function stopScanner() {
        if (state.html5QrCode && state.isScanning) {
            try {
                await state.html5QrCode.stop();
                state.isScanning = false;
                els.scan.btnStart.classList.remove('hidden');
                els.scan.btnStop.classList.add('hidden');
                els.scan.fileInput.parentElement.classList.remove('opacity-50', 'pointer-events-none');

                // Clear the reader element explicitly if needed to remove video text
                // state.html5QrCode.clear(); 
            } catch (err) {
                console.error("Failed to stop", err);
            }
        }
    }

    function scanFile(file) {
        if (!state.html5QrCode) {
            state.html5QrCode = new Html5Qrcode("reader");
        }

        state.html5QrCode.scanFile(file, true)
            .then(onScanSuccess)
            .catch(err => {
                alert(`Error scanning file. Reason: ${err}`);
            });
    }

    function onScanSuccess(decodedText) {
        // Stop scanning after success if utilizing camera (optional UX choice, often better to stop)
        if (state.isScanning) {
            stopScanner();
            // Play a beep sound? (Optional)
        }

        els.scan.resultBox.classList.remove('hidden');
        els.scan.resultText.textContent = decodedText;

        // Check if URL
        if (isValidURL(decodedText)) {
            els.scan.btnOpen.href = decodedText;
            els.scan.btnOpen.classList.remove('hidden');
        } else {
            els.scan.btnOpen.classList.add('hidden');
        }
    }

    function isValidURL(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    // Initialize all
    initGenerator();
    initScanner();

});
