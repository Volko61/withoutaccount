/**
 * WithoutAccount - PDF Editor
 * Client-side PDF editing using PDF.js for rendering and pdf-lib for saving
 */
(function () {
    'use strict';

    // Object types (Copied and adapted from Image Editor)
    class EditorObject {
        constructor(type, x, y, width, height) {
            this.id = 'obj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            this.type = type;
            this.x = x; this.y = y;
            this.width = width; this.height = height;
            this.rotation = 0;
            this.visible = true;
            this.locked = false;
            this.name = type.charAt(0).toUpperCase() + type.slice(1);
        }

        containsPoint(px, py) {
            return px >= this.x && px <= this.x + this.width && py >= this.y && py <= this.y + this.height;
        }

        draw(ctx) { }

        getHandle(px, py) {
            const h = 8, handles = this.getHandles();
            for (let [name, hx, hy] of handles) {
                if (Math.abs(px - hx) < h && Math.abs(py - hy) < h) return name;
            }
            return null;
        }

        getHandles() {
            const { x, y, width: w, height: h } = this;
            return [
                ['nw', x, y], ['n', x + w / 2, y], ['ne', x + w, y],
                ['w', x, y + h / 2], ['e', x + w, y + h / 2],
                ['sw', x, y + h], ['s', x + w / 2, y + h], ['se', x + w, y + h],
                ['rotate', x + w / 2, y - 20]
            ];
        }
    }

    class ImageObject extends EditorObject {
        constructor(img, x, y, width, height) {
            super('image', x, y, width || img.width, height || img.height);
            this.image = img;
            this.imageDataUrl = null; // Store for PDF embedding
            // If created from URL, we might need to fetch it to get bytes for PDF export
        }

        draw(ctx) {
            if (!this.visible) return;
            ctx.save();
            ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
            ctx.rotate(this.rotation * Math.PI / 180);
            ctx.drawImage(this.image, -this.width / 2, -this.height / 2, this.width, this.height);
            ctx.restore();
        }
    }

    class TextObject extends EditorObject {
        constructor(text, x, y, settings) {
            super('text', x, y, 100, 40);
            this.text = text;
            this.font = settings.font || 'Inter';
            this.fontSize = settings.size || 24;
            this.color = settings.color || '#000000';
            this.alignment = settings.align || 'center';
            this.lineSpacing = settings.lineSpacing || 1.2;
            this.updateSize();
        }

        updateSize() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            ctx.font = `${this.fontSize}px ${this.font}, sans-serif`;

            const lines = this.text.split('\n');
            let maxWidth = 0;
            lines.forEach(line => {
                const metrics = ctx.measureText(line);
                maxWidth = Math.max(maxWidth, metrics.width);
            });

            const paddingX = Math.max(12, Math.round(this.fontSize * 0.35));
            const paddingY = Math.max(12, Math.round(this.fontSize * 0.3));
            this.width = Math.max(50, maxWidth + paddingX * 2);
            this.height = (this.fontSize * this.lineSpacing * lines.length) + paddingY * 2;
        }

        draw(ctx) {
            if (!this.visible) return;
            ctx.save();
            ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
            ctx.rotate(this.rotation * Math.PI / 180);
            ctx.font = `${this.fontSize}px ${this.font}, sans-serif`;
            ctx.fillStyle = this.color;
            ctx.textBaseline = 'top';
            ctx.textAlign = this.alignment;

            const lines = this.text.split('\n');
            const totalHeight = this.fontSize * this.lineSpacing * lines.length;
            const paddingY = (this.height - totalHeight) / 2;
            const startY = -this.height / 2 + paddingY;
            const anchorX = this.alignment === 'left' ? -this.width / 2 : this.alignment === 'right' ? this.width / 2 : 0;

            lines.forEach((line, i) => {
                ctx.fillText(line, anchorX, startY + (i * this.fontSize * this.lineSpacing));
            });
            ctx.restore();
        }
    }

    class ShapeObject extends EditorObject {
        constructor(shapeType, x, y, width, height, settings) {
            super('shape', x, y, width, height);
            this.shapeType = shapeType;
            this.strokeColor = settings.strokeColor || '#6366f1';
            this.fillColor = settings.fillColor || 'transparent';
            this.strokeWidth = settings.strokeWidth || 3;
            this.filled = settings.filled || false;
            this.name = shapeType.charAt(0).toUpperCase() + shapeType.slice(1);
        }

        draw(ctx) {
            if (!this.visible) return;
            ctx.save();
            ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
            ctx.rotate(this.rotation * Math.PI / 180);
            ctx.strokeStyle = this.strokeColor;
            ctx.lineWidth = this.strokeWidth;
            ctx.fillStyle = this.fillColor;

            const w = this.width, h = this.height;

            if (this.shapeType === 'rect') {
                if (this.filled) ctx.fillRect(-w / 2, -h / 2, w, h);
                ctx.strokeRect(-w / 2, -h / 2, w, h);
            } else if (this.shapeType === 'circle') {
                ctx.beginPath();
                ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
                if (this.filled) ctx.fill();
                ctx.stroke();
            }
            ctx.restore();
        }
    }

    class DrawingObject extends EditorObject {
        constructor(color, size, opacity) {
            super('drawing', 0, 0, 0, 0);
            this.paths = [];
            this.color = color;
            this.size = size;
            this.opacity = opacity;
            this.name = 'Drawing';
        }

        addPoint(x, y, isNew) {
            if (isNew) this.paths.push([]);
            if (this.paths.length > 0) {
                this.paths[this.paths.length - 1].push({ x, y });
                this.updateBounds();
            }
        }

        updateBounds() {
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (const path of this.paths) {
                for (const p of path) {
                    minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
                    maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
                }
            }
            if (minX !== Infinity) {
                this.x = minX - this.size; this.y = minY - this.size;
                this.width = maxX - minX + this.size * 2;
                this.height = maxY - minY + this.size * 2;
            }
        }

        draw(ctx) {
            if (!this.visible || this.paths.length === 0) return;
            ctx.save();
            ctx.globalAlpha = this.opacity / 100;
            ctx.strokeStyle = this.color;
            ctx.lineWidth = this.size;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            for (const path of this.paths) {
                if (path.length < 2) continue;
                ctx.beginPath();
                ctx.moveTo(path[0].x, path[0].y);
                for (let i = 1; i < path.length; i++) {
                    ctx.lineTo(path[i].x, path[i].y);
                }
                ctx.stroke();
            }
            ctx.restore();
        }

        toSvgPath() {
            let d = '';
            for (const path of this.paths) {
                if (path.length < 2) continue;
                d += `M ${path[0].x} ${path[0].y} `;
                for (let i = 1; i < path.length; i++) {
                    d += `L ${path[i].x} ${path[i].y} `;
                }
            }
            return d;
        }
    }

    // PDF Editor State
    const state = {
        pdfDoc: null,
        pdfFileBytes: null,
        currentPage: 1,
        numPages: 0,
        baseRenderScale: 1.5,
        zoom: 1,
        pagesData: {}, // { pageNum: [objects] }

        canvas: null, ctx: null,
        objects: [], // Current page objects
        selectedObject: null,
        currentTool: 'select',
        isDrawing: false,
        isDragging: false,
        isResizing: false,
        isPanning: false,
        resizeHandle: null,
        startX: 0, startY: 0,
        lastX: 0, lastY: 0,
        dragOffsetX: 0, dragOffsetY: 0,
        panStartX: 0,
        panStartY: 0,
        panScrollLeft: 0,
        panScrollTop: 0,
        spacePressed: false,

        brushSize: 5,
        brushColor: '#000000',
        brushOpacity: 100,

        textSettings: { text: 'Type here', font: 'Inter', size: 24, color: '#000000', align: 'center', lineSpacing: 1.2 },
        shapeSettings: { type: 'rect', strokeColor: '#ff0000', fillColor: '#000000', strokeWidth: 3, filled: false },

        currentDrawing: null,
        shapeStart: null,

        canvasWidth: 800,
        canvasHeight: 600,

        // History for undo/redo (simple version: snapshot of current page objects)
        history: [], // Stack of stringified objects arrays for current page
        historyIndex: -1
    };

    let dropZone, fileInput, editor, mainCanvas, canvasContainer, canvasWrapper;
    let toolButtons, toolOptionsContent, objectsList;
    let brushCursor, addImageInput;
    let pageIndicator, prevPageBtn, nextPageBtn;

    function init() {
        dropZone = document.getElementById('drop-zone');
        fileInput = document.getElementById('file-input');
        editor = document.getElementById('editor');
        mainCanvas = document.getElementById('main-canvas');
        canvasContainer = document.getElementById('canvas-container');
        canvasWrapper = document.getElementById('canvas-wrapper');
        toolButtons = document.querySelectorAll('.tool-btn[data-tool]');
        toolOptionsContent = document.getElementById('tool-options-content');
        objectsList = document.getElementById('objects-list');
        brushCursor = document.getElementById('brush-cursor');
        addImageInput = document.getElementById('add-image-input');

        pageIndicator = document.getElementById('page-indicator');
        prevPageBtn = document.getElementById('prev-page');
        nextPageBtn = document.getElementById('next-page');

        state.canvas = mainCanvas;
        state.ctx = mainCanvas.getContext('2d');
        mainCanvas.style.transformOrigin = 'top left';

        bindEvents();
    }

    function clampZoom(value) {
        return Math.max(0.5, Math.min(3, value));
    }

    function updateCanvasDisplaySize() {
        const displayWidth = state.canvasWidth * state.zoom;
        const displayHeight = state.canvasHeight * state.zoom;

        mainCanvas.style.width = displayWidth + 'px';
        mainCanvas.style.height = displayHeight + 'px';
        canvasWrapper.style.width = displayWidth + 'px';
        canvasWrapper.style.height = displayHeight + 'px';
    }

    function centerWorkspace() {
        requestAnimationFrame(() => {
            const maxScrollLeft = Math.max(0, canvasContainer.scrollWidth - canvasContainer.clientWidth);
            const maxScrollTop = Math.max(0, canvasContainer.scrollHeight - canvasContainer.clientHeight);
            canvasContainer.scrollLeft = maxScrollLeft / 2;
            canvasContainer.scrollTop = maxScrollTop / 2;
        });
    }

    function setZoom(nextZoom, anchorEvent, recenter = false) {
        const previousZoom = state.zoom;
        const clampedZoom = clampZoom(nextZoom);

        if (clampedZoom === previousZoom) {
            if (recenter) {
                centerWorkspace();
            }
            return;
        }

        state.zoom = clampedZoom;
        updateCanvasDisplaySize();

        if (recenter) {
            centerWorkspace();
            updateZoomLabel();
            render();
            updateCanvasCursor();
            return;
        }

        const rect = canvasContainer.getBoundingClientRect();
        const anchorX = anchorEvent ? anchorEvent.clientX - rect.left + canvasContainer.scrollLeft : canvasContainer.scrollLeft + canvasContainer.clientWidth / 2;
        const anchorY = anchorEvent ? anchorEvent.clientY - rect.top + canvasContainer.scrollTop : canvasContainer.scrollTop + canvasContainer.clientHeight / 2;
        const focusX = anchorX / previousZoom;
        const focusY = anchorY / previousZoom;

        canvasContainer.scrollLeft = focusX * state.zoom - (anchorEvent ? anchorEvent.clientX - rect.left : canvasContainer.clientWidth / 2);
        canvasContainer.scrollTop = focusY * state.zoom - (anchorEvent ? anchorEvent.clientY - rect.top : canvasContainer.clientHeight / 2);
        updateZoomLabel();
        render();
        updateCanvasCursor();
    }

    function updateZoomLabel() {
        const zoomValue = document.getElementById('zoom-value');
        if (zoomValue) {
            zoomValue.textContent = Math.round(state.zoom * 100) + '%';
        }
    }

    function resizeTextObjectKeepingCenter(textObj, updateFn) {
        const centerX = textObj.x + textObj.width / 2;
        const centerY = textObj.y + textObj.height / 2;
        updateFn();
        textObj.updateSize();
        textObj.x = centerX - textObj.width / 2;
        textObj.y = centerY - textObj.height / 2;
    }

    function bindEvents() {
        // Toolbar toggle
        const toggleBtn = document.getElementById('toolbar-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                document.getElementById('main-toolbar').classList.toggle('expanded');
            });
        }

        dropZone.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', e => { if (e.target.files[0]) loadPDF(e.target.files[0]); });
        dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
        dropZone.addEventListener('drop', e => { e.preventDefault(); dropZone.classList.remove('dragover'); if (e.dataTransfer.files[0]) loadPDF(e.dataTransfer.files[0]); });

        toolButtons.forEach(btn => btn.addEventListener('click', () => selectTool(btn.dataset.tool)));

        canvasContainer.addEventListener('mousedown', onWorkspaceMouseDown);
        canvasContainer.addEventListener('mousemove', onWorkspaceMouseMove);
        canvasContainer.addEventListener('mouseup', onWorkspaceMouseUp);
        canvasContainer.addEventListener('mouseleave', onWorkspaceMouseUp);
        canvasContainer.addEventListener('wheel', onWorkspaceWheel, { passive: false });

        mainCanvas.addEventListener('mousedown', onCanvasMouseDown);
        mainCanvas.addEventListener('mousemove', onCanvasMouseMove);
        mainCanvas.addEventListener('mouseup', onCanvasMouseUp);
        mainCanvas.addEventListener('mouseleave', onCanvasMouseLeave);
        mainCanvas.addEventListener('dblclick', onCanvasDoubleClick);
        mainCanvas.addEventListener('wheel', onCanvasWheel, { passive: false });

        document.getElementById('undo-btn').addEventListener('click', undo);
        document.getElementById('redo-btn').addEventListener('click', redo);
        document.getElementById('delete-object-btn').addEventListener('click', deleteSelectedObject);
        document.getElementById('fullscreen-btn').addEventListener('click', toggleFullscreen);
        document.getElementById('export-btn').addEventListener('click', exportPDF);
        document.getElementById('zoom-in').addEventListener('click', () => setZoom(state.zoom + 0.12));
        document.getElementById('zoom-out').addEventListener('click', () => setZoom(state.zoom - 0.12));
        document.getElementById('zoom-reset').addEventListener('click', () => setZoom(1, null, true));

        prevPageBtn.addEventListener('click', () => changePage(-1));
        nextPageBtn.addEventListener('click', () => changePage(1));

        addImageInput.addEventListener('change', e => { if (e.target.files[0]) addImageToCanvas(e.target.files[0]); });

        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);
        document.addEventListener('mousemove', onWorkspaceMouseMove);
        document.addEventListener('mouseup', onWorkspaceMouseUp);
        document.addEventListener('mousemove', updateBrushCursor);

        // Touch support
        mainCanvas.addEventListener('touchstart', onCanvasTouchStart, { passive: false });
        mainCanvas.addEventListener('touchmove', onCanvasTouchMove, { passive: false });
        mainCanvas.addEventListener('touchend', onCanvasTouchEnd, { passive: false });
    }

    function onCanvasTouchStart(e) {
        if (e.cancelable) e.preventDefault();
        onCanvasMouseDown(e);
    }

    function onCanvasTouchMove(e) {
        if (e.cancelable) e.preventDefault();
        onCanvasMouseMove(e);
    }

    function onCanvasTouchEnd(e) {
        if (e.cancelable) e.preventDefault();
        onCanvasMouseUp(e);
    }

    function onCanvasWheel(e) {
        if (!state.pdfDoc) return;

        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.12 : 0.12;
            setZoom(state.zoom + delta, e);
        }
    }

    function onWorkspaceWheel(e) {
        if (!state.pdfDoc) return;

        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.12 : 0.12;
            setZoom(state.zoom + delta, e);
        }
    }

    function onWorkspaceMouseDown(e) {
        if (!state.pdfDoc) return;
        if (e.target !== canvasContainer) return;
        if (e.button !== 0) return;

        state.isPanning = true;
        state.panStartX = e.clientX;
        state.panStartY = e.clientY;
        state.panScrollLeft = canvasContainer.scrollLeft;
        state.panScrollTop = canvasContainer.scrollTop;
        updateCanvasCursor();
    }

    function onWorkspaceMouseMove(e) {
        if (!state.isPanning) return;
        canvasContainer.scrollLeft = state.panScrollLeft - (e.clientX - state.panStartX);
        canvasContainer.scrollTop = state.panScrollTop - (e.clientY - state.panStartY);
    }

    function onWorkspaceMouseUp() {
        if (!state.isPanning) return;
        state.isPanning = false;
        updateCanvasCursor();
    }

    async function loadPDF(file) {
        try {
            // FIX: Clone the buffer to ensure it remains valid even if detached later
            const arrayBuffer = await file.arrayBuffer();
            state.pdfFileBytes = arrayBuffer.slice(0);

            // Use a copy for pdf.js just in case
            state.pdfDoc = await pdfjsLib.getDocument(state.pdfFileBytes.slice(0)).promise;
            state.numPages = state.pdfDoc.numPages;
            state.currentPage = 1;

            dropZone.classList.add('hidden');
            editor.classList.remove('hidden');
            state.zoom = 1;

            // Initialize pages data
            state.pagesData = {};
            for (let i = 1; i <= state.numPages; i++) {
                state.pagesData[i] = [];
            }

            await renderPage(state.currentPage);
            centerWorkspace();
            updatePageNav();
            updateZoomLabel();
            updateToolOptions();

        } catch (err) {
            console.error(err);
            alert('Error loading PDF: ' + err.message);
        }
    }

    // History Management
    function saveHistory() {
        // Remove future logic if we are in the middle of history
        if (state.historyIndex < state.history.length - 1) {
            state.history = state.history.slice(0, state.historyIndex + 1);
        }

        // Serialize current objects (excluding background)
        // We can't easily straight JSON stringify because of circular refs or complex objects? 
        // Our objects are simple enough.
        // We need to preserve type info.
        const snapshot = state.objects.map(obj => {
            if (obj.locked) return { type: 'background' }; // Placeholder
            const data = Object.assign({}, obj);
            // Handle image specialized serialization if needed, currently we store reference to Image element which won't serialize
            // For now, let's just shallow copy the properties we need to reconstruct
            // Actually, rebuilding objects might be complex if we don't have a reconstruction method.
            // Simple approach: shallow clone array of references? No, undo needs deep state.
            // For this quick implementation, let's rely on object properties being enough.
            return data;
        });

        state.history.push(snapshot);
        state.historyIndex = state.history.length - 1;
    }

    function undo() {
        if (state.historyIndex > 0) {
            state.historyIndex--;
            restoreHistory(state.history[state.historyIndex]);
        }
    }

    function redo() {
        if (state.historyIndex < state.history.length - 1) {
            state.historyIndex++;
            restoreHistory(state.history[state.historyIndex]);
        }
    }

    function restoreHistory(snapshot) {
        // logic to restore objects from snapshot
        // This is tricky with Image objects essentially holding DOM elements.
        // Simplified: history only tracks ADDING/REMOVING/MOVING, not deep modifications of image content.
        // Since we don't deep clone Image objects, we just re-use them.

        // Actually, let's just use a simple memory array for now without serialization
        // This is a known limitation: "Undo" might not perfectly restore deep properties if we don't clone.
        // But for "Deleted object", it works.

        // Rebuild state.objects
        // We must keep the background (first item) intact
        const bg = state.objects[0];
        state.objects = [bg];

        snapshot.forEach(item => {
            if (item.type === 'background') return;
            // We need to re-instantiate or re-use?
            // If we just use the stored object reference, we can't "undo" property changes (like move).
            // So we need to clone objects when saving history.

            // Fix: For this session, we will implement simple property restoration
            // Re-assigning properties to the original object references if possible?
            // Or just assuming the snapshot contains valid objects.

            // Let's rely on reference equality for images, but copy coords.

            // Only non-background items
            // If we saved raw data objects, we need to convert back to Classes?
            // Since we didn't implement full hydration/serialization, let's skip robust History for this step 
            // and focus on the user's explicit request: "Detached ArrayBuffer" and "Shortcuts" and "Fill".
            // History is nice to have but complex to retrofit in 1 step without a proper serializer.
            // I will stub it or leave it basic.

            // Actually, the user asked for "Anything through shortcuts". Undo is a major one.
            // I will implement a basic stack that saves the *list* of objects.
            // Property changes (move) won't be undoable unless we clone.
            // Let's clone:

            let newObj;
            if (item.type === 'image') {
                newObj = new ImageObject(item.image, item.x, item.y, item.width, item.height);
                newObj.rotation = item.rotation;
            } else if (item.type === 'text') {
                newObj = new TextObject(item.text, item.x, item.y, {
                    font: item.font, size: item.fontSize, color: item.color
                });
                newObj.rotation = item.rotation;
            } else if (item.type === 'shape') {
                newObj = new ShapeObject(item.shapeType, item.x, item.y, item.width, item.height, {
                    strokeColor: item.strokeColor, fillColor: item.fillColor, strokeWidth: item.strokeWidth, filled: item.filled
                });
                newObj.rotation = item.rotation;
            } else if (item.type === 'drawing') {
                newObj = new DrawingObject(item.color, item.size, item.opacity);
                newObj.paths = JSON.parse(JSON.stringify(item.paths)); // Deep clone paths
                newObj.x = item.x; newObj.y = item.y; newObj.width = item.width; newObj.height = item.height;
            }
            if (newObj) state.objects.push(newObj);
        });
        render();
        updateObjectsList();
        centerWorkspace();
    }

    // Improved saveHistory that actually helps
    function pushHistoryState() {
        // Deep clone objects (except images which we ref)
        const snapshot = state.objects.slice(1).map(o => {
            const clone = Object.assign(Object.create(Object.getPrototypeOf(o)), o);
            if (o.paths) clone.paths = JSON.parse(JSON.stringify(o.paths));
            return clone;
        });

        state.history = state.history.slice(0, state.historyIndex + 1);
        state.history.push(snapshot);
        state.historyIndex++;
    }

    async function renderPage(pageNum) {
        if (!state.pdfDoc) return;

        const page = await state.pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: state.baseRenderScale });

        state.canvasWidth = viewport.width;
        state.canvasHeight = viewport.height;
        mainCanvas.width = state.canvasWidth;
        mainCanvas.height = state.canvasHeight;
        updateCanvasDisplaySize();

        // Render PDF page to an offscreen canvas
        const offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = viewport.width;
        offscreenCanvas.height = viewport.height;
        const renderContext = {
            canvasContext: offscreenCanvas.getContext('2d'),
            viewport: viewport
        };

        await page.render(renderContext).promise;

        // Create background object from rendered page
        const bgImg = new Image();
        bgImg.src = offscreenCanvas.toDataURL();

        await new Promise(resolve => { bgImg.onload = resolve; });

        const bgObject = new ImageObject(bgImg, 0, 0, state.canvasWidth, state.canvasHeight);
        bgObject.name = 'PDF Page ' + pageNum;
        bgObject.locked = true;

        const storedObjects = state.pagesData[pageNum] || [];
        state.objects = [bgObject, ...storedObjects];

        state.selectedObject = null;

        // Reset history for new page? Or keep global?
        // Usually per page is easier.
        state.history = [];
        state.historyIndex = -1;
        pushHistoryState(); // Initial state

        render();
        updateObjectsList();
    }

    function saveCurrentPage() {
        if (state.currentPage && state.objects.length > 0) {
            state.pagesData[state.currentPage] = state.objects.slice(1);
        }
    }

    async function changePage(offset) {
        const newPage = state.currentPage + offset;
        if (newPage >= 1 && newPage <= state.numPages) {
            saveCurrentPage();
            state.currentPage = newPage;
            await renderPage(state.currentPage);
            centerWorkspace();
            updatePageNav();
        }
    }

    function updatePageNav() {
        pageIndicator.textContent = `Page ${state.currentPage} of ${state.numPages}`;
        prevPageBtn.disabled = state.currentPage <= 1;
        nextPageBtn.disabled = state.currentPage >= state.numPages;
    }

    function addImageToCanvas(file) {
        const reader = new FileReader();
        reader.onload = e => {
            const img = new Image();
            img.onload = () => {
                const maxSize = Math.min(state.canvasWidth, state.canvasHeight) * 0.5;
                let w = img.width, h = img.height;
                if (w > maxSize || h > maxSize) {
                    const scale = maxSize / Math.max(w, h);
                    w *= scale; h *= scale;
                }
                const imgObj = new ImageObject(img, (state.canvasWidth - w) / 2, (state.canvasHeight - h) / 2, w, h);
                imgObj.imageDataUrl = e.target.result;
                imgObj.name = 'Image';
                state.objects.push(imgObj);
                state.selectedObject = imgObj;
                pushHistoryState();
                render();
                updateObjectsList();

                // Automatically switch to selection tool
                selectTool('select');
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    function selectTool(tool) {
        state.currentTool = tool;
        toolButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.tool === tool));
        updateToolOptions();
        updateCanvasCursor();

        if (tool === 'image') addImageInput.click();
    }

    function updateCanvasCursor() {
        const cursors = { select: 'default', text: 'text', brush: 'none', eraser: 'none', image: 'default', shapes: 'crosshair' };
        if (state.isPanning) {
            mainCanvas.style.cursor = 'grabbing';
        } else if (state.currentTool === 'select' && state.spacePressed) {
            mainCanvas.style.cursor = 'grab';
        } else {
            mainCanvas.style.cursor = cursors[state.currentTool] || 'default';
        }
    }

    function updateBrushCursor(e) {
        if ((state.currentTool === 'brush' || state.currentTool === 'eraser') && !editor.classList.contains('hidden')) {
            brushCursor.style.width = state.brushSize + 'px';
            brushCursor.style.height = state.brushSize + 'px';
            brushCursor.style.left = (e.clientX - state.brushSize / 2) + 'px';
            brushCursor.style.top = (e.clientY - state.brushSize / 2) + 'px';
            brushCursor.style.borderColor = state.currentTool === 'eraser' ? '#ff0000' : state.brushColor;
            brushCursor.classList.add('visible');
        } else {
            brushCursor.classList.remove('visible');
        }
    }

    function getCanvasCoords(e) {
        const rect = mainCanvas.getBoundingClientRect();
        let clientX = e.clientX;
        let clientY = e.clientY;

        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else if (e.changedTouches && e.changedTouches.length > 0) {
            clientX = e.changedTouches[0].clientX;
            clientY = e.changedTouches[0].clientY;
        }

        return {
            x: (clientX - rect.left) * (mainCanvas.width / rect.width),
            y: (clientY - rect.top) * (mainCanvas.height / rect.height)
        };
    }

    function onCanvasMouseDown(e) {
        if (!state.pdfDoc) return;

        // Force exit text edit mode if active
        const textarea = document.getElementById('text-edit-overlay');
        if (textarea && textarea.style.display !== 'none') {
            textarea.blur();
        }

        const { x, y } = getCanvasCoords(e);
        state.startX = x; state.startY = y;
        state.lastX = x; state.lastY = y;
        state.isDrawing = true;

        if (e.button === 1 || e.altKey || state.spacePressed) {
            state.isPanning = true;
            state.panStartX = e.clientX;
            state.panStartY = e.clientY;
            state.panScrollLeft = canvasContainer.scrollLeft;
            state.panScrollTop = canvasContainer.scrollTop;
            updateCanvasCursor();
            return;
        }

        const tool = state.currentTool;

        if (tool === 'select') {
            if (state.selectedObject && !state.selectedObject.locked) {
                const handle = state.selectedObject.getHandle(x, y);
                if (handle) {
                    state.isResizing = true;
                    state.resizeHandle = handle;
                    return;
                }
            }

            let found = null;
            for (let i = state.objects.length - 1; i >= 0; i--) {
                if (state.objects[i].visible && state.objects[i].containsPoint(x, y) && !state.objects[i].locked) {
                    found = state.objects[i];
                    break;
                }
            }
            state.selectedObject = found;
            if (found) {
                state.isDragging = true;
                state.dragOffsetX = x - found.x;
                state.dragOffsetY = y - found.y;
            }
            render();
            updateObjectsList();
            updateToolOptions();
        } else if (tool === 'brush') {
            state.currentDrawing = new DrawingObject(state.brushColor, state.brushSize, state.brushOpacity);
            state.currentDrawing.addPoint(x, y, true);
            state.objects.push(state.currentDrawing);
        } else if (tool === 'text') {
            const textObj = new TextObject(state.textSettings.text, x, y, state.textSettings);
            textObj.x = x - textObj.width / 2;
            textObj.y = y - textObj.height / 2;
            state.objects.push(textObj);
            state.selectedObject = textObj;
            render();
            updateObjectsList();
            updateToolOptions();

            enterTextEditMode(textObj);
            selectTool('select');
        } else if (tool === 'shapes') {
            state.shapeStart = { x, y };
        } else if (tool === 'eraser') {
            let changed = false;
            for (let i = state.objects.length - 1; i >= 0; i--) {
                const obj = state.objects[i];
                if (!obj.locked && obj.containsPoint(x, y)) {
                    state.objects.splice(i, 1);
                    changed = true;
                }
            }
            if (changed) {
                pushHistoryState();
                render();
            }
        }
    }

    function onCanvasMouseMove(e) {
        if (state.isPanning) {
            canvasContainer.scrollLeft = state.panScrollLeft - (e.clientX - state.panStartX);
            canvasContainer.scrollTop = state.panScrollTop - (e.clientY - state.panStartY);
            updateCanvasCursor();
            return;
        }

        if (!state.isDrawing) return;
        const { x, y } = getCanvasCoords(e);
        const tool = state.currentTool;

        if (tool === 'select' && state.selectedObject) {
            if (state.isResizing) {
                resizeObject(state.selectedObject, state.resizeHandle, x, y);
                render();
            } else if (state.isDragging) {
                state.selectedObject.x = x - state.dragOffsetX;
                state.selectedObject.y = y - state.dragOffsetY;
                render();
            }
        } else if (tool === 'brush' && state.currentDrawing) {
            state.currentDrawing.addPoint(x, y, false);
            render();
        } else if (tool === 'shapes' && state.shapeStart) {
            render();
            const start = state.shapeStart;
            const w = x - start.x;
            const h = y - start.y;

            state.ctx.lineWidth = 1;
            state.ctx.setLineDash([5, 5]);
            state.ctx.strokeStyle = state.shapeSettings.strokeColor;

            // Check if fill is enabled for preview
            if (state.shapeSettings.filled) {
                state.ctx.fillStyle = state.shapeSettings.fillColor;
                if (state.shapeSettings.type === 'rect') state.ctx.fillRect(start.x, start.y, w, h);
                else {
                    state.ctx.beginPath();
                    state.ctx.ellipse(start.x + w / 2, start.y + h / 2, Math.abs(w / 2), Math.abs(h / 2), 0, 0, Math.PI * 2);
                    state.ctx.fill();
                }
            }

            if (state.shapeSettings.type === 'rect') state.ctx.strokeRect(start.x, start.y, w, h);
            else {
                state.ctx.beginPath();
                state.ctx.ellipse(start.x + w / 2, start.y + h / 2, Math.abs(w / 2), Math.abs(h / 2), 0, 0, Math.PI * 2);
                state.ctx.stroke();
            }

            state.ctx.setLineDash([]);
        }
        state.lastX = x; state.lastY = y;
    }

    function onCanvasMouseUp(e) {
        const { x, y } = getCanvasCoords(e || { clientX: state.lastX, clientY: state.lastY });
        const tool = state.currentTool;

        if ((tool === 'select') && (state.isDragging || state.isResizing)) {
            pushHistoryState();
        }

        if (tool === 'brush' && state.currentDrawing) {
            state.currentDrawing = null;
            pushHistoryState();
            updateObjectsList();
        }

        if (tool === 'shapes' && state.shapeStart) {
            const w = x - state.shapeStart.x;
            const h = y - state.shapeStart.y;
            if (Math.abs(w) > 5 && Math.abs(h) > 5) {
                const shape = new ShapeObject(
                    state.shapeSettings.type,
                    Math.min(state.shapeStart.x, x),
                    Math.min(state.shapeStart.y, y),
                    Math.abs(w), Math.abs(h),
                    state.shapeSettings
                );
                state.objects.push(shape);
                state.selectedObject = shape;
                pushHistoryState();

                selectTool('select'); // Switch to select
                updateToolOptions();
                updateObjectsList();
            }
            state.shapeStart = null;
            render();
        }

        state.isDrawing = false;
        state.isDragging = false;
        state.isResizing = false;
        state.isPanning = false;
        state.resizeHandle = null;
        updateCanvasCursor();
    }

    function onCanvasDoubleClick(e) {
        const { x, y } = getCanvasCoords(e);
        // Find if we clicked a text object
        // Use top-most check like select
        for (let i = state.objects.length - 1; i >= 0; i--) {
            const obj = state.objects[i];
            if (obj.visible && obj.containsPoint(x, y) && !obj.locked && obj instanceof TextObject) {
                enterTextEditMode(obj);
                break;
            }
        }
    }

    function enterTextEditMode(textObj) {
        // Create a textarea overlay
        let textarea = document.getElementById('text-edit-overlay');
        if (!textarea) {
            textarea = document.createElement('textarea');
            textarea.id = 'text-edit-overlay';
            textarea.style.position = 'absolute';
            textarea.style.background = 'transparent'; // semi-transparent background to see cursor clearly? No, standard text editing.
            // Use outline instead of border to avoid layout shifts (box model)
            textarea.style.border = 'none';
            textarea.style.outline = '1px dashed #6366f1';
            textarea.style.padding = '6px 10px';
            textarea.style.margin = '0';
            textarea.style.overflow = 'hidden';
            textarea.style.resize = 'none';
            textarea.style.zIndex = '100';
            textarea.style.whiteSpace = 'pre';
            textarea.style.overflowWrap = 'normal';
            textarea.style.wordBreak = 'normal';
            textarea.style.boxSizing = 'border-box';
            canvasWrapper.appendChild(textarea);
        }

        const scaleX = mainCanvas.offsetWidth / mainCanvas.width;
        const scaleY = mainCanvas.offsetHeight / mainCanvas.height;
        const centerX = (textObj.x + textObj.width / 2) * scaleX;
        const centerY = (textObj.y + textObj.height / 2) * scaleY;

        textarea.value = textObj.text;
        textarea.style.font = `${textObj.fontSize * scaleY}px ${textObj.font}, sans-serif`;
        textarea.style.color = textObj.color;
        textarea.style.textAlign = textObj.alignment;
        textarea.style.lineHeight = textObj.lineSpacing;

        const syncOverlaySize = () => {
            textarea.style.width = '1px';
            textarea.style.height = '1px';
            textarea.style.left = '0px';
            textarea.style.top = '0px';
            const contentWidth = Math.max(textObj.width * scaleX, textarea.scrollWidth + 2);
            const contentHeight = Math.max(textObj.height * scaleY, textarea.scrollHeight + 2);
            textarea.style.width = contentWidth + 'px';
            textarea.style.height = contentHeight + 'px';
            textarea.style.left = (centerX - contentWidth / 2) + 'px';
            textarea.style.top = (centerY - contentHeight / 2) + 'px';
        };

        syncOverlaySize();

        textarea.style.display = 'block';
        textarea.focus();

        // Temp hide object
        const originalVisible = textObj.visible;
        textObj.visible = false;
        render();

        const finishEdit = () => {
            const originalCenterX = textObj.x + textObj.width / 2;
            const originalCenterY = textObj.y + textObj.height / 2;
            textObj.text = textarea.value;
            textObj.visible = originalVisible;
            textObj.updateSize(); // This recalculates width/height based on new text
            textObj.x = originalCenterX - textObj.width / 2;
            textObj.y = originalCenterY - textObj.height / 2;

            // Check if sidebar exists before accessing
            const sidebarInput = document.getElementById('tool-text-content');
            if (sidebarInput) sidebarInput.value = textObj.text;

            textarea.style.display = 'none';
            render();
            pushHistoryState();

            // Remove listeners
            textarea.onblur = null;
            textarea.onkeydown = null;
        };

        textarea.onblur = finishEdit;
        textarea.oninput = () => {
            syncOverlaySize();
        };
        textarea.onkeydown = (e) => {
            if (e.key === 'Escape') {
                textarea.blur();
            }
            // Stop propagation to avoid deleting object or triggering other shortcuts
            e.stopPropagation();
        };
    }

    function onCanvasMouseLeave() {
        brushCursor.classList.remove('visible');
    }

    function resizeObject(obj, handle, mx, my) {
        const { x, y, width, height } = obj;
        if (handle === 'rotate') {
            const cx = x + width / 2, cy = y + height / 2;
            obj.rotation = Math.atan2(my - cy, mx - cx) * 180 / Math.PI + 90;
            return;
        }

        let newX = x, newY = y, newW = width, newH = height;
        if (handle.includes('w')) { newX = mx; newW = x + width - mx; }
        if (handle.includes('e')) { newW = mx - x; }
        if (handle.includes('n')) { newY = my; newH = y + height - my; }
        if (handle.includes('s')) { newH = my - y; }

        if (newW > 10) { obj.x = newX; obj.width = newW; }
        if (newH > 10) { obj.y = newY; obj.height = newH; }
        if (obj instanceof TextObject) obj.updateSize();
    }

    function render() {
        if (!state.ctx) return;
        state.ctx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
        for (const obj of state.objects) {
            obj.draw(state.ctx);
        }
        if (state.selectedObject && !state.selectedObject.locked) {
            drawSelectionHandles(state.selectedObject);
        }
    }

    function drawSelectionHandles(obj) {
        const ctx = state.ctx;
        ctx.save();
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
        ctx.setLineDash([]);

        for (const [name, hx, hy] of obj.getHandles()) {
            ctx.fillStyle = name === 'rotate' ? '#a855f7' : 'white';
            ctx.strokeStyle = '#6366f1';
            ctx.lineWidth = 2;
            ctx.beginPath();
            if (name === 'rotate') {
                ctx.arc(hx, hy, 5, 0, Math.PI * 2);
            } else {
                ctx.rect(hx - 4, hy - 4, 8, 8);
            }
            ctx.fill();
            ctx.stroke();
        }
        ctx.restore();
    }

    function deleteSelectedObject() {
        if (state.selectedObject && !state.selectedObject.locked) {
            const idx = state.objects.indexOf(state.selectedObject);
            if (idx > -1) {
                state.objects.splice(idx, 1);
                state.selectedObject = null;
                pushHistoryState();
                render();
                updateObjectsList();
                updateToolOptions();
            }
        }
    }

    function onKeyDown(e) {
        // Shortcuts!
        if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;

        if (e.code === 'Space') {
            e.preventDefault();
            state.spacePressed = true;
            updateCanvasCursor();
            return;
        }

        if (e.key === 'Delete' || e.key === 'Backspace') {
            deleteSelectedObject();
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            undo();
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
            e.preventDefault();
            redo();
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
            e.preventDefault();
            exportPDF();
        } else if (e.key.toLowerCase() === 'v') {
            selectTool('select');
        } else if (e.key.toLowerCase() === 'b') {
            selectTool('brush');
        } else if (e.key.toLowerCase() === 't') {
            selectTool('text');
        } else if (e.key.toLowerCase() === 'e') {
            selectTool('eraser');
        } else if (e.key.toLowerCase() === 's') {
            selectTool('shapes');
        } else if (e.key.toLowerCase() === 'i') {
            selectTool('image');
        }

        // Arrow keys move object
        if (state.selectedObject) {
            const step = e.shiftKey ? 10 : 1;
            if (e.key === 'ArrowLeft') state.selectedObject.x -= step;
            else if (e.key === 'ArrowRight') state.selectedObject.x += step;
            else if (e.key === 'ArrowUp') state.selectedObject.y -= step;
            else if (e.key === 'ArrowDown') state.selectedObject.y += step;
            else return;

            render();
            // Don't push history for every key press, ideally debounce. 
            // For now, let's just trigger render.
        }
    }

    function onKeyUp(e) {
        if (e.code === 'Space') {
            state.spacePressed = false;
            updateCanvasCursor();
        }
    }

    function updateObjectsList() {
        objectsList.innerHTML = '';
        state.objects.forEach((obj, index) => {
            if (obj.locked) return;
            const div = document.createElement('div');
            div.className = `layer-item ${state.selectedObject === obj ? 'active' : ''}`;
            div.innerHTML = `
                <span class="layer-name">${obj.name || obj.type}</span>
                <button class="layer-btn" title="Delete">×</button>
            `;
            div.addEventListener('click', (e) => {
                if (e.target.tagName === 'BUTTON') {
                    state.objects.splice(index, 1);
                    if (state.selectedObject === obj) state.selectedObject = null;
                    pushHistoryState();
                    render();
                    updateObjectsList();
                } else {
                    state.selectedObject = obj;
                    if (state.currentTool !== 'select') selectTool('select');
                    render();
                    updateObjectsList();
                    updateToolOptions();
                }
            });
            objectsList.insertBefore(div, objectsList.firstChild);
        });
    }

    function toggleFullscreen() {
        document.getElementById('editor-wrapper').classList.toggle('fullscreen');
    }

    function updateToolOptions() {
        const tool = state.currentTool;
        let html = '';

        if (tool === 'select') {
            if (state.selectedObject) {
                const obj = state.selectedObject;
                html = `<div class="mb-2"><span class="text-xs text-[var(--text-muted)]">Selected:</span> <strong class="text-xs">${obj.name}</strong></div>`;
                if (obj instanceof TextObject) {
                    html += `<div class="mb-2"><div class="slider-label"><span>Color</span></div>
                        <input type="color" class="color-picker-btn" id="obj-color" value="${obj.color}"></div>
                        <div class="mb-2"><div class="slider-label"><span>Font Size</span></div>
                        <input type="number" class="size-input" id="obj-font-size" value="${obj.fontSize}"></div>`;
                    html += `<div class="mb-2"><div class="slider-label"><span>Justification</span></div>
                        <select class="size-input" id="obj-align">
                            <option value="left" ${obj.alignment === 'left' ? 'selected' : ''}>Left</option>
                            <option value="center" ${obj.alignment === 'center' ? 'selected' : ''}>Center</option>
                            <option value="right" ${obj.alignment === 'right' ? 'selected' : ''}>Right</option>
                        </select></div>
                        <div class="mb-2"><div class="slider-label"><span>Line Spacing</span></div>
                        <input type="number" class="size-input" id="obj-line-spacing" step="0.1" min="0.8" max="3" value="${obj.lineSpacing}"></div>`;
                } else if (obj instanceof ShapeObject) {
                    html += `
                        <div class="mb-2"><div class="slider-label"><span>Stroke Color</span></div>
                        <input type="color" class="color-picker-btn" id="obj-stroke" value="${obj.strokeColor}"></div>
                        <div class="mb-2"><div class="slider-label"><span>Fill Color</span></div>
                        <input type="color" class="color-picker-btn" id="obj-fill" value="${obj.fillColor}"></div>
                        <div class="flex items-center gap-2 mt-2">
                            <input type="checkbox" id="obj-filled" ${obj.filled ? 'checked' : ''}>
                            <label for="obj-filled" class="text-xs text-[var(--text-secondary)]">Filled</label>
                        </div>
                      `;
                }
            } else {
                html = '<p class="text-xs text-[var(--text-muted)]">Select an object to edit properties</p>';
            }
        } else if (tool === 'text') {
            html = `
                <div class="mb-3"><div class="slider-label"><span>Text Content</span></div>
                <textarea class="text-input" id="tool-text-content">${state.textSettings.text}</textarea></div>
                <div class="mb-3"><div class="slider-label"><span>Color</span></div>
                <input type="color" class="color-picker-btn" id="tool-text-color" value="${state.textSettings.color}"></div>
                <div class="mb-3"><div class="slider-label"><span>Size</span></div>
                <input type="number" class="size-input" id="tool-text-size" value="${state.textSettings.size}"></div>
                <div class="mb-3"><div class="slider-label"><span>Justification</span></div>
                <select class="size-input" id="tool-text-align">
                    <option value="left" ${state.textSettings.align === 'left' ? 'selected' : ''}>Left</option>
                    <option value="center" ${state.textSettings.align === 'center' ? 'selected' : ''}>Center</option>
                    <option value="right" ${state.textSettings.align === 'right' ? 'selected' : ''}>Right</option>
                </select></div>
                <div class="mb-3"><div class="slider-label"><span>Line Spacing</span></div>
                <input type="number" class="size-input" id="tool-text-line-spacing" step="0.1" min="0.8" max="3" value="${state.textSettings.lineSpacing}"></div>
            `;
        } else if (tool === 'brush') {
            html = `
                <div class="slider-group"><div class="slider-label"><span>Size</span><span id="brush-size-val">${state.brushSize}px</span></div>
                <input type="range" class="slider-input" id="tool-brush-size" min="1" max="50" value="${state.brushSize}"></div>
                <div class="mb-3"><div class="slider-label"><span>Color</span></div>
                <input type="color" class="color-picker-btn" id="tool-brush-color" value="${state.brushColor}"></div>
            `;
        } else if (tool === 'shapes') {
            html = `
                <div class="mb-3"><div class="slider-label"><span>Shape Type</span></div>
                <select id="tool-shape-type" class="size-input">
                    <option value="rect" ${state.shapeSettings.type === 'rect' ? 'selected' : ''}>Rectangle</option>
                    <option value="circle" ${state.shapeSettings.type === 'circle' ? 'selected' : ''}>Circle</option>
                </select></div>
                <div class="mb-3"><div class="slider-label"><span>Stroke Color</span></div>
                <input type="color" class="color-picker-btn" id="tool-shape-stroke" value="${state.shapeSettings.strokeColor}"></div>
                
                <div class="mb-3"><div class="slider-label"><span>Fill Color</span></div>
                <input type="color" class="color-picker-btn" id="tool-shape-fill" value="${state.shapeSettings.fillColor}"></div>
                
                <div class="flex items-center gap-2">
                    <input type="checkbox" id="tool-shape-filled" ${state.shapeSettings.filled ? 'checked' : ''}>
                    <label for="tool-shape-filled" class="text-xs text-[var(--text-secondary)]">Filled</label>
                </div>
            `;
        }

        toolOptionsContent.innerHTML = html;

        // Bind inputs
        if (document.getElementById('tool-text-content')) {
            document.getElementById('tool-text-content').addEventListener('input', e => state.textSettings.text = e.target.value);
            document.getElementById('tool-text-color').addEventListener('input', e => state.textSettings.color = e.target.value);
            document.getElementById('tool-text-size').addEventListener('input', e => state.textSettings.size = parseInt(e.target.value));
            document.getElementById('tool-text-align').addEventListener('change', e => state.textSettings.align = e.target.value);
            document.getElementById('tool-text-line-spacing').addEventListener('input', e => state.textSettings.lineSpacing = parseFloat(e.target.value));
        }
        if (document.getElementById('tool-brush-size')) {
            document.getElementById('tool-brush-size').addEventListener('input', e => {
                state.brushSize = parseInt(e.target.value);
                document.getElementById('brush-size-val').textContent = state.brushSize + 'px';
            });
            document.getElementById('tool-brush-color').addEventListener('input', e => state.brushColor = e.target.value);
        }
        if (document.getElementById('tool-shape-type')) {
            document.getElementById('tool-shape-type').addEventListener('change', e => state.shapeSettings.type = e.target.value);
            document.getElementById('tool-shape-stroke').addEventListener('input', e => state.shapeSettings.strokeColor = e.target.value);
            document.getElementById('tool-shape-fill').addEventListener('input', e => state.shapeSettings.fillColor = e.target.value);
            document.getElementById('tool-shape-filled').addEventListener('change', e => state.shapeSettings.filled = e.target.checked);
        }

        if (state.selectedObject) {
            if (document.getElementById('obj-color')) {
                document.getElementById('obj-color').addEventListener('input', e => {
                    state.selectedObject.color = e.target.value;
                    render();
                });
                document.getElementById('obj-font-size').addEventListener('input', e => {
                    resizeTextObjectKeepingCenter(state.selectedObject, () => {
                        state.selectedObject.fontSize = parseInt(e.target.value);
                    });
                    render();
                });
                if (document.getElementById('obj-align')) {
                    document.getElementById('obj-align').addEventListener('change', e => {
                        resizeTextObjectKeepingCenter(state.selectedObject, () => {
                            state.selectedObject.alignment = e.target.value;
                        });
                        render();
                    });
                    document.getElementById('obj-line-spacing').addEventListener('input', e => {
                        resizeTextObjectKeepingCenter(state.selectedObject, () => {
                            state.selectedObject.lineSpacing = parseFloat(e.target.value);
                        });
                        render();
                    });
                }
            }
            if (document.getElementById('obj-stroke')) {
                document.getElementById('obj-stroke').addEventListener('input', e => {
                    state.selectedObject.strokeColor = e.target.value; render();
                });
                document.getElementById('obj-fill').addEventListener('input', e => {
                    state.selectedObject.fillColor = e.target.value; render();
                });
                document.getElementById('obj-filled').addEventListener('change', e => {
                    state.selectedObject.filled = e.target.checked; render();
                });
            }
        }
    }

    // EXPORT FUNCTION using pdf-lib
    async function exportPDF() {
        if (!state.pdfFileBytes) return;
        saveCurrentPage(); // Ensure current page changes are saved

        const exportBtn = document.getElementById('export-btn');
        const originalText = exportBtn.innerHTML;
        exportBtn.innerHTML = 'Processing...';
        exportBtn.disabled = true;

        try {
            const { PDFDocument, rgb, StandardFonts } = PDFLib;
            // FIX: Load with a COPY of the buffer to prevent detachment issues
            const pdfDoc = await PDFDocument.load(state.pdfFileBytes.slice(0));

            // For each page with modifications
            for (const [pageNumStr, objects] of Object.entries(state.pagesData)) {
                if (!objects || objects.length === 0) continue;

                const pageNum = parseInt(pageNumStr);
                const pageIndex = pageNum - 1;
                const page = pdfDoc.getPage(pageIndex);
                const { width: pageWidth, height: pageHeight } = page.getSize();

                const pdfJsPage = await state.pdfDoc.getPage(pageNum);
                const viewport = pdfJsPage.getViewport({ scale: state.baseRenderScale });

                const ratioX = pageWidth / viewport.width;
                const ratioY = pageHeight / viewport.height;

                const hexToRGB = (hex) => {
                    const r = parseInt(hex.slice(1, 3), 16) / 255;
                    const g = parseInt(hex.slice(3, 5), 16) / 255;
                    const b = parseInt(hex.slice(5, 7), 16) / 255;
                    return rgb(r, g, b);
                };

                for (const obj of objects) {
                    if (!obj.visible || obj.locked) continue;

                    if (obj.type === 'text') {
                        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
                        const fontSize = obj.fontSize * ratioY;
                        const lineSpacing = obj.lineSpacing || 1.2;
                        const lines = obj.text.split('\n');
                        const blockHeight = fontSize * lineSpacing * lines.length;
                        const boxLeft = obj.x * ratioX;
                        const boxTop = obj.y * ratioY;
                        const boxWidth = obj.width * ratioX;
                        const boxHeight = obj.height * ratioY;
                        const startY = boxTop + (boxHeight - blockHeight) / 2;

                        lines.forEach((line, index) => {
                            const lineWidth = font.widthOfTextAtSize(line, fontSize);
                            let lineX = boxLeft;
                            if (obj.alignment === 'center') {
                                lineX = boxLeft + (boxWidth - lineWidth) / 2;
                            } else if (obj.alignment === 'right') {
                                lineX = boxLeft + boxWidth - lineWidth;
                            }

                            const lineTop = startY + index * fontSize * lineSpacing;
                            page.drawText(line, {
                                x: lineX,
                                y: pageHeight - (lineTop + fontSize),
                                size: fontSize,
                                font: font,
                                color: hexToRGB(obj.color)
                            });
                        });
                    }
                    else if (obj.type === 'shape' && obj.shapeType === 'rect') {
                        page.drawRectangle({
                            x: obj.x * ratioX,
                            y: pageHeight - ((obj.y + obj.height) * ratioY),
                            width: obj.width * ratioX,
                            height: obj.height * ratioY,
                            borderColor: hexToRGB(obj.strokeColor),
                            borderWidth: obj.strokeWidth * ratioX,
                            color: obj.filled ? hexToRGB(obj.fillColor) : undefined,
                        });
                    }
                    else if (obj.type === 'shape' && obj.shapeType === 'circle') {
                        // pdf-lib drawCircle takes center x,y.
                        const rx = (obj.width * ratioX) / 2;
                        const ry = (obj.height * ratioY) / 2;

                        // We can't really draw a true ellipse with simple drawCircle if width!=height ratio-wise?
                        // pdf-lib `drawEllipse`.

                        page.drawEllipse({
                            x: (obj.x * ratioX) + rx,
                            y: pageHeight - ((obj.y * ratioY) + ry), // y is center
                            xScale: rx,
                            yScale: ry,
                            borderColor: hexToRGB(obj.strokeColor),
                            borderWidth: obj.strokeWidth * ratioX,
                            color: obj.filled ? hexToRGB(obj.fillColor) : undefined
                        });
                    }
                    else if (obj.type === 'image') {
                        if (obj.imageDataUrl) {
                            const imgBytes = await fetch(obj.imageDataUrl).then(res => res.arrayBuffer());
                            let embeddedImage;
                            if (obj.imageDataUrl.match(/^data:image\/png/)) embeddedImage = await pdfDoc.embedPng(imgBytes);
                            else embeddedImage = await pdfDoc.embedJpg(imgBytes);

                            page.drawImage(embeddedImage, {
                                x: obj.x * ratioX,
                                y: pageHeight - ((obj.y + obj.height) * ratioY),
                                width: obj.width * ratioX,
                                height: obj.height * ratioY
                            });
                        }
                    }
                    else if (obj.type === 'drawing') {
                        for (const path of obj.paths) {
                            if (path.length < 2) continue;
                            for (let i = 0; i < path.length - 1; i++) {
                                const p1 = path[i];
                                const p2 = path[i + 1];
                                page.drawLine({
                                    start: { x: p1.x * ratioX, y: pageHeight - (p1.y * ratioY) },
                                    end: { x: p2.x * ratioX, y: pageHeight - (p2.y * ratioY) },
                                    thickness: obj.size * ratioX,
                                    color: hexToRGB(obj.color),
                                    lineCap: 'Round'
                                });
                            }
                        }
                    }
                }
            }

            const pdfBytes = await pdfDoc.save();
            download(pdfBytes, "edited.pdf", "application/pdf");

        } catch (e) {
            console.error(e);
            alert('Error creating PDF: ' + e.message);
        } finally {
            exportBtn.innerHTML = originalText;
            exportBtn.disabled = false;
        }
    }

    init();

})();
