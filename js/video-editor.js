
// State
const state = {
    tracks: [
        { id: 1, name: 'Track 1', clips: [], visible: true, locked: false },
        { id: 2, name: 'Track 2', clips: [], visible: true, locked: false },
        { id: 3, name: 'Track 3', clips: [], visible: true, locked: false }
    ],
    assets: [],
    clipboard: null,
    currentTime: 0,
    duration: 60,
    zoom: 20,
    minZoom: 1,
    maxZoom: 500,
    isPlaying: false,
    selectedClip: null,
    project: {
        width: 1280,
        height: 720,
        fps: 30
    },
    canvas: null,
    ctx: null,
    rafId: null,
    lastTime: 0,
    draggingAsset: null,
    previewZoom: 1
};

// DOM Elements
const elements = {
    canvas: document.getElementById('editor-canvas'),
    overlay: document.getElementById('interaction-overlay'),
    playBtn: document.getElementById('btn-play'),
    playIcon: document.getElementById('icon-play'),
    prevFrameBtn: document.getElementById('btn-prev-frame'),
    nextFrameBtn: document.getElementById('btn-next-frame'),
    timelineTracks: document.getElementById('timeline-tracks'),
    timelineScrollArea: document.getElementById('timeline-scroll-area'),
    timelineRuler: document.getElementById('timeline-ruler'),
    timelineRulerContainer: document.getElementById('timeline-ruler-container'),
    playhead: document.getElementById('playhead'),
    propertiesContent: document.getElementById('properties-content'),
    fileUpload: document.getElementById('file-upload'),
    assetsList: document.getElementById('assets-list'),
    addTextBtn: document.getElementById('add-text-btn'),
    zoomInBtn: document.getElementById('btn-zoom-in'),
    zoomOutBtn: document.getElementById('btn-zoom-out'),
    addTrackBtn: document.getElementById('btn-add-track'),
    fullscreenBtn: document.getElementById('btn-fullscreen'),
    exportBtn: document.getElementById('btn-export'),
    splitBtn: document.getElementById('btn-split'),
    deleteBtn: document.getElementById('btn-delete'),
    resolutionSelect: document.getElementById('resolution-select'),
    previewPanel: document.getElementById('preview-panel'),
    previewContainer: document.getElementById('preview-container'),
    canvasWrapper: document.getElementById('canvas-wrapper'),
    previewZoomLabel: document.getElementById('preview-zoom-label'),
    zoomPreviewIn: document.getElementById('btn-zoom-preview-in'),
    zoomPreviewOut: document.getElementById('btn-zoom-preview-out'),
    zoomPreviewFit: document.getElementById('btn-zoom-preview-fit')
};

// Init
function init() {
    state.canvas = elements.canvas;
    state.ctx = state.canvas.getContext('2d');
    state.canvas.width = state.project.width;
    state.canvas.height = state.project.height;

    // Listeners
    elements.playBtn.addEventListener('click', togglePlay);
    elements.fileUpload.addEventListener('change', handleFileUpload);
    elements.timelineRuler.addEventListener('mousedown', handleSeek);
    elements.addTextBtn.addEventListener('click', addTextClip);
    elements.zoomInBtn.addEventListener('click', () => zoomTimeline(1.5));
    elements.zoomOutBtn.addEventListener('click', () => zoomTimeline(1 / 1.5));
    elements.addTrackBtn.addEventListener('click', addTrack);
    elements.fullscreenBtn.addEventListener('click', toggleFullscreen);
    elements.exportBtn.addEventListener('click', exportVideo);
    elements.splitBtn.addEventListener('click', splitClip);
    elements.deleteBtn.addEventListener('click', deleteSelectedClip);

    // Resolution change
    if (elements.resolutionSelect) {
        elements.resolutionSelect.addEventListener('change', handleResolutionChange);
    }

    // Preview Zoom
    if (elements.zoomPreviewIn) {
        elements.zoomPreviewIn.addEventListener('click', () => setPreviewZoom(state.previewZoom * 1.25));
        elements.zoomPreviewOut.addEventListener('click', () => setPreviewZoom(state.previewZoom / 1.25));
        elements.zoomPreviewFit.addEventListener('click', fitPreviewToContainer);
    }

    // Mouse wheel zoom on preview
    if (elements.previewContainer) {
        elements.previewContainer.addEventListener('wheel', (e) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                setPreviewZoom(state.previewZoom * (e.deltaY < 0 ? 1.1 : 0.9));
            }
        }, { passive: false });
    }

    // Zoom on Scroll in Timeline
    elements.timelineScrollArea.addEventListener('wheel', (e) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            zoomTimeline(e.deltaY < 0 ? 1.1 : 0.9, e.clientX);
        }
    }, { passive: false });

    elements.prevFrameBtn.addEventListener('click', () => seek(state.currentTime - 1 / state.project.fps));
    elements.nextFrameBtn.addEventListener('click', () => seek(state.currentTime + 1 / state.project.fps));

    // Timeline Sync Scrolling + Playhead sync
    elements.timelineScrollArea.addEventListener('scroll', () => {
        elements.timelineRulerContainer.scrollLeft = elements.timelineScrollArea.scrollLeft;
        updatePlayhead();
    });

    // Keyboard
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT') return;
        if (e.key === ' ') { e.preventDefault(); togglePlay(); }
        if (e.key === 'Delete') deleteSelectedClip();
        if (e.key === 's') splitClip();
        if (e.ctrlKey && e.key === 'c') copyClip();
        if (e.ctrlKey && e.key === 'v') pasteClip();
    });

    // Canvas click for deselect
    elements.overlay.addEventListener('mousedown', (e) => {
        if (e.target === elements.overlay) selectClip(null);
    });

    // Drag & Drop on Assets List
    const dropZone = elements.assetsList.parentElement;
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.style.borderColor = 'var(--accent-primary)'; });
    dropZone.addEventListener('dragleave', () => { dropZone.style.borderColor = ''; });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '';
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileUpload({ target: { files: e.dataTransfer.files } });
        }
    });

    initResizers();
    renderTimeline();
    requestAnimationFrame(loop);
    setTimeout(fitPreviewToContainer, 100);
}

function initResizers() {
    const layout = document.getElementById('editor-layout');
    const setupResizer = (id, dir, setter) => {
        const resizer = document.getElementById(id);
        if (!resizer) return;
        resizer.addEventListener('mousedown', (e) => {
            e.preventDefault();
            resizer.classList.add('resizing');
            const startX = e.clientX;
            const startY = e.clientY;
            const style = getComputedStyle(document.documentElement);
            const startVal = dir === 'x'
                ? parseInt(style.getPropertyValue(id.includes('sidebar') ? '--sidebar-width' : '--properties-width'))
                : parseInt(style.getPropertyValue('--timeline-height'));

            const onMove = (m) => {
                const delta = dir === 'x' ? m.clientX - startX : startY - m.clientY; // Timeline grows up
                // For properties, delta is inverted (drag left increases width)
                const val = id.includes('properties') ? startVal - delta : startVal + delta;
                setter(Math.max(100, val));
            };
            const onUp = () => {
                window.removeEventListener('mousemove', onMove);
                window.removeEventListener('mouseup', onUp);
                resizer.classList.remove('resizing');
                fitPreviewToContainer(); // Re-fit preview
            };
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onUp);
        });
    };

    setupResizer('resizer-sidebar', 'x', v => document.documentElement.style.setProperty('--sidebar-width', v + 'px'));
    setupResizer('resizer-properties', 'x', v => document.documentElement.style.setProperty('--properties-width', v + 'px'));
    setupResizer('resizer-timeline', 'y', v => document.documentElement.style.setProperty('--timeline-height', v + 'px'));
}

// Resolution & Preview Zoom
function handleResolutionChange(e) {
    const val = e.target.value;
    if (val === 'custom') {
        const width = prompt('Enter width:', state.project.width);
        const height = prompt('Enter height:', state.project.height);
        if (width && height) {
            state.project.width = parseInt(width, 10) || 1280;
            state.project.height = parseInt(height, 10) || 720;
        }
    } else {
        const [w, h] = val.split('x').map(Number);
        state.project.width = w;
        state.project.height = h;
    }
    state.canvas.width = state.project.width;
    state.canvas.height = state.project.height;
    fitPreviewToContainer();
    renderCanvas();
}

function fitPreviewToContainer() {
    if (!elements.previewContainer) return;
    const containerRect = elements.previewContainer.getBoundingClientRect();
    const padding = 40;
    const scaleX = (containerRect.width - padding) / state.project.width;
    const scaleY = (containerRect.height - padding) / state.project.height;
    state.previewZoom = Math.min(scaleX, scaleY, 1);
    applyPreviewZoom();
}

function setPreviewZoom(zoom) {
    state.previewZoom = Math.max(0.1, Math.min(5, zoom));
    applyPreviewZoom();
}

function applyPreviewZoom() {
    if (!elements.canvasWrapper) return;
    elements.canvasWrapper.style.transform = `scale(${state.previewZoom})`;
    if (elements.previewZoomLabel) {
        elements.previewZoomLabel.textContent = `${Math.round(state.previewZoom * 100)}%`;
    }
    renderGizmos();
}

// Core Logic
function togglePlay() {
    state.isPlaying = !state.isPlaying;
    if (state.isPlaying) {
        state.lastTime = performance.now();
        elements.playIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />';
        syncMedia(true);
    } else {
        elements.playIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />';
        syncMedia(false);
    }
}

function seek(time) {
    state.currentTime = Math.max(0, Math.min(state.duration, time));
    updatePlayhead();
    renderCanvas();
    if (!state.isPlaying) syncMedia(false, true);
}

function loop(timestamp) {
    if (state.isPlaying) {
        const dt = (timestamp - state.lastTime) / 1000;
        state.lastTime = timestamp;
        state.currentTime += dt;
        if (state.currentTime >= state.duration) {
            state.currentTime = 0;
            togglePlay();
        }
        updatePlayhead();
        renderCanvas();
    }
    requestAnimationFrame(loop);
}

function syncMedia(playing, forceSeek = false) {
    state.tracks.forEach(track => {
        track.clips.forEach(clip => {
            if ((clip.type === 'video' || clip.type === 'audio') && clip.mediaElement) {
                const relTime = state.currentTime - clip.start;
                const isActive = relTime >= 0 && relTime < clip.duration;
                if (isActive) {
                    if (forceSeek || Math.abs(clip.mediaElement.currentTime - (clip.offset + relTime)) > 0.3) {
                        try { clip.mediaElement.currentTime = clip.offset + relTime; } catch (e) { }
                    }
                    if (playing && clip.mediaElement.paused) {
                        clip.mediaElement.play().catch(() => { });
                    } else if (!playing && !clip.mediaElement.paused) {
                        clip.mediaElement.pause();
                    }
                } else {
                    if (!clip.mediaElement.paused) clip.mediaElement.pause();
                }
            }
        });
    });
}

function renderCanvas() {
    const ctx = state.ctx;
    ctx.clearRect(0, 0, state.project.width, state.project.height);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, state.project.width, state.project.height);

    for (let i = state.tracks.length - 1; i >= 0; i--) {
        const track = state.tracks[i];
        if (!track.visible) continue;
        const clip = track.clips.find(c => state.currentTime >= c.start && state.currentTime < c.start + c.duration);
        if (clip) drawClip(ctx, clip);
    }
    renderGizmos();
}

function drawClip(ctx, clip) {
    ctx.save();
    const cx = clip.props.x + clip.props.width / 2;
    const cy = clip.props.y + clip.props.height / 2;
    ctx.translate(cx, cy);
    ctx.rotate(clip.props.rotation * Math.PI / 180);
    ctx.scale(clip.props.scale, clip.props.scale);
    ctx.translate(-cx, -cy);
    ctx.globalAlpha = clip.props.opacity;
    if (clip.props.blur > 0) ctx.filter = `blur(${clip.props.blur}px)`;

    if ((clip.type === 'video' || clip.type === 'image') && clip.mediaElement) {
        ctx.drawImage(clip.mediaElement, clip.props.x, clip.props.y, clip.props.width, clip.props.height);
    } else if (clip.type === 'text') {
        ctx.font = `${clip.props.fontSize}px ${clip.props.fontFamily}`;
        ctx.fillStyle = clip.props.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(clip.content, cx, cy);
    }
    ctx.restore();
}

// Gizmos
function renderGizmos() {
    elements.overlay.innerHTML = '';
    if (!state.selectedClip) return;
    const clip = state.selectedClip;
    if (state.currentTime < clip.start || state.currentTime > clip.start + clip.duration) return;

    // No scaling needed here because the overlay is inside the scaled container!
    // The CSS transform on canvas-wrapper handles visual scaling.

    const box = document.createElement('div');
    box.className = 'gizmo-box';
    box.style.width = `${clip.props.width}px`;
    box.style.height = `${clip.props.height}px`;
    box.style.left = `${clip.props.x}px`;
    box.style.top = `${clip.props.y}px`;
    box.style.transform = `rotate(${clip.props.rotation}deg) scale(${clip.props.scale})`;

    // Text editing on double click
    if (clip.type === 'text') {
        box.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            startTextEdit(clip, box);
        });
    }

    ['tl', 'tr', 'bl', 'br', 'rot'].forEach(type => {
        const handle = document.createElement('div');
        handle.className = `gizmo-handle handle-${type}`;
        handle.addEventListener('mousedown', (e) => startGizmoDrag(e, type, clip));
        box.appendChild(handle);
    });

    box.addEventListener('mousedown', (e) => {
        if (e.target === box) startGizmoDrag(e, 'move', clip);
    });
    elements.overlay.appendChild(box);
}

function startGizmoDrag(e, type, clip) {
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const initialProps = { ...clip.props };

    // Use exact DOM measurements to ensure 1:1 mouse tracking
    const rect = elements.canvasWrapper.getBoundingClientRect(); // Wrapper is the scaling container
    const scaleX = rect.width / state.project.width;
    const scaleY = rect.height / state.project.height;

    // Use average scale for uniform operations like rotation/scale (since aspect ratio is preserved)
    const avgScale = (scaleX + scaleY) / 2;

    const onMove = (moveEvent) => {
        const dx = (moveEvent.clientX - startX) / scaleX;
        const dy = (moveEvent.clientY - startY) / scaleY;

        if (type === 'move') {
            clip.props.x = initialProps.x + dx;
            clip.props.y = initialProps.y + dy;
        } else if (type === 'rot') {
            // Horizontal drag rotates
            const pixelDelta = moveEvent.clientX - startX;
            clip.props.rotation = (initialProps.rotation + pixelDelta * 0.5) % 360;
        } else {
            // Scaling logic
            // We want 1 pixel of mouse drag to equal 1 pixel of size change * scale
            // But we are changing 'scale' prop, which multiplies width.
            // currentWidth = baseWidth * scale.
            // newWidth = currentWidth + dx.
            // (baseWidth * newScale) = (baseWidth * oldScale) + dx
            // newScale = oldScale + (dx / baseWidth)

            const deltaProjectPixels = dx; // Already unscaled
            // Only horizontal drag affects scale in this simplified model?
            // Let's check which handle.

            let scalingDelta = deltaProjectPixels;
            // Invert if dragging left handle?
            if (type.includes('l')) scalingDelta = -scalingDelta;

            // Simplified: Dragging right increases scale
            const pixelMove = (moveEvent.clientX - startX) / avgScale;
            const scaleChange = pixelMove / 100; // Sensitivity 

            if (type.includes('r') || type.includes('b')) {
                clip.props.scale = Math.max(0.1, initialProps.scale + scaleChange);
            } else {
                clip.props.scale = Math.max(0.1, initialProps.scale - scaleChange);
            }
        }
        renderCanvas();
        updatePropertiesPanel();
    };

    const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        // After interaction, update metrics if text?
        if (clip.type === 'text') updateTextDimensions(clip);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
}

function startTextEdit(clip, gizmoBox) {
    const input = document.createElement('textarea');
    input.value = clip.content;
    input.style.position = 'absolute';
    input.style.left = `${clip.props.x}px`;
    input.style.top = `${clip.props.y}px`;
    input.style.width = `${clip.props.width}px`;
    input.style.height = `${clip.props.height}px`;
    input.style.transform = gizmoBox.style.transform;
    input.style.fontSize = `${clip.props.fontSize}px`;
    input.style.fontFamily = clip.props.fontFamily;
    input.style.color = clip.props.color;
    input.style.background = 'rgba(0,0,0,0.5)';
    input.style.border = '1px solid var(--accent-primary)';
    input.style.backgroundColor = 'transparent'; // Transparent to see below
    input.style.padding = '0'; // Remove default padding
    input.style.outline = 'none';
    input.style.boxSizing = 'border-box';
    input.style.textAlign = 'center'; // Match canvas
    input.style.lineHeight = '1.2'; // Approximate canvas line height
    input.style.zIndex = '100';
    input.style.resize = 'none';
    input.style.overflow = 'hidden';

    // Auto-focus and select all
    elements.overlay.appendChild(input);
    input.focus();
    input.select();

    const finish = () => {
        clip.content = input.value;
        input.remove();
        updateTextDimensions(clip);
        renderTimeline();
        renderCanvas();
    };

    input.addEventListener('blur', finish);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            input.blur();
        }
    });
    input.addEventListener('input', () => {
        clip.content = input.value;
        renderCanvas();
    });
}

function updateTextDimensions(clip) {
    if (clip.type !== 'text') return;
    const ctx = state.ctx;
    ctx.save();
    ctx.font = `${clip.props.fontSize}px ${clip.props.fontFamily}`;
    const metrics = ctx.measureText(clip.content);
    const height = clip.props.fontSize * 1.2; // Approximation
    clip.props.width = Math.max(50, metrics.width + 20); // Padding
    clip.props.height = height;
    ctx.restore();
    renderGizmos();
}

// Asset Management
async function handleFileUpload(e) {
    const files = Array.from(e.target.files);
    for (const file of files) {
        const assetId = crypto.randomUUID();
        const url = URL.createObjectURL(file);
        let type = 'unknown';
        let mediaElement = null;
        let info = {};

        if (file.type.startsWith('video/')) {
            type = 'video';
            mediaElement = document.createElement('video');
            mediaElement.src = url;
            mediaElement.muted = true;
            mediaElement.playsInline = true;
            mediaElement.preload = 'metadata';
            await new Promise(r => mediaElement.onloadedmetadata = r);

            // Capture thumbnail
            mediaElement.currentTime = Math.min(1, mediaElement.duration * 0.1);
            await new Promise(r => mediaElement.onseeked = r);
            const thumbCanvas = document.createElement('canvas');
            thumbCanvas.width = 80;
            thumbCanvas.height = 45;
            thumbCanvas.getContext('2d').drawImage(mediaElement, 0, 0, 80, 45);
            const thumbnail = thumbCanvas.toDataURL('image/jpeg', 0.7);

            info = { duration: mediaElement.duration, width: mediaElement.videoWidth, height: mediaElement.videoHeight, thumbnail };
            mediaElement.currentTime = 0;
        } else if (file.type.startsWith('image/')) {
            type = 'image';
            mediaElement = new Image();
            mediaElement.src = url;
            await new Promise(r => mediaElement.onload = r);
            info = { duration: 5, width: mediaElement.naturalWidth, height: mediaElement.naturalHeight };
        } else if (file.type.startsWith('audio/')) {
            type = 'audio';
            mediaElement = new Audio(url);
            await new Promise(r => mediaElement.onloadedmetadata = r);
            info = { duration: mediaElement.duration };
        }

        const asset = { id: assetId, name: file.name, type, url, mediaElement, info };
        state.assets.push(asset);
        addAssetToUI(asset);
    }
}

function addAssetToUI(asset) {
    const div = document.createElement('div');
    div.className = 'p-3 bg-[var(--bg-primary)] mb-2 rounded-lg border border-[var(--border-color)] flex items-center gap-3 cursor-pointer hover:bg-[var(--bg-tertiary)] hover:border-[var(--accent-primary)] transition-all group';

    let thumb = '';
    if (asset.type === 'video') {
        const src = asset.info.thumbnail || asset.url;
        thumb = '<div class="w-10 h-10 bg-black rounded overflow-hidden flex-shrink-0 relative"><img src="' + src + '" class="w-full h-full object-cover"><div class="absolute inset-0 flex items-center justify-center bg-black/30 text-white">▶</div></div>';
    } else if (asset.type === 'image') {
        thumb = '<div class="w-10 h-10 bg-black rounded overflow-hidden flex-shrink-0"><img src="' + asset.url + '" class="w-full h-full object-cover"></div>';
    } else {
        thumb = '<div class="w-10 h-10 bg-gray-700 rounded flex items-center justify-center text-xs font-semibold text-white">AUDIO</div>';
    }

    div.innerHTML = thumb + '<div class="flex-1 min-w-0"><div class="truncate text-xs font-medium" title="' + asset.name + '">' + asset.name + '</div><div class="text-xs opacity-60">' + formatTime(asset.info.duration || 0) + '</div></div>' +
        '<div class="flex gap-1 opacity-0 group-hover:opacity-100">' +
        '<button class="p-1 bg-blue-500 text-white rounded text-xs add-btn">+</button>' +
        '<button class="p-1 bg-red-500 text-white rounded text-xs delete-btn" title="Delete Asset">×</button>' +
        '</div>';

    div.querySelector('.add-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        createClipFromAsset(asset);
    });

    div.querySelector('.delete-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('Delete this asset?')) {
            state.assets = state.assets.filter(a => a.id !== asset.id);
            // Remove clips using this asset
            state.tracks.forEach(track => {
                track.clips = track.clips.filter(c => c.assetId !== asset.id);
            });
            selectClip(null);
            div.remove();
            renderTimeline();
            renderCanvas();
        }
    });

    div.draggable = true;
    div.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'asset', id: asset.id }));
        e.dataTransfer.effectAllowed = 'copy';
        state.draggingAsset = asset;
    });
    div.addEventListener('dragend', () => {
        state.draggingAsset = null;
        document.querySelectorAll('.ghost-clip').forEach(el => el.remove());
    });

    elements.assetsList.appendChild(div);
}

function formatTime(s) {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function createClipFromAsset(asset) {
    const track = state.tracks.find(t => t.clips.length === 0) || state.tracks[0];
    const clip = {
        id: crypto.randomUUID(),
        assetId: asset.id,
        type: asset.type,
        mediaElement: asset.mediaElement,
        start: state.currentTime,
        offset: 0,
        duration: asset.info.duration || 5,
        name: asset.name,
        props: {
            x: 0, y: 0,
            width: asset.info.width || 400,
            height: asset.info.height || 100,
            scale: 1, rotation: 0, opacity: 1, blur: 0,
            fontSize: 40, fontFamily: 'Arial', color: '#ffffff'
        }
    };

    if (clip.props.width > state.project.width) {
        const ratio = state.project.width / clip.props.width;
        clip.props.width *= ratio;
        clip.props.height *= ratio;
    }
    clip.props.x = (state.project.width - clip.props.width) / 2;
    clip.props.y = (state.project.height - clip.props.height) / 2;

    track.clips.push(clip);
    checkDuration(clip.start + clip.duration);
    resolveClipOverlaps(track, clip);
    renderTimeline();
    renderCanvas();
    selectClip(clip);
}

function addTextClip() {
    const clip = {
        id: crypto.randomUUID(),
        type: 'text',
        start: state.currentTime,
        duration: 5,
        content: 'TEXT',
        props: {
            x: state.project.width / 2, y: state.project.height / 2,
            width: 0, height: 0, scale: 1, rotation: 0, opacity: 1, blur: 0,
            fontSize: 60, fontFamily: 'Inter', color: '#ffffff'
        }
    };

    // Measure text to set initial bounds
    const ctx = state.ctx;
    ctx.save();
    ctx.font = `${clip.props.fontSize}px ${clip.props.fontFamily}`;
    const metrics = ctx.measureText(clip.content);
    clip.props.width = metrics.width + 20;
    clip.props.height = clip.props.fontSize * 1.2;
    clip.props.x = (state.project.width - clip.props.width) / 2;
    ctx.restore();

    state.tracks[0].clips.push(clip);
    checkDuration(clip.start + 5);
    renderTimeline();
    renderCanvas();
    selectClip(clip);
}

function checkDuration(end) {
    if (end > state.duration) state.duration = Math.ceil(end + 10);
}

function copyClip() {
    if (state.selectedClip) state.clipboard = JSON.parse(JSON.stringify(state.selectedClip));
}

function pasteClip() {
    if (state.clipboard) {
        const newClip = JSON.parse(JSON.stringify(state.clipboard));
        newClip.id = crypto.randomUUID();
        newClip.start = state.currentTime;
        if (newClip.type !== 'text') {
            const asset = state.assets.find(a => a.id === newClip.assetId);
            if (asset) newClip.mediaElement = asset.mediaElement;
        }
        const track = state.tracks.find(t => t.clips.length === 0) || state.tracks[0];
        track.clips.push(newClip);
        checkDuration(newClip.start + newClip.duration);
        renderTimeline();
        renderCanvas();
        selectClip(newClip);
    }
}

function zoomTimeline(factor, mouseX) {
    const oldZoom = state.zoom;
    state.zoom = Math.max(state.minZoom, Math.min(state.maxZoom, state.zoom * factor));
    if (mouseX) {
        const rect = elements.timelineScrollArea.getBoundingClientRect();
        const scrollLeft = elements.timelineScrollArea.scrollLeft;
        const pointerTime = (mouseX - rect.left + scrollLeft - 150) / oldZoom;
        renderTimeline();
        updatePlayhead();
        elements.timelineScrollArea.scrollLeft = (pointerTime * state.zoom) + 150 - (mouseX - rect.left);
    } else {
        renderTimeline();
        updatePlayhead();
    }
}

function addTrack() {
    const id = state.tracks.length + 1;
    state.tracks.push({ id, name: `Track ${id}`, clips: [], visible: true, locked: false });
    renderTimeline();
}

function removeTrack(track) {
    if (state.tracks.length <= 1) return;
    state.tracks = state.tracks.filter(t => t !== track);
    renderTimeline();
}

function toggleFullscreen() {
    const panel = elements.previewPanel || elements.canvas.parentElement;
    if (!document.fullscreenElement) {
        panel.requestFullscreen().catch(err => alert(`Fullscreen error: ${err.message}`));
    } else {
        document.exitFullscreen();
    }
    document.addEventListener('fullscreenchange', () => setTimeout(fitPreviewToContainer, 100), { once: true });
}

// Timeline
function renderTimeline() {
    const totalWidth = state.duration * state.zoom;
    elements.timelineRuler.style.width = `${totalWidth}px`;
    elements.timelineTracks.innerHTML = '';
    elements.timelineTracks.style.width = `${totalWidth}px`;

    state.tracks.forEach((track, index) => {
        const trackDiv = document.createElement('div');
        trackDiv.className = 'track-container group';

        const header = document.createElement('div');
        header.className = 'track-header';
        const nameInput = document.createElement('input');
        nameInput.className = 'track-name-input truncate';
        nameInput.value = track.name;
        nameInput.onchange = (e) => { track.name = e.target.value; };

        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '×';
        deleteBtn.className = 'text-red-400 hover:text-red-600 px-1 opacity-0 group-hover:opacity-100';
        deleteBtn.onclick = () => removeTrack(track);

        header.appendChild(nameInput);
        header.appendChild(deleteBtn);
        trackDiv.appendChild(header);

        const lane = document.createElement('div');
        lane.className = 'track-lane';
        lane.style.width = `${Math.max(totalWidth, 800)}px`;

        // Drop zone with ghost preview
        lane.addEventListener('dragover', e => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            if (state.draggingAsset) {
                const rect = elements.timelineScrollArea.getBoundingClientRect();
                const time = Math.max(0, (e.clientX - rect.left + elements.timelineScrollArea.scrollLeft - 150) / state.zoom);
                let ghost = lane.querySelector('.ghost-clip');
                if (!ghost) {
                    ghost = document.createElement('div');
                    ghost.className = 'ghost-clip absolute h-full bg-white/20 border border-white/40 rounded pointer-events-none z-20 text-xs text-white px-1 overflow-hidden';
                    lane.appendChild(ghost);
                }
                ghost.style.left = `${time * state.zoom}px`;
                ghost.style.width = `${(state.draggingAsset.info.duration || 5) * state.zoom}px`;
                ghost.textContent = state.draggingAsset.name;
            }
        });
        lane.addEventListener('dragleave', (e) => {
            if (!lane.contains(e.relatedTarget)) {
                const ghost = lane.querySelector('.ghost-clip');
                if (ghost) ghost.remove();
            }
        });
        lane.addEventListener('drop', e => {
            e.preventDefault();
            const ghost = lane.querySelector('.ghost-clip');
            if (ghost) ghost.remove();
            try {
                const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                const asset = state.draggingAsset || state.assets.find(a => a.id === data.id);
                if (asset) createClipAtMouse(asset, e, index);
            } catch (err) { }
            state.draggingAsset = null;
        });

        track.clips.forEach(clip => {
            const clipDiv = document.createElement('div');
            const typeClass = clip.type === 'video' ? 'type-video' : clip.type === 'audio' ? 'type-audio' : 'type-text';
            clipDiv.className = `timeline-clip ${typeClass} ${state.selectedClip?.id === clip.id ? 'selected' : ''}`;
            clipDiv.style.left = `${clip.start * state.zoom}px`;
            clipDiv.style.width = `${Math.max(2, clip.duration * state.zoom)}px`;

            const contentSpan = document.createElement('span');
            contentSpan.className = 'truncate pointer-events-none';
            contentSpan.textContent = clip.type === 'text' ? clip.content : (clip.name || clip.type);
            clipDiv.appendChild(contentSpan);

            // Resize handles
            const leftHandle = document.createElement('div');
            leftHandle.className = 'clip-handle handle-left';
            const rightHandle = document.createElement('div');
            rightHandle.className = 'clip-handle handle-right';
            clipDiv.appendChild(leftHandle);
            clipDiv.appendChild(rightHandle);

            leftHandle.addEventListener('mousedown', (e) => handleClipInteraction(e, clip, track, 'resize-left'));
            rightHandle.addEventListener('mousedown', (e) => handleClipInteraction(e, clip, track, 'resize-right'));
            clipDiv.addEventListener('mousedown', (e) => {
                if (e.target === leftHandle || e.target === rightHandle) return;
                handleClipInteraction(e, clip, track, 'move');
            });
            clipDiv.addEventListener('click', (e) => { e.stopPropagation(); selectClip(clip); });

            lane.appendChild(clipDiv);
        });

        trackDiv.appendChild(lane);
        elements.timelineTracks.appendChild(trackDiv);
    });

    updatePlayhead();
}

function handleClipInteraction(e, clip, track, mode) {
    if (e.button !== 0) return;
    e.stopPropagation();
    selectClip(clip);

    const startX = e.clientX;
    const startY = e.clientY;
    const initialStart = clip.start;
    const initialDuration = clip.duration;
    const initialOffset = clip.offset || 0;
    const initialTrackIndex = state.tracks.indexOf(track);

    const onMove = (moveEvent) => {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        const dt = dx / state.zoom;

        if (mode === 'move') {
            clip.start = Math.max(0, initialStart + dt);
            const trackDiff = Math.round(dy / 60);
            const newIndex = initialTrackIndex + trackDiff;
            if (newIndex !== initialTrackIndex && newIndex >= 0 && newIndex < state.tracks.length) {
                track.clips = track.clips.filter(c => c.id !== clip.id);
                state.tracks[newIndex].clips.push(clip);
                track = state.tracks[newIndex];
            }
        } else if (mode === 'resize-left') {
            let newStart = initialStart + dt;
            let newDuration = initialDuration - dt;
            if (newDuration < 0.1) { newStart = initialStart + initialDuration - 0.1; newDuration = 0.1; }
            if (newStart < 0) { newDuration += newStart; newStart = 0; }
            const delta = newStart - initialStart;
            if (clip.type !== 'text' && initialOffset + delta < 0) {
                clip.offset = 0;
                newStart = initialStart - initialOffset;
                newDuration = initialDuration + initialOffset;
            } else {
                clip.offset = initialOffset + delta;
            }
            clip.start = newStart;
            clip.duration = newDuration;
        } else if (mode === 'resize-right') {
            let newDuration = initialDuration + dt;
            if (newDuration < 0.1) newDuration = 0.1;
            if (clip.type !== 'text' && clip.mediaElement) {
                const maxDur = clip.mediaElement.duration - (clip.offset || 0);
                if (newDuration > maxDur) newDuration = maxDur;
            }
            clip.duration = newDuration;
        }

        checkDuration(clip.start + clip.duration);
        renderTimeline();
        renderCanvas();
    };

    const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        resolveClipOverlaps(track, clip);
        renderTimeline();
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
}

function resolveClipOverlaps(track, selectedClip) {
    if (!track || !selectedClip) return;
    const selectedStart = selectedClip.start;
    const selectedEnd = selectedClip.start + selectedClip.duration;

    track.clips.forEach(otherClip => {
        if (otherClip.id === selectedClip.id) return;
        const otherStart = otherClip.start;
        const otherEnd = otherClip.start + otherClip.duration;

        if (selectedStart < otherEnd && selectedEnd > otherStart) {
            if (selectedStart <= otherStart && selectedEnd >= otherEnd) {
                otherClip.duration = 0;
            } else if (selectedStart <= otherStart) {
                const trimAmount = selectedEnd - otherStart;
                otherClip.start = selectedEnd;
                otherClip.duration -= trimAmount;
                if (otherClip.type !== 'text') otherClip.offset = (otherClip.offset || 0) + trimAmount;
            } else if (selectedEnd >= otherEnd) {
                otherClip.duration = selectedStart - otherStart;
            } else {
                otherClip.duration = selectedStart - otherStart;
            }
        }
    });

    track.clips = track.clips.filter(c => c.duration > 0.01);
}

function createClipAtMouse(asset, e, trackIndex) {
    const rect = elements.timelineScrollArea.getBoundingClientRect();
    const scrollLeft = elements.timelineScrollArea.scrollLeft;
    const time = Math.max(0, (e.clientX - rect.left + scrollLeft - 150) / state.zoom);
    state.currentTime = time;

    const track = state.tracks[trackIndex];
    const clip = {
        id: crypto.randomUUID(),
        assetId: asset.id,
        type: asset.type,
        mediaElement: asset.mediaElement,
        start: time,
        offset: 0,
        duration: asset.info.duration || 5,
        name: asset.name,
        props: {
            x: 0, y: 0,
            width: asset.info.width || state.project.width,
            height: asset.info.height || state.project.height,
            scale: 1, rotation: 0, opacity: 1, blur: 0,
            fontSize: 40, fontFamily: 'Arial', color: '#ffffff'
        }
    };

    if (clip.props.width > state.project.width || clip.props.height > state.project.height) {
        const ratio = Math.min(state.project.width / clip.props.width, state.project.height / clip.props.height);
        clip.props.width *= ratio;
        clip.props.height *= ratio;
    }
    clip.props.x = (state.project.width - clip.props.width) / 2;
    clip.props.y = (state.project.height - clip.props.height) / 2;

    track.clips.push(clip);
    checkDuration(clip.start + clip.duration);
    resolveClipOverlaps(track, clip);
    selectClip(clip);
    renderTimeline();
    renderCanvas();
}

function updatePlayhead() {
    const headerWidth = 150;
    const scrollLeft = elements.timelineScrollArea ? elements.timelineScrollArea.scrollLeft : 0;
    const px = (state.currentTime * state.zoom) + headerWidth - scrollLeft;
    elements.playhead.style.left = `${px}px`;
}

function handleSeek(e) {
    const rect = elements.timelineRuler.getBoundingClientRect();
    const scrollLeft = elements.timelineRulerContainer ? elements.timelineRulerContainer.scrollLeft : 0;
    const x = e.clientX - rect.left + scrollLeft;
    seek(Math.max(0, x / state.zoom));

    const onMove = (m) => {
        const moveX = m.clientX - rect.left + scrollLeft;
        seek(Math.max(0, moveX / state.zoom));
    };
    const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
}

function selectClip(clip) {
    state.selectedClip = clip;
    renderTimeline();
    updatePropertiesPanel();
    renderGizmos();
}

function updatePropertiesPanel() {
    elements.propertiesContent.innerHTML = '';
    if (!state.selectedClip) {
        elements.propertiesContent.innerHTML = '<div class="text-center text-sm mt-4 opacity-50">No clip selected</div>';
        return;
    }
    const clip = state.selectedClip;
    const props = clip.props;

    const createInput = (label, type, value, onChange) => {
        const div = document.createElement('div');
        div.className = 'flex justify-between items-center mb-2';
        div.innerHTML = `<label class="text-xs">${label}</label>`;
        const input = document.createElement('input');
        input.className = 'w-24 px-2 py-1 text-xs rounded bg-[var(--bg-tertiary)] border border-[var(--border-color)]';
        if (type === 'range') {
            input.type = 'range';
            if (label === 'Opacity') { input.min = 0; input.max = 1; input.step = 0.1; }
            if (label === 'Rotation') { input.min = 0; input.max = 360; input.step = 1; }
            if (label === 'Blur') { input.min = 0; input.max = 50; input.step = 1; }
            if (label === 'Scale') { input.min = 0.1; input.max = 3; input.step = 0.1; }
        } else {
            input.type = type;
        }
        input.value = value;
        input.addEventListener('input', (e) => {
            onChange(type === 'number' || type === 'range' ? parseFloat(e.target.value) : e.target.value);
            renderCanvas();
        });
        div.appendChild(input);
        return div;
    };

    if (clip.type === 'text') {
        elements.propertiesContent.appendChild(createInput('Text', 'text', clip.content, v => { clip.content = v; renderTimeline(); }));
        elements.propertiesContent.appendChild(createInput('Font Size', 'number', props.fontSize, v => props.fontSize = v));
        elements.propertiesContent.appendChild(createInput('Color', 'color', props.color, v => props.color = v));
    }
    elements.propertiesContent.appendChild(createInput('X', 'number', props.x, v => { props.x = v; renderGizmos(); }));
    elements.propertiesContent.appendChild(createInput('Y', 'number', props.y, v => { props.y = v; renderGizmos(); }));
    elements.propertiesContent.appendChild(createInput('Scale', 'range', props.scale, v => { props.scale = v; renderGizmos(); }));
    elements.propertiesContent.appendChild(createInput('Rotation', 'range', props.rotation, v => { props.rotation = v; renderGizmos(); }));
    elements.propertiesContent.appendChild(createInput('Opacity', 'range', props.opacity, v => props.opacity = v));
}

function deleteSelectedClip() {
    if (!state.selectedClip) return;
    state.tracks.forEach(t => t.clips = t.clips.filter(c => c.id !== state.selectedClip.id));
    selectClip(null);
    renderTimeline();
    renderCanvas();
}

function splitClip() {
    const targetClip = state.selectedClip;
    if (!targetClip) return;
    if (state.currentTime <= targetClip.start || state.currentTime >= targetClip.start + targetClip.duration) return;

    const track = state.tracks.find(t => t.clips.includes(targetClip));
    const splitPoint = state.currentTime - targetClip.start;

    const newClip = JSON.parse(JSON.stringify(targetClip));
    newClip.id = crypto.randomUUID();
    if (targetClip.type !== 'text') {
        const asset = state.assets.find(a => a.id === targetClip.assetId);
        if (asset) newClip.mediaElement = asset.mediaElement;
    }

    const oldDuration = targetClip.duration;
    targetClip.duration = splitPoint;
    newClip.start = state.currentTime;
    newClip.duration = oldDuration - splitPoint;
    newClip.offset = (targetClip.offset || 0) + splitPoint;

    track.clips.push(newClip);
    renderTimeline();
    renderCanvas();
}

// Export - Uses real-time playback for proper timing synchronization
async function exportVideo() {
    const modal = document.getElementById('rendering-modal');
    const progressBar = document.getElementById('render-progress');
    const cancelBtn = document.getElementById('btn-cancel-export');

    modal.classList.remove('hidden');

    // Stop any current playback
    if (state.isPlaying) {
        togglePlay();
    }

    // Calculate total duration based on clips
    let maxTime = 0;
    state.tracks.forEach(t => t.clips.forEach(c => maxTime = Math.max(maxTime, c.start + c.duration)));
    if (maxTime === 0) {
        alert('No clips to export!');
        modal.classList.add('hidden');
        return;
    }

    // Seek to start and prepare
    seek(0);
    renderCanvas();
    progressBar.style.width = '0%';

    const fps = state.project.fps;

    // Setup MediaRecorder with canvas stream
    const stream = state.canvas.captureStream(fps);

    // Try to add audio tracks from video/audio clips
    let audioContext = null;
    let audioDestination = null;

    try {
        audioContext = new AudioContext();
        audioDestination = audioContext.createMediaStreamDestination();
        let hasAudio = false;

        state.tracks.forEach(track => {
            track.clips.forEach(clip => {
                if ((clip.type === 'video' || clip.type === 'audio') && clip.mediaElement) {
                    try {
                        // Check if not already connected
                        if (!clip._audioSourceConnected) {
                            const source = audioContext.createMediaElementSource(clip.mediaElement);
                            source.connect(audioDestination);
                            source.connect(audioContext.destination);
                            clip._audioSourceConnected = true;
                            hasAudio = true;
                        }
                    } catch (e) {
                        console.log('Could not connect audio source:', e);
                    }
                }
            });
        });

        if (hasAudio) {
            audioDestination.stream.getAudioTracks().forEach(track => {
                stream.addTrack(track);
            });
        }
    } catch (e) {
        console.log('Audio context error:', e);
    }

    const mimeType = MediaRecorder.isTypeSupported("video/webm; codecs=vp9")
        ? "video/webm; codecs=vp9"
        : MediaRecorder.isTypeSupported("video/webm; codecs=vp8")
            ? "video/webm; codecs=vp8"
            : "video/webm";

    const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 8000000
    });
    const chunks = [];

    recorder.ondataavailable = e => {
        if (e.data && e.data.size > 0) {
            chunks.push(e.data);
        }
    };

    let cancelled = false;
    let exportEnded = false;

    recorder.onstop = () => {
        exportEnded = true;
        if (cancelled) return;

        if (chunks.length === 0) {
            alert('Export failed: No video data was recorded.');
            modal.classList.add('hidden');
            seek(0);
            return;
        }

        const blob = new Blob(chunks, { type: mimeType });
        if (blob.size < 1000) {
            alert('Export may have failed: Video file is very small.');
        }

        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `video-export-${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        modal.classList.add('hidden');
        seek(0);
        renderCanvas();

        // Cleanup
        if (audioContext && audioContext.state !== 'closed') {
            audioContext.close().catch(() => { });
        }
    };

    const cleanup = () => {
        if (audioContext && audioContext.state !== 'closed') {
            audioContext.close().catch(() => { });
        }
    };

    const handleCancel = () => {
        cancelled = true;
        if (state.isPlaying) {
            togglePlay();
        }
        recorder.stop();
        modal.classList.add('hidden');
        seek(0);
        renderCanvas();
        cancelBtn.removeEventListener('click', handleCancel);
        cleanup();
    };
    cancelBtn.addEventListener('click', handleCancel);

    // Start recording
    recorder.start(100);

    // Give recorder a moment to initialize
    await new Promise(resolve => setTimeout(resolve, 100));

    // Start real-time playback - this uses the existing loop() function
    // which properly handles media sync and canvas rendering
    state.lastTime = performance.now();
    state.isPlaying = true;
    elements.playIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />';
    syncMedia(true);

    // Monitor progress and stop when complete
    const checkInterval = setInterval(() => {
        if (cancelled || exportEnded) {
            clearInterval(checkInterval);
            return;
        }

        const percent = Math.min(100, (state.currentTime / maxTime) * 100);
        progressBar.style.width = `${percent}%`;

        if (state.currentTime >= maxTime) {
            clearInterval(checkInterval);

            // Stop playback
            if (state.isPlaying) {
                state.isPlaying = false;
                elements.playIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />';
                syncMedia(false);
            }

            // Small delay to ensure last frames are captured
            setTimeout(() => {
                if (!exportEnded) {
                    recorder.stop();
                }
                cancelBtn.removeEventListener('click', handleCancel);
            }, 300);
        }
    }, 50);
}

// Start
init();
