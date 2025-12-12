const { FFmpeg } = FFmpegWASM;
const { fetchFile } = FFmpegUtil;

let ffmpeg = null;
let inputFile = null;

// UI Elements
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const fileInfo = document.getElementById('file-info');
const inputFilename = document.getElementById('input-filename');
const inputFilesize = document.getElementById('input-filesize');
const optionsPanel = document.getElementById('options-panel');
const convertBtn = document.getElementById('convert-btn');
const progressPanel = document.getElementById('progress-panel');
const progressBar = document.getElementById('progress-bar');
const progressPercent = document.getElementById('progress-percent');
const statusText = document.getElementById('status-text');
const logContainer = document.getElementById('log-container');
const toggleLogBtn = document.getElementById('toggle-log');
const resultPanel = document.getElementById('result-panel');
const downloadBtn = document.getElementById('download-btn');
const engineStatus = document.getElementById('engine-status');

// Option Elements
const optFormat = document.getElementById('opt-format');
const optResolution = document.getElementById('opt-resolution');
const optVCodec = document.getElementById('opt-vcodec');
const optACodec = document.getElementById('opt-acodec');
const optFps = document.getElementById('opt-fps');
const optPreset = document.getElementById('opt-preset');
const videoOptions = document.querySelectorAll('.video-option');

// Initialize FFmpeg
async function initFFmpeg() {
    try {
        engineStatus.classList.remove('hidden');
        ffmpeg = new FFmpeg();

        ffmpeg.on('log', ({ message }) => {
            const p = document.createElement('div');
            p.textContent = message;
            logContainer.appendChild(p);
            logContainer.scrollTop = logContainer.scrollHeight;
        });

        ffmpeg.on('progress', ({ progress, time }) => {
            const pct = Math.round(progress * 100);
            if (pct >= 0 && pct <= 100) {
                progressBar.style.width = `${pct}%`;
                progressPercent.textContent = `${pct}%`;
            }
        });

        // Check for SharedArrayBuffer support (required for MT)
        const useMT = window.SharedArrayBuffer && window.crossOriginIsolated;
        const baseURL = '../js/vendor';

        console.log(`FFmpeg Mode: ${useMT ? 'Multi-Threaded' : 'Single-Threaded'}`);

        if (useMT) {
            await ffmpeg.load({
                coreURL: await toBlobURL(`${baseURL}/ffmpeg-core-mt.js`, 'text/javascript'),
                wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core-mt.wasm`, 'application/wasm'),
                workerURL: await toBlobURL(`${baseURL}/ffmpeg-core-mt.worker.js`, 'text/javascript'),
            });
        } else {
            // Fallback to single-threaded
            await ffmpeg.load({
                coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
                wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
            });
        }

        engineStatus.classList.add('hidden');
        console.log('FFmpeg loaded');
    } catch (e) {
        console.error(e);
        engineStatus.innerHTML = `<span class="text-red-500">Error loading FFmpeg. Please use a localized browser (Chrome/Edge) or ensure Cross-Origin Isolation is enabled.</span>`;
    }
}

// Utils
async function toBlobURL(url, mimeType) {
    const resp = await fetch(url);
    const buf = await resp.arrayBuffer();
    const blob = new Blob([buf], { type: mimeType });
    return URL.createObjectURL(blob);
}

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Event Listeners
window.addEventListener('load', initFFmpeg);

// Drag & Drop
dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) handleFile(e.target.files[0]);
});

function handleFile(file) {
    inputFile = file;
    inputFilename.textContent = file.name;
    inputFilesize.textContent = formatBytes(file.size);

    fileInfo.classList.remove('hidden');
    dropZone.classList.add('hidden'); // Hide dropzone to save space or just show small? Let's hide it.

    // Show user options
    optionsPanel.classList.remove('opacity-50', 'pointer-events-none');

    // Reset previous results
    resultPanel.classList.add('hidden');
    progressPanel.classList.add('hidden');
}

// Compatibility Map
const codecCompatibility = {
    mp4: {
        video: ['libx264', 'libx265', 'copy'],
        audio: ['aac', 'libmp3lame', 'libopus', 'copy', 'none']
    },
    webm: {
        video: ['libvpx-vp9'],
        audio: ['libopus', 'libvorbis', 'none']
    },
    mkv: {
        video: ['libx264', 'libx265', 'libvpx-vp9', 'copy'],
        audio: ['aac', 'libmp3lame', 'libopus', 'libvorbis', 'pcm_s16le', 'copy', 'none']
    },
    avi: {
        video: ['libx264', 'copy'],
        audio: ['libmp3lame', 'pcm_s16le', 'copy', 'none']
    },
    mov: {
        video: ['libx264', 'libx265', 'copy'],
        audio: ['aac', 'libmp3lame', 'pcm_s16le', 'copy', 'none']
    },
    gif: {
        video: [], // GIF handled specifically
        audio: ['none']
    },
    mp3: {
        video: [],
        audio: ['libmp3lame']
    },
    wav: {
        video: [],
        audio: ['pcm_s16le', 'copy', 'none']
    },
    ogg: {
        video: [],
        audio: ['libvorbis'] // Opus has timestamp issues in WASM, use Vorbis for OGG
    }
};

function updateCodecOptions() {
    const fmt = optFormat.value;
    const rules = codecCompatibility[fmt] || codecCompatibility['mp4'];

    // Update Video Codecs
    const vCoptions = optVCodec.options;
    let vValid = false;

    // Check if current value is valid
    if (optVCodec.value && rules.video.includes(optVCodec.value)) {
        vValid = true;
    }

    for (let i = 0; i < vCoptions.length; i++) {
        const val = vCoptions[i].value;
        const isValid = rules.video.includes(val);
        vCoptions[i].disabled = !isValid;
        if (!isValid && optVCodec.value === val) vValid = false;
    }

    // Select default if invalid and we have options
    if (!vValid && rules.video.length > 0) {
        optVCodec.value = rules.video[0];
    }

    // Toggle Video Options Panel
    const isAudio = ['mp3', 'wav', 'ogg'].includes(fmt);
    const isGif = fmt === 'gif';

    videoOptions.forEach(el => {
        if (isAudio) {
            el.classList.add('opacity-50', 'pointer-events-none');
        } else {
            el.classList.remove('opacity-50', 'pointer-events-none');
        }
    });

    // Disable resolution for audio formats
    if (isAudio) {
        optResolution.disabled = true;
        optResolution.closest('.space-y-2')?.classList.add('opacity-50', 'pointer-events-none');
    } else {
        optResolution.disabled = false;
        optResolution.closest('.space-y-2')?.classList.remove('opacity-50', 'pointer-events-none');
    }

    // Special handling for GIF codec/preset
    if (isGif) {
        optVCodec.disabled = true;
        optPreset.disabled = true;
    } else if (!isAudio) {
        optVCodec.disabled = false;
        optPreset.disabled = false;
    }

    // Update Audio Codecs
    const aCoptions = optACodec.options;
    let aValid = false;

    // Check if current value is valid
    if (optACodec.value && rules.audio.includes(optACodec.value)) {
        aValid = true;
    }

    for (let i = 0; i < aCoptions.length; i++) {
        const val = aCoptions[i].value;
        const isValid = rules.audio.includes(val);
        aCoptions[i].disabled = !isValid;
        if (!isValid && optACodec.value === val) aValid = false;
    }

    if (!aValid && rules.audio.length > 0) {
        optACodec.value = rules.audio[0];
    }
}

// Handle Format Change
optFormat.addEventListener('change', updateCodecOptions);

// Initialize options on load
updateCodecOptions();

toggleLogBtn.addEventListener('click', () => {
    logContainer.classList.toggle('hidden');
});

// Conversion Logic
convertBtn.addEventListener('click', async () => {
    if (!inputFile || !ffmpeg) return;

    // Reset UI
    convertBtn.disabled = true;

    if (window.umami) {
        window.umami.track('Video Converter: Convert Start', {
            inputFormat: inputFile.name.split('.').pop(),
            outputFormat: optFormat.value,
            resolution: optResolution.value,
            vcodec: optVCodec.value
        });
    }

    convertBtn.classList.add('opacity-75', 'cursor-not-allowed');
    progressPanel.classList.remove('hidden');
    resultPanel.classList.add('hidden');
    progressBar.style.width = '0%';
    progressPercent.textContent = '0%';
    logContainer.innerHTML = '';

    let logs = [];
    ffmpeg.on('log', ({ message }) => logs.push(message));

    const inputExt = inputFile.name.split('.').pop();
    const inputName = `input.${inputExt}`;
    const outputExt = optFormat.value;
    const outputName = `output.${outputExt}`;

    try {
        // Write file
        statusText.textContent = 'Writing file to memory...';
        await ffmpeg.writeFile(inputName, await fetchFile(inputFile));

        // Build args
        const args = ['-i', inputName];

        // Video Options
        if (!['mp3', 'wav', 'ogg'].includes(outputExt)) {
            // Resolution
            if (optResolution.value !== 'original') {
                if (optResolution.value === 'scale') {
                    args.push('-vf', 'scale=iw/2:ih/2');
                } else {
                    args.push('-vf', `scale=${optResolution.value}`);
                }
            }

            // Codec & Preset (Skip for GIF or if disabled)
            if (outputExt !== 'gif' && !optVCodec.disabled) {
                if (optVCodec.value !== 'copy') {
                    args.push('-c:v', optVCodec.value);

                    // Codec-specific settings
                    if (optVCodec.value === 'libvpx-vp9') {
                        // VP9-specific settings for faster WASM encoding
                        args.push('-crf', '30');        // Quality (0-63, lower = better)
                        args.push('-b:v', '0');         // Use CRF mode
                        args.push('-deadline', 'realtime'); // Fastest encoding
                        args.push('-cpu-used', '8');    // Max speed (0-8)
                        args.push('-row-mt', '1');      // Row-based multithreading
                    } else if (optVCodec.value === 'libx265') {
                        // H.265 specific - use faster preset in WASM
                        args.push('-preset', 'ultrafast');
                        args.push('-crf', '28');
                    } else if (optVCodec.value === 'libx264') {
                        // H.264 preset from user selection
                        args.push('-preset', optPreset.value);
                        args.push('-crf', '23');
                    }
                } else {
                    args.push('-c:v', 'copy');
                }
            }

            // FPS
            if (optFps.value !== 'original') {
                args.push('-r', optFps.value);
            }

            // Multithreading (only if supported)
            if (window.SharedArrayBuffer && window.crossOriginIsolated) {
                args.push('-threads', '4');
            }
        } else {
            // Disable video for audio formats
            args.push('-vn');
        }

        // Audio Options
        if (optACodec.value === 'none') {
            args.push('-an');
        } else if (optACodec.value !== 'copy') {
            args.push('-c:a', optACodec.value);

            // Set explicit bitrate for codecs that need it
            if (optACodec.value === 'libopus') {
                args.push('-b:a', '128k');
                // Opus requires 48kHz, ensure proper resampling
                args.push('-ar', '48000');
            } else if (optACodec.value === 'libvorbis') {
                args.push('-q:a', '4'); // Quality level 4 (~128kbps)
            } else if (optACodec.value === 'libmp3lame') {
                args.push('-q:a', '2'); // VBR quality 2 (~190kbps)
            } else if (optACodec.value === 'aac') {
                args.push('-b:a', '128k');
            }
        } else {
            args.push('-c:a', 'copy');
        }

        // Output
        args.push(outputName);

        // Run
        statusText.textContent = 'Transcoding... (This may take a while)';
        console.log('Running FFmpeg with args:', args);

        const ret = await ffmpeg.exec(args);

        if (ret !== 0) {
            // Scan logs for common errors
            const logText = logs.join('\n');
            let errorMsg = 'Unknown FFmpeg error.';

            if (logText.includes('does not contain any stream')) {
                errorMsg = 'Input file does not contain compatible streams for this format.';
            } else if (logText.includes('Permission denied')) {
                errorMsg = 'Memory/Permission error.';
            } else if (logText.includes('Conversion failed')) {
                errorMsg = 'Conversion failed. Check settings.';
            }

            throw new Error(`FFmpeg exited with code ${ret}: ${errorMsg}`);
        }

        // Read result
        statusText.textContent = 'Finalizing...';
        const data = await ffmpeg.readFile(outputName);

        // Create URL
        const blob = new Blob([data.buffer], { type: `video/${outputExt}` }); // Mime might be audio/...
        const url = URL.createObjectURL(blob);

        // Show download
        downloadBtn.href = url;
        downloadBtn.download = `converted_${inputFile.name.split('.')[0]}.${outputExt}`;

        // Remove old listeners to avoid duplicates if multiple runs
        const newDownloadBtn = downloadBtn.cloneNode(true);
        downloadBtn.parentNode.replaceChild(newDownloadBtn, downloadBtn);
        newDownloadBtn.addEventListener('click', () => {
            if (window.umami) window.umami.track('Video Converter: Download', { format: outputExt });
        });

        // Re-assign variables if needed, or just rely on DOM
        // Actually, replacing node breaks references. Better to just add listener once or use onclick attribute.
        // Safer: add onclick attribute directly
        newDownloadBtn.setAttribute('onclick', `if(window.umami) umami.track('Video Converter: Download', { format: '${outputExt}' })`);

        resultPanel.classList.remove('hidden');
        statusText.textContent = 'Done!';

        // Cleanup?
        // await ffmpeg.deleteFile(inputName);
        // await ffmpeg.deleteFile(outputName);

    } catch (err) {
        console.error(err);
        statusText.textContent = 'Error during conversion!';
        const errDiv = document.createElement('div');
        errDiv.className = 'text-red-500 mt-2';
        errDiv.textContent = err.message || 'Check logs for details.';
        progressPanel.appendChild(errDiv);
    } finally {
        convertBtn.disabled = false;
        convertBtn.classList.remove('opacity-75', 'cursor-not-allowed');
    }
});
