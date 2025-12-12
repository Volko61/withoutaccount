/**
 * WithoutAccount - Image Editor v4
 * Fixed: History, Zoom, Mouse Release, Layer Selection, Canvas Centering
 */
(function () {
    'use strict';

    const CONFIG = {
        zoomStep: 0.1,
        minZoom: 0.1,
        maxZoom: 5.0,
        handleSize: 8,
        rotateHandleOffset: 25
    };

    class Layer {
        constructor(name) {
            this.id = 'layer_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
            this.name = name;
            this.visible = true;
            this.locked = false;
            this.objects = [];
            this.opacity = 100;
        }
        clone() {
            const l = new Layer(this.name);
            l.id = this.id;
            l.visible = this.visible;
            l.locked = this.locked;
            l.opacity = this.opacity;
            l.objects = this.objects.map(o => o.clone());
            return l;
        }
    }

    class EditorObject {
        constructor(type, x, y, width, height) {
            this.id = 'obj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
            this.type = type;
            this.x = x; this.y = y;
            this.width = width; this.height = height;
            this.rotation = 0;
            this.visible = true;
            this.locked = false;
            this.name = type.charAt(0).toUpperCase() + type.slice(1);
        }
        containsPoint(px, py) {
            const cx = this.x + this.width / 2;
            const cy = this.y + this.height / 2;
            const rad = -this.rotation * Math.PI / 180;
            const dx = px - cx;
            const dy = py - cy;
            const rx = dx * Math.cos(rad) - dy * Math.sin(rad) + cx;
            const ry = dx * Math.sin(rad) + dy * Math.cos(rad) + cy;
            return rx >= this.x && rx <= this.x + this.width && ry >= this.y && ry <= this.y + this.height;
        }
        draw(ctx) { }
        clone() { return Object.assign(Object.create(Object.getPrototypeOf(this)), JSON.parse(JSON.stringify(this))); }
        getHandles() {
            const cx = this.x + this.width / 2;
            const cy = this.y + this.height / 2;
            const hw = this.width / 2, hh = this.height / 2;
            const points = [
                { name: 'nw', x: -hw, y: -hh }, { name: 'n', x: 0, y: -hh }, { name: 'ne', x: hw, y: -hh },
                { name: 'w', x: -hw, y: 0 }, { name: 'e', x: hw, y: 0 },
                { name: 'sw', x: -hw, y: hh }, { name: 's', x: 0, y: hh }, { name: 'se', x: hw, y: hh },
                { name: 'rotate', x: 0, y: -hh - CONFIG.rotateHandleOffset }
            ];
            const rad = this.rotation * Math.PI / 180;
            const cos = Math.cos(rad), sin = Math.sin(rad);
            return points.map(p => ({
                name: p.name,
                x: cx + (p.x * cos - p.y * sin),
                y: cy + (p.x * sin + p.y * cos)
            }));
        }
    }

    class ImageObject extends EditorObject {
        constructor(img, x, y, width, height) {
            super('image', x, y, width, height);
            this.canvas = document.createElement('canvas');
            this.canvas.width = width;
            this.canvas.height = height;
            this.ctx = this.canvas.getContext('2d');
            if (img) this.ctx.drawImage(img, 0, 0, width, height);
            this.originalWidth = width;
            this.originalHeight = height;
        }
        draw(ctx) {
            ctx.save();
            ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
            ctx.rotate(this.rotation * Math.PI / 180);
            try {
                ctx.drawImage(this.canvas, -this.width / 2, -this.height / 2, this.width, this.height);
            } catch (e) { }
            ctx.restore();
        }
        clone() {
            const o = new ImageObject(null, this.x, this.y, this.width, this.height);
            o.id = this.id;
            o.rotation = this.rotation;
            o.visible = this.visible;
            o.locked = this.locked;
            o.name = this.name;
            o.canvas.width = this.canvas.width;
            o.canvas.height = this.canvas.height;
            o.ctx.drawImage(this.canvas, 0, 0);
            return o;
        }
    }

    class TextObject extends EditorObject {
        constructor(text, x, y, style) {
            super('text', x, y, 100, 30);
            this.text = text;
            this.style = { ...style };
            this.measure();
        }
        measure() {
            const ctx = document.createElement('canvas').getContext('2d');
            ctx.font = `${this.style.italic ? 'italic ' : ''}${this.style.bold ? 'bold ' : ''}${this.style.size}px ${this.style.font}`;
            const m = ctx.measureText(this.text);
            this.width = m.width + 10;
            this.height = this.style.size * 1.2;
        }
        draw(ctx) {
            ctx.save();
            ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
            ctx.rotate(this.rotation * Math.PI / 180);
            ctx.font = `${this.style.italic ? 'italic ' : ''}${this.style.bold ? 'bold ' : ''}${this.style.size}px ${this.style.font}`;
            ctx.fillStyle = this.style.color;
            ctx.textBaseline = 'middle';
            ctx.textAlign = 'center';
            ctx.fillText(this.text, 0, 0);
            ctx.restore();
        }
        clone() {
            const o = new TextObject(this.text, this.x, this.y, this.style);
            o.id = this.id;
            o.rotation = this.rotation;
            o.visible = this.visible;
            o.locked = this.locked;
            o.name = this.name;
            return o;
        }
    }

    class ShapeObject extends EditorObject {
        constructor(type, x, y, width, height, style) {
            super('shape', x, y, width, height);
            this.shapeType = type;
            this.style = { ...style };
            this.name = type.charAt(0).toUpperCase() + type.slice(1);
        }
        draw(ctx) {
            ctx.save();
            ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
            ctx.rotate(this.rotation * Math.PI / 180);
            ctx.strokeStyle = this.style.strokeColor;
            ctx.lineWidth = this.style.strokeWidth;
            ctx.fillStyle = this.style.fillColor;
            const w = this.width, h = this.height;
            if (this.shapeType === 'rect') {
                if (this.style.filled) ctx.fillRect(-w / 2, -h / 2, w, h);
                if (this.style.strokeWidth > 0) ctx.strokeRect(-w / 2, -h / 2, w, h);
            } else if (this.shapeType === 'circle') {
                ctx.beginPath();
                ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
                if (this.style.filled) ctx.fill();
                ctx.stroke();
            } else if (this.shapeType === 'arrow') {
                ctx.beginPath();
                ctx.moveTo(-w / 2, 0);
                ctx.lineTo(w / 2 - 10, 0);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(w / 2, 0);
                ctx.lineTo(w / 2 - 15, -10);
                ctx.lineTo(w / 2 - 15, 10);
                ctx.closePath();
                ctx.fillStyle = this.style.strokeColor;
                ctx.fill();
            }
            ctx.restore();
        }
        clone() {
            const o = new ShapeObject(this.shapeType, this.x, this.y, this.width, this.height, this.style);
            o.id = this.id;
            o.rotation = this.rotation;
            o.visible = this.visible;
            o.locked = this.locked;
            o.name = this.name;
            return o;
        }
    }

    class DrawingObject extends EditorObject {
        constructor(x, y, style) {
            super('drawing', x, y, 0, 0);
            this.points = [];
            this.style = { ...style };
            this.minX = Infinity; this.minY = Infinity;
            this.maxX = -Infinity; this.maxY = -Infinity;
        }
        addPoint(x, y) {
            this.points.push({ x, y });
            this.minX = Math.min(this.minX, x - this.style.size);
            this.minY = Math.min(this.minY, y - this.style.size);
            this.maxX = Math.max(this.maxX, x + this.style.size);
            this.maxY = Math.max(this.maxY, y + this.style.size);
            this.x = this.minX;
            this.y = this.minY;
            this.width = this.maxX - this.minX;
            this.height = this.maxY - this.minY;
        }
        draw(ctx) {
            if (this.points.length < 2) return;
            ctx.save();
            ctx.strokeStyle = this.style.color;
            ctx.lineWidth = this.style.size;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.globalAlpha = this.style.opacity / 100;
            ctx.beginPath();
            ctx.moveTo(this.points[0].x, this.points[0].y);
            for (let i = 1; i < this.points.length; i++) ctx.lineTo(this.points[i].x, this.points[i].y);
            ctx.stroke();
            ctx.restore();
        }
        clone() {
            const o = new DrawingObject(this.x, this.y, this.style);
            o.id = this.id;
            o.points = this.points.map(p => ({ ...p }));
            o.minX = this.minX; o.minY = this.minY;
            o.maxX = this.maxX; o.maxY = this.maxY;
            o.width = this.width; o.height = this.height;
            return o;
        }
    }

    const state = {
        tool: 'select',
        layers: [],
        activeLayerId: null,
        selection: null,
        zoom: 1,
        pan: { x: 0, y: 0 },
        isDragging: false,
        isPanning: false,
        isDrawing: false,
        dragStart: { x: 0, y: 0 },
        lastMouse: { x: 0, y: 0 },
        resizeHandle: null,
        currentStroke: null,
        currentShape: null,
        selectedBgColor: '#ffffff',
        settings: {
            brush: { size: 10, opacity: 100, color: '#6366f1' },
            eraser: { size: 20, mode: 'pixel' },
            fill: { color: '#6366f1', tolerance: 30 },
            text: { font: 'Inter', size: 32, color: '#ffffff', bold: false, italic: false },
            fill: { color: '#6366f1', tolerance: 30 },
            text: { font: 'Inter', size: 32, color: '#ffffff', bold: false, italic: false },
            shape: { type: 'rect', strokeColor: '#6366f1', fillColor: 'transparent', strokeWidth: 3, filled: false },
            filter: { type: 'brightness', value: 0 }
        },
        history: [],
        historyPtr: -1
    };

    let canvas, ctx;
    const dom = {};

    function init() {
        canvas = document.getElementById('main-canvas');
        ctx = canvas.getContext('2d');

        const ids = ['drop-zone', 'file-input', 'create-new-btn', 'canvas-container', 'canvas-wrapper',
            'toolbar', 'toolbar-toggle', 'tool-options-content', 'layers-list', 'text-editor-overlay',
            'fullscreen-btn', 'add-image-input', 'brush-cursor', 'zoom-in', 'zoom-out', 'zoom-value',
            'zoom-fit', 'undo-btn', 'redo-btn', 'create-modal', 'canvas-width', 'canvas-height',
            'cancel-create-btn', 'confirm-create-btn', 'custom-bg-color', 'history-list'];
        ids.forEach(id => dom[id] = document.getElementById(id));

        new ResizeObserver(() => { if (canvas.width > 0) fitCanvasToScreen(); }).observe(dom['canvas-container']);
        bindEvents();
        updateToolOptionsPanel();
        updateToolCursor();
    }

    function bindEvents() {
        dom['drop-zone'].onclick = () => dom['file-input'].click();
        dom['file-input'].onchange = e => e.target.files[0] && loadFile(e.target.files[0]);

        // Modal events
        dom['create-new-btn'].onclick = (e) => { e.stopPropagation(); showCreateModal(); };
        dom['cancel-create-btn'].onclick = () => dom['create-modal'].classList.remove('active');
        dom['confirm-create-btn'].onclick = () => createCanvasFromModal();

        // Color option selection
        document.querySelectorAll('.color-option').forEach(opt => {
            opt.onclick = (e) => {
                document.querySelectorAll('.color-option').forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                state.selectedBgColor = opt.dataset.color || opt.value;
            };
        });
        dom['custom-bg-color'].oninput = (e) => {
            document.querySelectorAll('.color-option').forEach(o => o.classList.remove('active'));
            e.target.classList.add('active');
            state.selectedBgColor = e.target.value;
        };

        dom['add-image-input'].onchange = e => e.target.files[0] && addImageAsObject(e.target.files[0]);
        document.querySelectorAll('.tool-btn').forEach(btn => btn.onclick = () => setTool(btn.dataset.tool));
        dom['toolbar-toggle'].onclick = () => {
            dom['toolbar'].classList.toggle('expanded');
            dom['toolbar-toggle'].querySelector('svg').style.transform = dom['toolbar'].classList.contains('expanded') ? 'rotate(180deg)' : '';
        };

        // Canvas events - use document for mouseup/mousemove to catch releases outside canvas
        dom['canvas-container'].addEventListener('mousedown', onMouseDown);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        dom['canvas-container'].addEventListener('touchstart', onTouchStart, { passive: false });
        dom['canvas-container'].addEventListener('touchmove', onTouchMove, { passive: false });
        dom['canvas-container'].addEventListener('touchend', onTouchEnd, { passive: false });
        dom['canvas-container'].addEventListener('wheel', onWheel, { passive: false });

        dom['text-editor-overlay'].addEventListener('input', updateEditingText);
        dom['text-editor-overlay'].addEventListener('blur', finishEditingText);
        dom['text-editor-overlay'].addEventListener('keydown', e => e.stopPropagation());
        document.addEventListener('keydown', onKeyDown);

        dom['zoom-in'].onclick = () => zoomAtCenter(state.zoom + CONFIG.zoomStep);
        dom['zoom-out'].onclick = () => zoomAtCenter(state.zoom - CONFIG.zoomStep);
        dom['zoom-fit'].onclick = fitCanvasToScreen;
        dom['undo-btn'].onclick = undo;
        dom['redo-btn'].onclick = redo;
        document.getElementById('add-layer-btn').onclick = () => addLayer();
        document.getElementById('export-header-btn').onclick = exportImage;
        dom['fullscreen-btn'].onclick = () => document.getElementById('editor-wrapper').classList.toggle('fullscreen');
    }

    function showCreateModal() {
        dom['create-modal'].classList.add('active');
    }

    function createCanvasFromModal() {
        const w = parseInt(dom['canvas-width'].value) || 800;
        const h = parseInt(dom['canvas-height'].value) || 600;
        const bgColor = state.selectedBgColor;
        dom['create-modal'].classList.remove('active');
        createBlankCanvas(w, h, bgColor);
    }

    function createBlankCanvas(w = 800, h = 600, bgColor = '#ffffff') {
        initCanvas(w, h);

        state.layers = [];
        state.activeLayerId = null;

        const bgLayer = new Layer('Layer 1');
        state.layers.push(bgLayer);
        state.activeLayerId = bgLayer.id;

        if (bgColor !== 'transparent') {
            const bgObj = new ShapeObject('rect', 0, 0, w, h, { strokeWidth: 0, strokeColor: 'transparent', filled: true, fillColor: bgColor });
            bgObj.name = 'Background';
            bgObj.locked = true;
            bgLayer.objects.push(bgObj);
        }
        startSession();
        // Delay fit to ensure layout is stable
        setTimeout(fitCanvasToScreen, 50);
    }

    function loadFile(file) {
        const reader = new FileReader();
        reader.onload = e => {
            const img = new Image();
            img.onload = () => {
                initCanvas(img.width, img.height);
                const l = new Layer('Background');
                state.layers = [l];
                state.activeLayerId = l.id;
                l.objects.push(new ImageObject(img, 0, 0, img.width, img.height));
                state.layers[0].objects[0].locked = true;
                startSession();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    function initCanvas(w, h) {
        canvas.width = w; canvas.height = h;
        dom['drop-zone'].style.display = 'none';

        // Ensure wrapper matches canvas size for correct coordinate mapping
        dom['canvas-wrapper'].style.width = w + 'px';
        dom['canvas-wrapper'].style.height = h + 'px';

        // Wait for layout to update before centering
        requestAnimationFrame(() => {
            fitCanvasToScreen();
        });
    }

    function startSession() {
        state.history = [];
        state.historyPtr = -1;
        saveHistory('Initial State');
        render();
        updateLayersPanel();
    }

    function addImageAsObject(file) {
        const reader = new FileReader();
        reader.onload = e => {
            const img = new Image();
            img.onload = () => {
                const obj = new ImageObject(img, 10, 10, img.width, img.height);
                if (obj.width > canvas.width * 0.8) {
                    const r = (canvas.width * 0.8) / obj.width;
                    obj.width *= r; obj.height *= r;
                    obj.canvas.width = obj.width; obj.canvas.height = obj.height;
                    obj.ctx.drawImage(img, 0, 0, obj.width, obj.height);
                }
                addToActiveLayer(obj);
                state.selection = obj;
                setTool('select');
                render();
                updateLayersPanel();
                saveHistory('Add Image');
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    function addToActiveLayer(obj) {
        // Ensure valid active layer
        if (!state.activeLayerId || !state.layers.find(l => l.id === state.activeLayerId)) {
            if (state.layers.length === 0) addLayer();
            state.activeLayerId = state.layers[0].id;
        }
        const layer = state.layers.find(l => l.id === state.activeLayerId);
        if (layer) {
            layer.objects.push(obj);
            // Auto-select
            // state.selection = obj; // Let caller decide selection
        }
    }

    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (const layer of state.layers) {
            if (!layer.visible) continue;
            ctx.globalAlpha = layer.opacity / 100;
            for (const obj of layer.objects) {
                if (!obj.visible) continue;
                obj.draw(ctx);
            }
        }
        ctx.globalAlpha = 1;
        if (state.selection && (state.tool === 'select' || state.tool === 'transform')) {
            const o = state.selection;
            const handles = o.getHandles();
            ctx.save();
            ctx.translate(o.x + o.width / 2, o.y + o.height / 2);
            ctx.rotate(o.rotation * Math.PI / 180);
            ctx.strokeStyle = '#6366f1';
            ctx.lineWidth = 1 / state.zoom;
            ctx.setLineDash([4, 4]);
            ctx.strokeRect(-o.width / 2, -o.height / 2, o.width, o.height);
            ctx.restore();
            ctx.setLineDash([]);
            ctx.fillStyle = 'white'; ctx.strokeStyle = '#6366f1'; ctx.lineWidth = 1;
            handles.forEach(h => { ctx.beginPath(); ctx.arc(h.x, h.y, CONFIG.handleSize / state.zoom / 1.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); });
        }
        drawTransient();
    }

    function drawTransient() {
        if (state.isDrawing && state.tool === 'crop' && state.dragStart) {
            const mp = state.lastMouse;
            const x = Math.min(state.dragStart.x, mp.x), y = Math.min(state.dragStart.y, mp.y);
            const w = Math.abs(state.dragStart.x - mp.x), h = Math.abs(state.dragStart.y - mp.y);
            ctx.save(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.strokeRect(x, y, w, h); ctx.restore();
        }
    }

    function getPointerPos(e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        let cx, cy;
        if (e.touches && e.touches.length > 0) {
            cx = e.touches[0].clientX;
            cy = e.touches[0].clientY;
        } else {
            cx = e.clientX;
            cy = e.clientY;
        }
        return { x: (cx - rect.left) * scaleX, y: (cy - rect.top) * scaleY };
    }

    // Touch event wrappers
    function onTouchStart(e) { e.preventDefault(); onMouseDown(e); }
    function onTouchMove(e) { e.preventDefault(); onMouseMove(e); }
    function onTouchEnd(e) { e.preventDefault(); onMouseUp(e); }

    function onMouseDown(e) {
        if (e.button === 1 || (e.shiftKey && state.tool !== 'select')) {
            state.isPanning = true;
            state.panStart = { x: e.clientX, y: e.clientY };
            dom['canvas-container'].classList.add('panning');
            return;
        }
        const pos = getPointerPos(e);
        state.dragStart = pos;
        state.lastMouse = pos;

        if (state.tool === 'select' || state.tool === 'transform') {
            if (state.selection) {
                const h = state.selection.getHandles().find(h => dist(h, pos) < (CONFIG.handleSize / state.zoom) * 2);
                if (h) { state.resizeHandle = h.name; return; }
            }
            let hit = null;
            for (let i = state.layers.length - 1; i >= 0; i--) {
                const l = state.layers[i];
                if (!l.visible || l.locked) continue;
                for (let j = l.objects.length - 1; j >= 0; j--) {
                    if (!l.objects[j].locked && l.objects[j].containsPoint(pos.x, pos.y)) {
                        hit = l.objects[j];
                        state.activeLayerId = l.id;
                        break;
                    }
                }
                if (hit) break;
            }
            state.selection = hit;
            if (hit) { state.isDragging = true; state.objDragStart = { x: hit.x, y: hit.y }; }
            render(); updateLayersPanel(); updateToolOptionsPanel();
        } else if (state.tool === 'brush') {
            state.isDrawing = true;
            const s = new DrawingObject(pos.x, pos.y, state.settings.brush);
            addToActiveLayer(s);
            s.addPoint(pos.x, pos.y);
            state.currentStroke = s;
            render();
        } else if (state.tool === 'shapes') {
            state.isDrawing = true;
            const s = new ShapeObject(state.settings.shape.type, pos.x, pos.y, 1, 1, state.settings.shape);
            addToActiveLayer(s);
            state.selection = s;
            state.currentShape = s;
        } else if (state.tool === 'text') {
            const t = new TextObject('Sample Text', pos.x, pos.y, state.settings.text);
            addToActiveLayer(t);
            state.selection = t;
            startTextEditing(t);
            render();
            updateLayersPanel();
            setTool('select');
        } else if (state.tool === 'fill') {
            doFloodFill(pos.x, pos.y, state.settings.fill.color);
            saveHistory('Flood Fill');
        } else if (state.tool === 'eraser') {
            state.isDrawing = true;
            handleEraser(pos);
        } else if (state.tool === 'crop') {
            state.isDrawing = true;
        } else if (state.tool === 'image') {
            dom['add-image-input'].click();
        }
    }

    function onMouseMove(e) {
        if (state.isPanning) {
            setPan(state.pan.x + e.clientX - state.panStart.x, state.pan.y + e.clientY - state.panStart.y);
            state.panStart = { x: e.clientX, y: e.clientY };
            return;
        }

        const pos = getPointerPos(e);
        state.lastMouse = pos;
        updateBrushCursor(e);

        if (state.resizeHandle && state.selection) {
            handleResize(pos, e.shiftKey);
            render();
            return;
        }
        if (state.isDragging && state.selection) {
            state.selection.x = state.objDragStart.x + pos.x - state.dragStart.x;
            state.selection.y = state.objDragStart.y + pos.y - state.dragStart.y;
            render();
            return;
        }
        if (state.isDrawing) {
            if (state.tool === 'brush' && state.currentStroke) {
                state.currentStroke.addPoint(pos.x, pos.y);
                render();
            } else if (state.tool === 'shapes' && state.currentShape) {
                state.currentShape.width = Math.abs(pos.x - state.dragStart.x);
                state.currentShape.height = Math.abs(pos.y - state.dragStart.y);
                state.currentShape.x = Math.min(state.dragStart.x, pos.x);
                state.currentShape.y = Math.min(state.dragStart.y, pos.y);
                if (e.shiftKey) {
                    const s = Math.max(state.currentShape.width, state.currentShape.height);
                    state.currentShape.width = s;
                    state.currentShape.height = s;
                }
                render();
            } else if (state.tool === 'eraser') {
                handleEraser(pos);
            } else if (state.tool === 'crop') {
                render();
            }
        }
    }

    function onMouseUp(e) {
        // Always stop panning
        if (state.isPanning) {
            state.isPanning = false;
            dom['canvas-container'].classList.remove('panning');
        }

        // Stop drawing
        if (state.isDrawing) {
            if (state.tool === 'brush' && state.currentStroke) {
                state.currentStroke = null;
                saveHistory('Brush Stroke');
            }
            if (state.tool === 'shapes' && state.currentShape) {
                state.currentShape = null;
                saveHistory('Add Shape');
            }
            if (state.tool === 'eraser') saveHistory('Erase');
            if (state.tool === 'crop') {
                const mp = state.lastMouse;
                const w = Math.abs(state.dragStart.x - mp.x), h = Math.abs(state.dragStart.y - mp.y);
                if (w > 10 && h > 10) applyCrop(Math.min(state.dragStart.x, mp.x), Math.min(state.dragStart.y, mp.y), w, h);
                setTool('select');
                render();
            }
            state.isDrawing = false;
        }

        // Stop dragging/resizing
        if (state.isDragging || state.resizeHandle) {
            saveHistory('Transform');
        }

        state.isDragging = false;
        state.resizeHandle = null;
        updateLayersPanel();
    }

    function handleResize(pos, shiftKey) {
        const o = state.selection, h = state.resizeHandle;
        if (h === 'rotate') {
            o.rotation = (Math.atan2(pos.y - (o.y + o.height / 2), pos.x - (o.x + o.width / 2)) + Math.PI / 2) * 180 / Math.PI;
            return;
        }
        let nx = o.x, ny = o.y, nw = o.width, nh = o.height;
        if (h.includes('e')) nw = Math.max(1, pos.x - nx);
        if (h.includes('s')) nh = Math.max(1, pos.y - ny);
        if (h.includes('w')) { const d = nx - pos.x; nx = pos.x; nw += d; }
        if (h.includes('n')) { const d = ny - pos.y; ny = pos.y; nh += d; }
        if (shiftKey) { const r = o.width / o.height; if (nw / nh > r) nw = nh * r; else nh = nw / r; }
        o.x = nx; o.y = ny; o.width = Math.abs(nw); o.height = Math.abs(nh);
    }

    function handleEraser(pos) {
        if (state.settings.eraser.mode === 'object') {
            for (const l of state.layers) {
                if (!l.visible || l.locked) continue;
                const idx = l.objects.findIndex(o => !o.locked && o.containsPoint(pos.x, pos.y));
                if (idx > -1) { l.objects.splice(idx, 1); render(); updateLayersPanel(); return; }
            }
        } else {
            const l = state.layers.find(x => x.id === state.activeLayerId);
            if (!l) return;
            l.objects.forEach(o => {
                if (o.type === 'image' && o.containsPoint(pos.x, pos.y)) {
                    const octx = o.ctx;
                    octx.save();
                    octx.globalCompositeOperation = 'destination-out';
                    const cx = o.x + o.width / 2, cy = o.y + o.height / 2;
                    const rad = -o.rotation * Math.PI / 180;
                    const dx = pos.x - cx, dy = pos.y - cy;
                    const rx = dx * Math.cos(rad) - dy * Math.sin(rad) + o.width / 2;
                    const ry = dx * Math.sin(rad) + dy * Math.cos(rad) + o.height / 2;
                    octx.beginPath();
                    octx.arc(rx, ry, state.settings.eraser.size, 0, Math.PI * 2);
                    octx.fill();
                    octx.restore();
                    render();
                }
            });
        }
    }

    function doFloodFill(x, y, colorHex) {
        let target = null;
        for (const l of state.layers) {
            if (!l.visible) continue;
            for (const o of l.objects) { if (o.type === 'image' && o.containsPoint(x, y)) { target = o; break; } }
            if (target) break;
        }
        if (target) {
            const octx = target.ctx;
            octx.fillStyle = colorHex;
            octx.fillRect(0, 0, target.width, target.height);
            render();
        }
    }

    function applyCrop(cx, cy, cw, ch) {
        state.layers.forEach(l => l.objects.forEach(o => { o.x -= cx; o.y -= cy; }));
        canvas.width = cw; canvas.height = ch;
        fitCanvasToScreen();
        saveHistory('Crop');
        render();
    }

    function startTextEditing(textObj) {
        const input = dom['text-editor-overlay'];
        input.style.display = 'block';
        input.style.font = `${textObj.style.italic ? 'italic ' : ''}${textObj.style.bold ? 'bold ' : ''}${Math.max(12, textObj.style.size * state.zoom)}px ${textObj.style.font}`;
        input.style.color = textObj.style.color;
        input.value = textObj.text;
        const rect = canvas.getBoundingClientRect();
        input.style.left = (rect.left + rect.width / 2) + 'px';
        input.style.top = (rect.top + rect.height / 2) + 'px';
        input.dataset.targetId = textObj.id;
        input.focus();
    }

    function updateEditingText(e) {
        const id = e.target.dataset.targetId;
        state.layers.forEach(l => l.objects.forEach(o => { if (o.id === id) { o.text = e.target.value; o.measure(); } }));
        render();
    }

    function finishEditingText() {
        dom['text-editor-overlay'].style.display = 'none';
        saveHistory('Edit Text');
    }

    function updateBrushCursor(e) {
        if (state.tool === 'brush' || state.tool === 'eraser') {
            const c = dom['brush-cursor'];
            const s = (state.tool === 'brush' ? state.settings.brush.size : state.settings.eraser.size) * state.zoom;
            c.style.width = s + 'px';
            c.style.height = s + 'px';
            c.style.left = (e.clientX - s / 2) + 'px';
            c.style.top = (e.clientY - s / 2) + 'px';
            c.classList.add('visible');
        } else {
            dom['brush-cursor'].classList.remove('visible');
        }
    }

    function updateToolCursor() {
        const container = dom['canvas-container'];
        container.className = container.className.replace(/tool-\w+/g, '').trim();
        container.classList.add('canvas-container', 'tool-' + state.tool);
    }

    function updateToolOptionsPanel() {
        const c = dom['tool-options-content'], t = state.tool;
        if (t === 'select') {
            c.innerHTML = state.selection
                ? `<div class="text-xs text-[var(--text-secondary)] mb-2">Selected: ${state.selection.name}</div><button class="action-btn w-full" onclick="deleteSelection()">Delete</button>`
                : '<span class="text-[var(--text-muted)] text-sm">No selection</span>';
        } else if (t === 'brush') {
            c.innerHTML = `<div class="slider-group"><span class="slider-label">Size: ${state.settings.brush.size}</span><input class="slider-input" type="range" min="1" max="100" value="${state.settings.brush.size}" oninput="setBrush('size',this.value)"></div><input type="color" class="color-picker-btn w-full" value="${state.settings.brush.color}" oninput="setBrush('color',this.value)">`;
        } else if (t === 'eraser') {
            c.innerHTML = `<div class="slider-group"><span class="slider-label">Size: ${state.settings.eraser.size}</span><input class="slider-input" type="range" min="1" max="100" value="${state.settings.eraser.size}" oninput="setEraser('size',this.value)"></div><div class="flex gap-2 mt-2"><button onclick="setEraser('mode','pixel')" class="action-btn flex-1 ${state.settings.eraser.mode === 'pixel' ? 'active' : ''}">Pixel</button><button onclick="setEraser('mode','object')" class="action-btn flex-1 ${state.settings.eraser.mode === 'object' ? 'active' : ''}">Object</button></div>`;
        } else if (t === 'fill') {
            c.innerHTML = `<input type="color" class="color-picker-btn w-full" value="${state.settings.fill.color}" oninput="window.state.settings.fill.color=this.value">`;
        } else if (t === 'shapes') {
            c.innerHTML = `<div class="flex gap-2 mb-2"><button onclick="setShape('type','rect')" class="action-btn flex-1 ${state.settings.shape.type === 'rect' ? 'active' : ''}">□</button><button onclick="setShape('type','circle')" class="action-btn flex-1 ${state.settings.shape.type === 'circle' ? 'active' : ''}">○</button></div><input type="color" class="color-picker-btn w-full mb-2" value="${state.settings.shape.strokeColor}" oninput="setShape('strokeColor',this.value)">`;
        } else if (t === 'filters') {
            c.innerHTML = `
                <div class="flex gap-2 mb-3">
                    <button onclick="applyFilter('brightness')" class="action-btn flex-1">Brightness</button>
                    <button onclick="applyFilter('grayscale')" class="action-btn flex-1">Grayscale</button>
                </div>
                <div class="flex gap-2 mb-3">
                    <button onclick="applyFilter('blur')" class="action-btn flex-1">Blur</button>
                    <button onclick="applyFilter('invert')" class="action-btn flex-1">Invert</button>
                </div>
                <div class="flex gap-2">
                    <button onclick="applyFilter('sepia')" class="action-btn flex-1">Sepia</button>
                    <button onclick="applyFilter('contrast')" class="action-btn flex-1">Contrast</button>
                </div>
             `;
        } else {
            c.innerHTML = '<span class="text-[var(--text-muted)] text-sm">No options</span>';
        }
    }

    window.applyFilter = function (type) {
        if (!state.activeLayerId) return;
        const layer = state.layers.find(l => l.id === state.activeLayerId);
        if (!layer) return;

        // Apply to all image objects in active layer or selection
        const targets = state.selection ? [state.selection] : layer.objects;
        let modified = false;

        targets.forEach(o => {
            if (o.type === 'image') {
                const ctx = o.ctx;
                const idata = ctx.getImageData(0, 0, o.canvas.width, o.canvas.height);
                const data = idata.data;

                for (let i = 0; i < data.length; i += 4) {
                    if (type === 'grayscale') {
                        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                        data[i] = avg; data[i + 1] = avg; data[i + 2] = avg;
                    } else if (type === 'invert') {
                        data[i] = 255 - data[i];
                        data[i + 1] = 255 - data[i + 1];
                        data[i + 2] = 255 - data[i + 2];
                    } else if (type === 'brightness') {
                        data[i] += 40; data[i + 1] += 40; data[i + 2] += 40;
                    } else if (type === 'sepia') {
                        const r = data[i], g = data[i + 1], b = data[i + 2];
                        data[i] = r * 0.393 + g * 0.769 + b * 0.189;
                        data[i + 1] = r * 0.349 + g * 0.686 + b * 0.168;
                        data[i + 2] = r * 0.272 + g * 0.534 + b * 0.131;
                    } else if (type === 'contrast') {
                        const factor = (259 * (128 + 255)) / (255 * (259 - 128));
                        data[i] = factor * (data[i] - 128) + 128;
                        data[i + 1] = factor * (data[i + 1] - 128) + 128;
                        data[i + 2] = factor * (data[i + 2] - 128) + 128;
                    }
                }

                // Blur is special (simple box blur)
                if (type === 'blur') {
                    ctx.filter = 'blur(5px)';
                    ctx.drawImage(o.canvas, 0, 0);
                    ctx.filter = 'none';
                } else {
                    ctx.putImageData(idata, 0, 0);
                }
                modified = true;
            }
        });

        if (modified) {
            render();
            saveHistory('Apply Filter: ' + type);
        }
    };

    // History system with proper cloning
    function saveHistory(action) {
        // Remove any redo states
        if (state.historyPtr < state.history.length - 1) {
            state.history.splice(state.historyPtr + 1);
        }
        // Deep clone layers
        const snapshot = {
            action,
            layers: state.layers.map(l => l.clone()),
            activeLayerId: state.activeLayerId
        };
        state.history.push(snapshot);
        state.historyPtr = state.history.length - 1;
        updateHistoryPanel();
    }

    function restoreHistory() {
        const snapshot = state.history[state.historyPtr];
        if (!snapshot) return;

        state.layers = snapshot.layers.map(l => l.clone());
        state.activeLayerId = snapshot.activeLayerId;
        state.selection = null;
        render();
        updateLayersPanel();
        updateHistoryPanel();
    }

    function undo() {
        if (state.historyPtr > 0) {
            state.historyPtr--;
            restoreHistory();
        }
    }

    function redo() {
        if (state.historyPtr < state.history.length - 1) {
            state.historyPtr++;
            restoreHistory();
        }
    }

    function updateHistoryPanel() {
        if (!dom['history-list']) return;
        dom['history-list'].innerHTML = state.history.map((h, i) =>
            `<div class="text-xs py-1 px-2 rounded ${i === state.historyPtr ? 'bg-[var(--accent-primary)] text-white' : 'text-[var(--text-secondary)]'}">${h.action}</div>`
        ).join('');
    }

    function updateLayersPanel() {
        if (!dom['layers-list']) return;
        // Display layers from Top to Bottom (so reverse the array which is Bottom to Top)
        dom['layers-list'].innerHTML = state.layers.slice().reverse().map(l => {
            const isActive = l.id === state.activeLayerId;
            const objectList = l.objects.slice().reverse().map(o => {
                const isSelected = state.selection && state.selection.id === o.id;
                return `
                    <div class="object-item ${isSelected ? 'selected' : ''}" onclick="event.stopPropagation(); selectObject('${l.id}','${o.id}')">
                        <span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${o.name}</span>
                        <div style="display:flex; gap:4px;">
                            <button class="${o.visible ? 'text-gray-500 hover:text-white' : 'text-gray-700'}" onclick="event.stopPropagation(); toggleObjectVisibility('${l.id}', '${o.id}')" title="Toggle Visibility">${o.visible ? '👁️' : '─'}</button>
                            <button class="${o.locked ? 'text-red-400 hover:text-white' : 'text-gray-700'}" onclick="event.stopPropagation(); toggleObjectLock('${l.id}', '${o.id}')" title="Toggle Lock">${o.locked ? '🔒' : '🔓'}</button>
                        </div>
                    </div>
                `;
            }).join('');

            return `
            <div class="layer-group ${isActive ? 'active-layer' : ''}" style="${isActive ? 'border-color:var(--accent-primary); border-width:1px;' : ''}">
                <div class="layer-header ${isActive ? 'active' : ''}" onclick="selectLayer('${l.id}')">
                    <button style="margin-right:8px;" class="${l.visible ? 'text-[var(--accent-primary)]' : 'text-gray-500'}" onclick="event.stopPropagation(); toggleLayerVisibility('${l.id}')">${l.visible ? '👁️' : '─'}</button>
                    <span class="flex-1 truncate" title="${l.name}">${l.name}</span>
                    <button style="margin-left:8px;" class="${l.locked ? 'text-red-400' : 'text-gray-600'}" onclick="event.stopPropagation(); toggleLayerLock('${l.id}')">${l.locked ? '🔒' : '🔓'}</button>
                    ${state.layers.length > 1 ? `<button style="margin-left:8px;" class="text-red-500 hover:text-red-300" onclick="event.stopPropagation(); deleteLayer('${l.id}')">×</button>` : ''}
                </div>
                <div class="layer-items" style="display:${l.visible ? 'block' : 'none'}">
                    ${objectList}
                </div>
            </div>
            `;
        }).join('');
    }

    function onKeyDown(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        if (e.key === 'Delete' && state.selection) { deleteSelection(); }
        if (e.ctrlKey && e.key === 'z') { e.preventDefault(); undo(); }
        if (e.ctrlKey && e.key === 'y') { e.preventDefault(); redo(); }
        if (e.key === 'v') setTool('select');
        if (e.key === 'b') setTool('brush');
        if (e.key === 'e') setTool('eraser');
    }

    function onWheel(e) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -CONFIG.zoomStep : CONFIG.zoomStep;
        zoomAtPoint(state.zoom + delta, e.clientX, e.clientY);
    }

    // Zoom functions
    function zoomAtPoint(newZoom, clientX, clientY) {
        newZoom = Math.max(CONFIG.minZoom, Math.min(CONFIG.maxZoom, newZoom));
        const rect = dom['canvas-container'].getBoundingClientRect();
        const mouseX = clientX - rect.left;
        const mouseY = clientY - rect.top;

        // Calculate the point on the canvas under the mouse before zoom
        const beforeX = (mouseX - state.pan.x) / state.zoom;
        const beforeY = (mouseY - state.pan.y) / state.zoom;

        state.zoom = newZoom;

        // Calculate new pan to keep the same point under the mouse
        state.pan.x = mouseX - beforeX * state.zoom;
        state.pan.y = mouseY - beforeY * state.zoom;

        applyTransform();
    }

    function zoomAtCenter(newZoom) {
        const rect = dom['canvas-container'].getBoundingClientRect();
        zoomAtPoint(newZoom, rect.left + rect.width / 2, rect.top + rect.height / 2);
    }

    function applyTransform() {
        dom['canvas-wrapper'].style.transform = `translate(${state.pan.x}px, ${state.pan.y}px) scale(${state.zoom})`;
        dom['zoom-value'].innerText = Math.round(state.zoom * 100) + '%';
    }

    function setPan(x, y) {
        state.pan = { x, y };
        applyTransform();
    }

    function fitCanvasToScreen() {
        const container = dom['canvas-container'];
        const rect = container.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0 || canvas.width === 0) return;

        const padding = 40;
        const availableWidth = rect.width - padding;
        const availableHeight = rect.height - padding;

        const scaleX = availableWidth / canvas.width;
        const scaleY = availableHeight / canvas.height;

        state.zoom = Math.min(1, scaleX, scaleY);
        if (state.zoom < 0.1) state.zoom = 0.1;

        const scaledWidth = canvas.width * state.zoom;
        const scaledHeight = canvas.height * state.zoom;

        state.pan = {
            x: (rect.width - scaledWidth) / 2,
            y: (rect.height - scaledHeight) / 2
        };
        applyTransform();
    }

    function exportImage() {
        const link = document.createElement('a');
        link.download = 'image.png';
        link.href = canvas.toDataURL();
        link.click();
    }

    function dist(p1, p2) { return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2); }

    // Global functions
    window.setTool = function (tool) {
        state.tool = tool;
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.toggle('active', b.dataset.tool === tool));
        updateToolOptionsPanel();
        updateToolCursor();
        if (tool === 'image') dom['add-image-input'].click();
    };
    window.addLayer = function () {
        const l = new Layer('Layer ' + (state.layers.length + 1));
        state.layers.push(l); // Add to top
        state.activeLayerId = l.id;
        updateLayersPanel();
        saveHistory('Add Layer');
    };

    // New Helper Functions
    window.toggleLayerVisibility = function (id) {
        const l = state.layers.find(x => x.id === id);
        if (l) { l.visible = !l.visible; render(); updateLayersPanel(); }
    };

    window.toggleLayerLock = function (id) {
        const l = state.layers.find(x => x.id === id);
        if (l) { l.locked = !l.locked; updateLayersPanel(); }
    };

    window.deleteLayer = function (id) {
        if (state.layers.length <= 1) return;
        state.layers = state.layers.filter(l => l.id !== id);
        if (state.activeLayerId === id) state.activeLayerId = state.layers[state.layers.length - 1].id;
        render();
        updateLayersPanel();
        saveHistory('Delete Layer');
    };

    window.toggleObjectVisibility = function (lid, oid) {
        const l = state.layers.find(x => x.id === lid);
        if (l) {
            const o = l.objects.find(x => x.id === oid);
            if (o) { o.visible = !o.visible; render(); updateLayersPanel(); }
        }
    };

    window.toggleObjectLock = function (lid, oid) {
        const l = state.layers.find(x => x.id === lid);
        if (l) {
            const o = l.objects.find(x => x.id === oid);
            if (o) { o.locked = !o.locked; updateLayersPanel(); }
        }
    };

    window.init = init; // Expose init if needed

    window.selectLayer = function (id) {
        state.activeLayerId = id;
        updateLayersPanel();
    };
    window.selectObject = function (lid, oid) {
        state.activeLayerId = lid;
        const layer = state.layers.find(l => l.id === lid);
        if (layer) {
            state.selection = layer.objects.find(o => o.id === oid);
            setTool('select');
            render();
            updateLayersPanel();
            updateToolOptionsPanel();
        }
    };
    window.deleteSelection = function () {
        if (state.selection) {
            state.layers.forEach(l => l.objects = l.objects.filter(o => o !== state.selection));
            state.selection = null;
            render();
            updateLayersPanel();
            saveHistory('Delete');
        }
    };
    window.setBrush = (k, v) => { state.settings.brush[k] = +v || v; updateToolOptionsPanel(); };
    window.setEraser = (k, v) => { state.settings.eraser[k] = +v || v; updateToolOptionsPanel(); };
    window.setShape = (k, v) => { state.settings.shape[k] = v; updateToolOptionsPanel(); };
    window.undo = undo;
    window.redo = redo;
    window.state = state;

    init();
})();
