
// DOM Elements
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const editorPanel = document.getElementById('editor-panel');
const filenameDisplay = document.getElementById('filename');
const fileMetaDisplay = document.getElementById('file-meta');
const changeFileBtn = document.getElementById('change-file-btn');
const playBtn = document.getElementById('play-btn');
const playIcon = document.getElementById('play-icon');
const pauseIcon = document.getElementById('pause-icon');
const seekSlider = document.getElementById('seek-slider');
const currentTimeDisplay = document.getElementById('current-time');
const totalTimeDisplay = document.getElementById('total-time');
const canvas = document.getElementById('visualizer');
const canvasCtx = canvas.getContext('2d');
const presetBtns = document.querySelectorAll('.preset-btn');
const processBtn = document.getElementById('process-btn');
const processVideoBtn = document.getElementById('process-video-btn');
const statusMsg = document.getElementById('status-msg');
const recordBtn = document.getElementById('record-btn');
const recordDot = document.getElementById('record-dot');
const recordText = document.getElementById('record-text');

// Audio/Video State
let audioContext = null;
let audioBuffer = null;
// We use a MediaElementSource for Video to keep sync easier, but BufferSource is better for precise audio manipulation (pitch).
// However, BufferSource doesn't sync with Video element automatically.
// For "Suite", if input is Video, we should probably rely on MediaElementSource for playback to see the video? 
// But the user prompt says "output either just the audio or the video".
// If I use BufferSource for audio processing (which I implemented already for high quality pitch shifting via playbackRate), syncing a video element is hard.
// Alternative: Just use the Video Element for everything if it's a video file?
// But `playbackRate` on Video Element changes pitch AND speed. My presets rely on that.
// So, I can use the Video Element as the source.

let fileUrl = null;
let videoElement = null; // Stored in memory or DOM
let mediaSourceNode = null; // For realtime processing from element

// Notes:
// - If input is Audio, use BufferSource (current impl) - best for offline rendering.
// - If input is Video, use VideoElement + MediaElementSource - allows video playback and recording.

let isVideo = false;
let sourceNode = null; // BufferSource (Audio only mode)
let startTime = 0;
let pauseTime = 0;
let isPlaying = false;
let animationId = null;
let currentPreset = 'none';

// Recording State
let isMicRecording = false;
let micMediaRecorder = null;
let micChunks = [];
let micTimerInterval = null;

// Effect Nodes (for real-time graph)
// These are created dynamically in buildGraph, no need for global state
// let inputNode = null; // Source connects here
// let outputNode = null; // Graph output, connects to destination
// let compressor = null;
// let biquadFilter = null;
// let highPassFilter = null;
// let lowPassFilter = null;
// let reverbNode = null;
// let ringModOsc = null;
// let ringModGain = null;
// let tremoloOsc = null;
// let tremoloGain = null;

// Constants
const THEME_ACCENT = '#6366f1'; // Indigo-500
const PRESETS = {
    'none': { rate: 1.0 },
    'podcaster': { rate: 1.0, compress: true, eq: { bass: 8, treble: 6 }, gain: 1.5, deEss: true },
    'radio': { rate: 1.0, filter: { highpass: 500, lowpass: 3000 }, gain: 2.0 },
    'robot': { rate: 1.0, ringMod: { freq: 50 } }, // Dalek-ish
    'womans': { rate: 1.2 }, // Higher pitch (and speed)
    'mans': { rate: 0.85 }, // Lower pitch (and speed)
    'child': { rate: 1.5 }, // Very high pitch
    'elderly': { rate: 0.8, tremolo: { freq: 5, depth: 0.3 } }, // Slow + shaky
    'telephone': { rate: 1.0, filter: { highpass: 400, lowpass: 3400 }, gain: 2.5, compress: true },
    'cave': { rate: 1.0, reverb: true }
};

// --- Initialization ---

// Handle Drag & Drop
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length) handleFile(files[0]);
});

dropZone.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) handleFile(e.target.files[0]);
});

changeFileBtn.addEventListener('click', () => {
    stopAudio();
    editorPanel.classList.add('hidden');
    dropZone.classList.remove('hidden');
    fileInput.value = '';
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    if (videoElement) {
        videoElement.pause();
        videoElement.src = '';
        videoElement.remove();
        videoElement = null;
    }
    // Remove video container if exists
    const vc = document.getElementById('video-container');
    if (vc) vc.remove();
    // Reset canvas style
    canvas.style.position = 'relative';
    canvas.style.zIndex = 'auto';
    canvas.style.opacity = '1';
});

async function handleFile(file) {
    if (!file.type.startsWith('audio/') && !file.type.startsWith('video/')) {
        alert('Please upload an audio or video file.');
        return;
    }

    isVideo = file.type.startsWith('video/');
    fileUrl = URL.createObjectURL(file);

    // UI Updates
    dropZone.classList.add('hidden');
    editorPanel.classList.remove('hidden');
    filenameDisplay.textContent = file.name;
    fileMetaDisplay.textContent = 'Loading...';

    // Toggle Video Button
    if (isVideo) {
        processVideoBtn.classList.remove('hidden');

        // Create Video Element for preview
        const visualizerContainer = document.querySelector('.visualizer-container');
        // Check if we need to insert a video element
        let vc = document.getElementById('video-container');
        if (!vc) {
            vc = document.createElement('div');
            vc.id = 'video-container';
            vc.className = 'absolute inset-0 z-0 flex items-center justify-center bg-black';
            // Add before canvas
            visualizerContainer.insertBefore(vc, canvas);
            // Make canvas transparent and on top
            canvas.style.position = 'absolute';
            canvas.style.zIndex = '10';
            canvas.style.opacity = '0.5'; // See overlay
        }

        videoElement = document.createElement('video');
        videoElement.src = fileUrl;
        videoElement.style.maxHeight = '100%';
        videoElement.style.maxWidth = '100%';
        videoElement.controls = false; // We control playback
        videoElement.muted = true; // Mute by default to avoid double audio if mediaSourceNode is also connected to destination
        vc.appendChild(videoElement);

        vc.appendChild(videoElement);

        // Allow container to expand for video
        visualizerContainer.style.height = 'auto';
        visualizerContainer.style.minHeight = '120px';

        videoElement.addEventListener('loadedmetadata', () => {
            totalTimeDisplay.textContent = formatTime(videoElement.duration);
            // Resize canvas to match video
            canvas.width = visualizerContainer.offsetWidth;
            canvas.height = videoElement.videoHeight * (canvas.width / videoElement.videoWidth);

            // Unmute video element if we are using MediaElementSource to route audio
            if (mediaSourceNode) videoElement.muted = false;
        });

        // For processing audio, we still decode it to a buffer for accurate waveform analysis and Offline export for Audio-only.
        // For Video export, we'll use the element.
    } else {
        processVideoBtn.classList.add('hidden');
        const vc = document.getElementById('video-container');
        if (vc) vc.remove();
        canvas.style.position = 'relative';
        canvas.style.zIndex = 'auto';
        canvas.style.opacity = '1';

        // Reset container height
        const visualizerContainer = document.querySelector('.visualizer-container');
        visualizerContainer.style.height = '120px';
        canvas.width = visualizerContainer.offsetWidth;
        canvas.height = 120;
    }

    // Initialize Audio Context
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    try {
        const arrayBuffer = await file.arrayBuffer();
        audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        // Update Meta
        const duration = audioBuffer.duration;
        const minutes = Math.floor(duration / 60);
        const seconds = Math.floor(duration % 60);
        const mb = (file.size / (1024 * 1024)).toFixed(2);
        fileMetaDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')} • ${mb} MB`;
        if (!isVideo) {
            totalTimeDisplay.textContent = formatTime(duration);
        }

        // Reset State
        stopAudio();
        seekSlider.value = 0;

        // Draw static waveform immediately
        drawStaticWaveform();

        // Prepare Graph
        applyPreset('none'); // Default

    } catch (err) {
        console.error(err);
        alert('Error decoding audio file. ' + err.message);
        dropZone.classList.remove('hidden');
        editorPanel.classList.add('hidden');
    }
}

// --- Audio/Video Playback ---

playBtn.addEventListener('click', togglePlay);

function togglePlay() {
    if (isPlaying) {
        pauseAudio();
    } else {
        playAudio();
    }
}

function playAudio() {
    if (!audioContext) return;
    if (audioContext.state === 'suspended') audioContext.resume();

    const settings = PRESETS[currentPreset];

    if (isVideo && videoElement) {
        // VIDEO PLAYBACK MODE
        // We use MediaElementSource to route video audio through Web Audio API
        if (!mediaSourceNode) {
            mediaSourceNode = audioContext.createMediaElementSource(videoElement);
        }

        // Build Graph
        // Disconnect previous connections if any
        try { mediaSourceNode.disconnect(); } catch (e) { }

        const destination = buildGraph(audioContext, mediaSourceNode, settings);

        // Analyzer
        const analyzer = audioContext.createAnalyser();
        analyzer.fftSize = 256;
        destination.connect(analyzer);
        analyzer.connect(audioContext.destination);

        // Handle playback rate on video element
        videoElement.playbackRate = settings.rate || 1.0;
        videoElement.muted = false; // Unmute video element for playback
        videoElement.play();

        videoElement.onended = stopAudio;

        isPlaying = true;
        updatePlayButton();
        visualize(analyzer);

    } else {
        // AUDIO ONLY MODE (BufferSource)
        if (!audioBuffer) return;

        const resumeTime = pauseTime;
        stopAudio(); // Stop any existing

        isPlaying = true;
        updatePlayButton();

        sourceNode = audioContext.createBufferSource();
        sourceNode.buffer = audioBuffer;
        if (settings.rate) sourceNode.playbackRate.value = settings.rate;

        const destination = buildGraph(audioContext, sourceNode, settings);

        const analyzer = audioContext.createAnalyser();
        analyzer.fftSize = 256;
        destination.connect(analyzer);
        analyzer.connect(audioContext.destination);

        const offset = resumeTime;
        sourceNode.start(0, offset);
        startTime = audioContext.currentTime - (offset / (settings.rate || 1));

        sourceNode.onended = () => {
            if (isPlaying && (audioContext.currentTime - startTime) * (settings.rate || 1) >= audioBuffer.duration) {
                stopAudio();
            }
        };

        visualize(analyzer);
    }
}

function pauseAudio() {
    if (isVideo && videoElement) {
        videoElement.pause();
    } else if (sourceNode) {
        sourceNode.stop();
        sourceNode = null;
        const settings = PRESETS[currentPreset];
        pauseTime = (audioContext.currentTime - startTime) * (settings.rate || 1);
    }

    isPlaying = false;
    cancelAnimationFrame(animationId);
    updatePlayButton();
}

function stopAudio() {
    if (isVideo && videoElement) {
        videoElement.pause();
        videoElement.currentTime = 0;
        videoElement.muted = true; // Mute again after stopping
    } else if (sourceNode) {
        try { sourceNode.stop(); } catch (e) { }
        sourceNode = null;
    }

    isPlaying = false;
    pauseTime = 0;
    startTime = 0;
    cancelAnimationFrame(animationId);
    seekSlider.value = 0;
    currentTimeDisplay.textContent = "0:00";
    updatePlayButton();

    // Draw static waveform (restore preview)
    drawStaticWaveform();
}

function updatePlayButton() {
    if (isPlaying) {
        playIcon.classList.add('hidden');
        pauseIcon.classList.remove('hidden');
    } else {
        playIcon.classList.remove('hidden');
        pauseIcon.classList.add('hidden');
    }
}

seekSlider.addEventListener('input', () => {
    const percent = seekSlider.value / 100;

    if (isVideo && videoElement) {
        if (isNaN(videoElement.duration)) return; // Video not loaded yet
        const time = percent * videoElement.duration;
        videoElement.currentTime = time;
        currentTimeDisplay.textContent = formatTime(time);
    } else if (audioBuffer) {
        const time = percent * audioBuffer.duration;
        currentTimeDisplay.textContent = formatTime(time);

        if (isPlaying) {
            // Restart at new time
            pauseAudio();
            pauseTime = time; // Force correct time from slider
            playAudio();
        } else {
            pauseTime = time;
        }
    }
});

function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

// --- Graph Builder (Shared by Realtime & Offline) ---

function buildGraph(ctx, source, settings) {
    let current = source;

    // 1. Gain (Basic Volume)
    const masterGain = ctx.createGain();
    masterGain.gain.value = settings.gain || 1.0;
    current.connect(masterGain);
    current = masterGain;

    // 2. Compressor (Podcaster) - Aggressive settings for broadcast-ready audio
    if (settings.compress) {
        // High-pass filter first to remove rumble (standard for podcasting)
        const rumbleFilter = ctx.createBiquadFilter();
        rumbleFilter.type = 'highpass';
        rumbleFilter.frequency.value = 80; // Remove sub-bass rumble
        rumbleFilter.Q.value = 0.7;
        current.connect(rumbleFilter);
        current = rumbleFilter;

        // Compression to even out levels
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -30; // Lower threshold = more compression
        comp.knee.value = 10; // Tighter knee for more aggressive compression
        comp.ratio.value = 8; // Moderate ratio for natural sound
        comp.attack.value = 0.005; // Fast attack to catch transients
        comp.release.value = 0.15; // Quick release for punchy sound
        current.connect(comp);
        current = comp;

        // Makeup gain after compression
        const makeupGain = ctx.createGain();
        makeupGain.gain.value = 1.3; // Boost to compensate for compression
        current.connect(makeupGain);
        current = makeupGain;
    }

    // 3. Filters (EQ / Radio / Telephone)
    if (settings.filter) {
        if (settings.filter.highpass) {
            const hp = ctx.createBiquadFilter();
            hp.type = 'highpass';
            hp.frequency.value = settings.filter.highpass;
            current.connect(hp);
            current = hp;
        }
        if (settings.filter.lowpass) {
            const lp = ctx.createBiquadFilter();
            lp.type = 'lowpass';
            lp.frequency.value = settings.filter.lowpass;
            current.connect(lp);
            current = lp;
        }
    } else if (settings.eq) {
        // Enhanced EQ for podcaster-quality sound
        if (settings.eq.bass) {
            const bass = ctx.createBiquadFilter();
            bass.type = 'lowshelf';
            bass.frequency.value = 150; // Lower frequency for richness
            bass.gain.value = settings.eq.bass;
            current.connect(bass);
            current = bass;
        }

        // Add mid presence boost for clarity
        const midPresence = ctx.createBiquadFilter();
        midPresence.type = 'peaking';
        midPresence.frequency.value = 2500; // Presence frequency
        midPresence.Q.value = 1.5;
        midPresence.gain.value = 4; // Boost for clarity
        current.connect(midPresence);
        current = midPresence;

        if (settings.eq.treble) {
            const treble = ctx.createBiquadFilter();
            treble.type = 'highshelf';
            treble.frequency.value = 4000;
            treble.gain.value = settings.eq.treble;
            current.connect(treble);
            current = treble;
        }

        // De-esser (reduce harsh sibilance) for podcaster preset
        if (settings.deEss) {
            const deEsser = ctx.createBiquadFilter();
            deEsser.type = 'peaking';
            deEsser.frequency.value = 6500; // Sibilance frequency
            deEsser.Q.value = 3;
            deEsser.gain.value = -4; // Cut sibilance
            current.connect(deEsser);
            current = deEsser;
        }
    }

    // 4. Ring Modulator (Robot)
    if (settings.ringMod) {
        // This requires a more complex structure: Source -> Multiply <- Oscillator
        // Web Audio "Gain" node acts as a multiplier if the gain param is controlled by an audio signal.
        // Signal -> GainNode (Input)
        // Oscillator -> GainNode.gain
        // Output -> ...

        // We need to keep 'current' flow linear, but replace 'current' with the output of the ring mod.
        const ringGain = ctx.createGain();
        ringGain.gain.value = 0; // Modulated by oscillator

        const ringOsc = ctx.createOscillator();
        ringOsc.type = 'sine';
        ringOsc.frequency.value = settings.ringMod.freq;
        ringOsc.start();

        // Connect OSC to Gain.gain
        ringOsc.connect(ringGain.gain);

        // Connect Signal to Gain
        current.connect(ringGain);

        // But Ring Mod is usually (Carrier * Modulator). If Gain is 0 centered... 
        // Web Audio Gain is [0..1] usually? No, it's a multiplier. 
        // Standard RingMod: Signal * Osc.
        // If Osc goes [-1, 1], Gain goes [-1, 1] (if AudioParam allows negative, which it does).
        // So `current` -> `ringGain` -> output.

        current = ringGain;

        // Keep a reference to stop osc if needed (for Offline it's automatic, for realtime we might leak)
        // In this simple builder, we let the GC handle it or stop when source stops (not quite right but ok for now)
    }

    // 5. Tremolo (Elderly)
    if (settings.tremolo) {
        const tremGain = ctx.createGain();
        const tremOsc = ctx.createOscillator();
        tremOsc.frequency.value = settings.tremolo.freq;
        tremOsc.type = 'sine';
        tremOsc.start();

        // We want Gain to oscillate between (1-depth) and 1? Or around 1?
        // Let's create a gain node to scale the LFO
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = settings.tremolo.depth; // Depth
        tremOsc.connect(lfoGain);

        // Connect to tremGain.gain
        // tremGain.gain.value is 1. We want to modulate it.
        // AudioParam summing: base 1 + LFO
        tremGain.gain.value = 1.0;
        lfoGain.connect(tremGain.gain);

        current.connect(tremGain);
        current = tremGain;
    }

    // 6. Reverb (Cave)
    if (settings.reverb) {
        const convolver = ctx.createConvolver();
        // Generate simple impulse
        const rate = ctx.sampleRate;
        const length = rate * 2.0; // 2 seconds
        const decay = 2.0;
        const impulse = ctx.createBuffer(2, length, rate);
        const left = impulse.getChannelData(0);
        const right = impulse.getChannelData(1);

        for (let i = 0; i < length; i++) {
            // Exponential decay noise
            const n = Math.random() * 2 - 1;
            const env = Math.pow(1 - i / length, decay);
            left[i] = n * env;
            right[i] = n * env;
        }
        convolver.buffer = impulse;

        // Mix Dry/Wet? Convolver is usually 100% wet.
        // Let's create a Mix
        const dryGain = ctx.createGain();
        const wetGain = ctx.createGain();
        dryGain.gain.value = 0.5;
        wetGain.gain.value = 0.5;

        current.connect(dryGain);
        current.connect(convolver);
        convolver.connect(wetGain);

        // Merge back
        const merger = ctx.createChannelMerger(2); // Simple merge? No, just connect both to next
        // Actually just connect both to a new Master sum
        const reverbSum = ctx.createGain();
        dryGain.connect(reverbSum);
        wetGain.connect(reverbSum);

        current = reverbSum;
    }

    return current;
}

function applyPreset(name) {
    currentPreset = name;
    if (window.umami) window.umami.track('Audio Suite: Preset', { name: name });
    // Don't auto play, just update state.
    // But if playing, restart with new settings
    if (isPlaying) {
        if (isVideo) {
            // Can update realtime? 
            // For video, we can try to update graph without stopping?
            // Easier to just pause/play
            const time = videoElement.currentTime;
            pauseAudio(); // disconnects
            if (videoElement) videoElement.currentTime = time;
            playAudio();
        } else {
            const time = (audioContext.currentTime - startTime) * (PRESETS[currentPreset].rate || 1); // rough estimate of current pos in buffer
            pauseTime = Math.max(0, Math.min(time, audioBuffer.duration));
            playAudio();
        }
    }
}


// --- Visualization ---

// Draw static waveform from audio buffer (not frequency, actual waveform shape)
function drawStaticWaveform() {
    if (!audioBuffer) return;

    // Resize canvas to container
    const visualizerContainer = document.querySelector('.visualizer-container');
    canvas.width = visualizerContainer.offsetWidth;
    canvas.height = isVideo ? canvas.height : 120;

    // Get audio data for drawing
    const channelData = audioBuffer.getChannelData(0); // Use first channel
    const samples = channelData.length;
    const step = Math.ceil(samples / canvas.width);
    const amp = canvas.height / 2;

    // Background
    if (!isVideo) {
        canvasCtx.fillStyle = '#1e1b4b';
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
    }

    // Draw waveform
    canvasCtx.beginPath();
    canvasCtx.strokeStyle = isVideo ? 'rgba(255, 255, 255, 0.6)' : '#818cf8';
    canvasCtx.lineWidth = 1;

    for (let i = 0; i < canvas.width; i++) {
        let min = 1.0, max = -1.0;

        for (let j = 0; j < step; j++) {
            const datum = channelData[(i * step) + j];
            if (datum !== undefined) {
                if (datum < min) min = datum;
                if (datum > max) max = datum;
            }
        }

        // Draw a vertical line from min to max
        const y1 = (1 + min) * amp;
        const y2 = (1 + max) * amp;

        if (i === 0) {
            canvasCtx.moveTo(i, y1);
        }
        canvasCtx.lineTo(i, y1);
        canvasCtx.lineTo(i, y2);
    }

    canvasCtx.stroke();

    // Draw center line
    canvasCtx.strokeStyle = isVideo ? 'rgba(255, 255, 255, 0.2)' : 'rgba(129, 140, 248, 0.3)';
    canvasCtx.beginPath();
    canvasCtx.moveTo(0, amp);
    canvasCtx.lineTo(canvas.width, amp);
    canvasCtx.stroke();
}

// Real-time frequency visualization during playback
function visualize(analyser) {
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    function draw() {
        // Always schedule next frame first if still playing
        if (!isPlaying) {
            // Redraw static waveform when stopped
            drawStaticWaveform();
            return;
        }

        animationId = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);

        // Update Slider and Time Display
        if (isVideo && videoElement) {
            if (!isNaN(videoElement.duration) && videoElement.duration > 0) {
                const pct = (videoElement.currentTime / videoElement.duration) * 100;
                seekSlider.value = pct;
                currentTimeDisplay.textContent = formatTime(videoElement.currentTime);
            }
        } else if (audioBuffer && audioContext) {
            // BufferSource calculation logic - don't require sourceNode reference
            const elapsed = audioContext.currentTime - startTime;
            const settings = PRESETS[currentPreset];
            const rate = settings.rate || 1;
            const actualPos = elapsed * rate;

            // Clamp to duration
            if (actualPos <= audioBuffer.duration) {
                seekSlider.value = (actualPos / audioBuffer.duration) * 100;
                currentTimeDisplay.textContent = formatTime(actualPos);
            }
        }

        // Draw Canvas - frequency bars overlaid on waveform
        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

        // If Audio, draw background
        if (!isVideo) {
            canvasCtx.fillStyle = '#1e1b4b';
            canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
        }

        const barWidth = (canvas.width / bufferLength) * 2.5;
        let barHeight;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            barHeight = dataArray[i] / 2;

            // Gradient colors based on frequency intensity
            if (isVideo) {
                canvasCtx.fillStyle = `rgba(255, 255, 255, ${0.3 + (barHeight / 200)})`;
            } else {
                const hue = 260 - (i / bufferLength) * 30; // Purple to indigo
                canvasCtx.fillStyle = `hsl(${hue}, 70%, ${40 + barHeight / 4}%)`;
            }
            canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

            x += barWidth + 1;
        }
    }

    draw();
}


// --- Presets Controls ---
presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        presetBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        applyPreset(btn.dataset.preset);
    });
});


// --- Processing & Download ---
processBtn.addEventListener('click', async () => {
    if (!audioBuffer) return;

    statusMsg.textContent = 'Processing Audio...';
    processBtn.disabled = true;

    if (window.umami) {
        window.umami.track('Audio Suite: Process Start', { preset: currentPreset });
    }

    try {
        const settings = PRESETS[currentPreset];
        const rate = settings.rate || 1;
        // Length changes with rate
        const newLength = Math.ceil(audioBuffer.length / rate);

        // Offline Context
        const offlineCtx = new OfflineAudioContext(
            audioBuffer.numberOfChannels,
            newLength,
            audioBuffer.sampleRate
        );

        const offlineSource = offlineCtx.createBufferSource();
        offlineSource.buffer = audioBuffer;
        offlineSource.playbackRate.value = rate;

        // Build Graph
        const destination = buildGraph(offlineCtx, offlineSource, settings);
        destination.connect(offlineCtx.destination);

        offlineSource.start();
        const renderedBuffer = await offlineCtx.startRendering();

        // Encode to WAV and Download
        const wavBlob = bufferToWave(renderedBuffer, renderedBuffer.length);
        const url = URL.createObjectURL(wavBlob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `processed-${currentPreset}-${filenameDisplay.textContent.split('.')[0]}.wav`;
        a.click();

        statusMsg.textContent = 'Done!';
        setTimeout(() => statusMsg.textContent = '', 3000);

    } catch (err) {
        console.error(err);
        alert('Processing failed: ' + err.message);
        statusMsg.textContent = 'Error';
    } finally {
        processBtn.disabled = false;
    }
});


// --- Video Conversion (Realtime Recording) ---
processVideoBtn.addEventListener('click', async () => {
    if (!videoElement || !isVideo) return;

    statusMsg.textContent = 'Recording Video... (Please wait)';
    processVideoBtn.disabled = true;
    playBtn.disabled = true;

    // We must play the video from start to finish
    // 1. Setup Stream Destination
    const dest = audioContext.createMediaStreamDestination();

    // 2. Setup Graph
    if (!mediaSourceNode) mediaSourceNode = audioContext.createMediaElementSource(videoElement);

    try { mediaSourceNode.disconnect(); } catch (e) { }
    const settings = PRESETS[currentPreset];
    const graphEnd = buildGraph(audioContext, mediaSourceNode, settings);

    graphEnd.connect(dest); // To Recorder
    graphEnd.connect(audioContext.destination); // To Speakers (Monitor)

    videoElement.playbackRate = settings.rate || 1.0;
    videoElement.currentTime = 0;
    videoElement.muted = false; // Unmute so source flows? No, MediaElementSource captures output. Muted element usually silences source too unless captured before mute?
    // In Chrome: MediaElementSource OUTPUTS silence if element is muted.
    // So we MUST unmute. But if we connect to context.destination, we hear it.
    // If we DON'T connect to context.destination, we DON'T hear it.
    // So: Connect only to dest (Recorder) if we want silent recording?
    // User might want to hear progress. Let's keep monitor.

    // 3. Capture Video Stream
    let videoStream;
    if (videoElement.captureStream) {
        videoStream = videoElement.captureStream();
    } else if (videoElement.mozCaptureStream) {
        videoStream = videoElement.mozCaptureStream();
    } else {
        alert('Video recording not supported in this browser.');
        processVideoBtn.disabled = false;
        playBtn.disabled = false;
        return;
    }

    // 4. Merge Audio Track from dest
    // videoStream has its own audio track? Yes, raw audio. We want PROCESSED audio.
    // So take ONLY video track from videoStream.

    const combinedStream = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...dest.stream.getAudioTracks()
    ]);

    const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: 'video/webm; codecs=vp9'
    });

    const chunks = [];
    mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `processed-${currentPreset}-${filenameDisplay.textContent.split('.')[0]}.webm`;
        a.click();

        statusMsg.textContent = 'Video Ready!';
        setTimeout(() => statusMsg.textContent = '', 3000);
        processVideoBtn.disabled = false;
        playBtn.disabled = false;
    };

    // Start
    mediaRecorder.start();
    videoElement.play();

    // Wait for end
    videoElement.onended = () => {
        mediaRecorder.stop();
        videoElement.onended = stopAudio; // restore normal behavior
    };
});




// --- Microphone Recording ---
recordBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (!isMicRecording) {
        // Start Recording
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            micMediaRecorder = new MediaRecorder(stream);
            micChunks = [];

            micMediaRecorder.ondataavailable = e => {
                if (e.data.size > 0) micChunks.push(e.data);
            };

            micMediaRecorder.onstop = () => {
                const blob = new Blob(micChunks, { type: 'audio/webm' });
                // Create a File object so handleFile can process it
                // Using a date-based name
                const dateStr = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
                const file = new File([blob], `recording-${dateStr}.webm`, { type: 'audio/webm' });

                handleFile(file);

                // Stop all tracks to release mic
                stream.getTracks().forEach(track => track.stop());
            };

            micMediaRecorder.start();
            isMicRecording = true;

            // UI Update
            recordDot.classList.add('animate-pulse');
            recordText.textContent = "Stop Recording (0:00)";
            recordBtn.classList.add('bg-red-500/10', 'text-red-500', 'border-red-500/50');

            const startTime = Date.now();
            micTimerInterval = setInterval(() => {
                const secs = Math.floor((Date.now() - startTime) / 1000);
                const m = Math.floor(secs / 60);
                const s = secs % 60;
                recordText.textContent = `Stop Recording (${m}:${s.toString().padStart(2, '0')})`;
            }, 1000);

        } catch (err) {
            console.error(err);
            alert('Could not access microphone: ' + err.message);
        }
    } else {
        // Stop Recording
        if (micMediaRecorder && micMediaRecorder.state !== 'inactive') {
            micMediaRecorder.stop();
        }
        isMicRecording = false;
        clearInterval(micTimerInterval);

        // UI Reset
        recordDot.classList.remove('animate-pulse');
        recordText.textContent = "Record Microphone";
        recordBtn.classList.remove('bg-red-500/10', 'text-red-500', 'border-red-500/50');
    }
});


// --- WAV Encoder Helper ---
function bufferToWave(abuffer, len) {
    let numOfChan = abuffer.numberOfChannels,
        length = len * numOfChan * 2 + 44,
        buffer = new ArrayBuffer(length),
        view = new DataView(buffer),
        channels = [], i, sample,
        offset = 0,
        pos = 0;

    // write WAVE header
    setUint32(0x46464952);                         // "RIFF"
    setUint32(length - 8);                         // file length - 8
    setUint32(0x45564157);                         // "WAVE"

    setUint32(0x20746d66);                         // "fmt " chunk
    setUint32(16);                                 // length = 16
    setUint16(1);                                  // PCM (uncompressed)
    setUint16(numOfChan);
    setUint32(abuffer.sampleRate);
    setUint32(abuffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
    setUint16(numOfChan * 2);                      // block-align
    setUint16(16);                                 // 16-bit (hardcoded in this example)

    setUint32(0x61746164);                         // "data" - chunk
    setUint32(length - pos - 4);                   // chunk length

    // write interleaved data
    for (i = 0; i < abuffer.numberOfChannels; i++)
        channels.push(abuffer.getChannelData(i));

    while (pos < len) {
        for (i = 0; i < numOfChan; i++) {             // interleave channels
            sample = Math.max(-1, Math.min(1, channels[i][pos])); // clamp
            sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; // scale to 16-bit signed int
            view.setInt16(44 + offset, sample, true);
            offset += 2;
        }
        pos++;
    }

    return new Blob([buffer], { type: "audio/wav" });

    function setUint16(data) {
        view.setUint16(pos, data, true);
        pos += 2;
    }

    function setUint32(data) {
        view.setUint32(pos, data, true);
        pos += 4;
    }
}
