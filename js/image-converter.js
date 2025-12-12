/**
 * Image Converter - WithoutAccount
 * Client-side image format conversion using Canvas API
 */

(function () {
    'use strict';

    // State
    let files = [];
    let convertedFiles = [];
    let selectedFormat = 'png';
    let quality = 0.9;

    // DOM Elements
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const optionsPanel = document.getElementById('options-panel');
    const previewSection = document.getElementById('preview-section');
    const previewContainer = document.getElementById('preview-container');
    const downloadSection = document.getElementById('download-section');
    const qualitySlider = document.getElementById('quality-slider');
    const qualityValue = document.getElementById('quality-value');
    const qualitySection = document.getElementById('quality-section');
    const convertBtn = document.getElementById('convert-btn');
    const clearBtn = document.getElementById('clear-btn');
    const downloadAllBtn = document.getElementById('download-all-btn');
    const formatButtons = document.querySelectorAll('[data-format]');

    /**
     * Initialize event listeners
     */
    function init() {
        // Drop zone events
        dropZone.addEventListener('click', () => fileInput.click());
        dropZone.addEventListener('dragover', handleDragOver);
        dropZone.addEventListener('dragleave', handleDragLeave);
        dropZone.addEventListener('drop', handleDrop);

        // File input
        fileInput.addEventListener('change', handleFileSelect);

        // Format buttons
        formatButtons.forEach(btn => {
            btn.addEventListener('click', () => selectFormat(btn.dataset.format));
        });

        // Quality slider
        qualitySlider.addEventListener('input', handleQualityChange);

        // Action buttons
        convertBtn.addEventListener('click', convertImages);
        clearBtn.addEventListener('click', clearAll);
        downloadAllBtn.addEventListener('click', downloadAll);

        // Initial format setup
        updateQualityVisibility();
    }

    /**
     * Handle drag over
     */
    function handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add('dragover');
    }

    /**
     * Handle drag leave
     */
    function handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('dragover');
    }

    /**
     * Handle drop
     */
    function handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('dragover');

        const droppedFiles = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
        if (droppedFiles.length > 0) {
            addFiles(droppedFiles);
        }
    }

    /**
     * Handle file input selection
     */
    function handleFileSelect(e) {
        const selectedFiles = Array.from(e.target.files);
        if (selectedFiles.length > 0) {
            addFiles(selectedFiles);
        }
    }

    /**
     * Add files to the list
     */
    function addFiles(newFiles) {
        files = [...files, ...newFiles];
        convertedFiles = []; // Reset converted files

        if (window.umami) {
            window.umami.track('Image Converter: Add Files', { count: newFiles.length });
        }

        updateUI();
        renderPreviews();
    }

    /**
     * Update UI visibility
     */
    function updateUI() {
        const hasFiles = files.length > 0;
        optionsPanel.classList.toggle('hidden', !hasFiles);
        previewSection.classList.toggle('hidden', !hasFiles);
        downloadSection.classList.add('hidden');
    }

    /**
     * Render file previews
     */
    function renderPreviews() {
        previewContainer.innerHTML = '';

        files.forEach((file, index) => {
            const card = document.createElement('div');
            card.className = 'preview-card';
            card.innerHTML = `
        <div class="relative">
          <img src="${URL.createObjectURL(file)}" alt="${file.name}">
          <button class="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors" data-remove="${index}">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div class="p-3">
          <p class="text-sm font-medium truncate" title="${file.name}">${file.name}</p>
          <p class="text-xs text-[var(--text-secondary)]">${formatFileSize(file.size)}</p>
        </div>
      `;

            // Remove button handler
            card.querySelector('[data-remove]').addEventListener('click', (e) => {
                e.stopPropagation();
                removeFile(index);
            });

            previewContainer.appendChild(card);
        });
    }

    /**
     * Remove a file
     */
    function removeFile(index) {
        files.splice(index, 1);
        convertedFiles = [];
        if (files.length === 0) {
            updateUI();
        } else {
            renderPreviews();
        }
    }

    /**
     * Clear all files
     */
    function clearAll() {
        files = [];
        convertedFiles = [];
        fileInput.value = '';
        previewContainer.innerHTML = '';
        updateUI();
    }

    /**
     * Select output format
     */
    function selectFormat(format) {
        selectedFormat = format;

        if (window.umami) {
            window.umami.track('Image Converter: Select Format', { format: format });
        }

        formatButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.format === format);
        });

        updateQualityVisibility();
    }

    /**
     * Show/hide quality slider based on format
     */
    function updateQualityVisibility() {
        // Quality only applies to lossy formats
        const showQuality = ['jpeg', 'webp'].includes(selectedFormat);
        qualitySection.style.display = showQuality ? 'block' : 'none';
    }

    /**
     * Handle quality slider change
     */
    function handleQualityChange(e) {
        quality = e.target.value / 100;
        qualityValue.textContent = `${e.target.value}%`;
    }

    /**
     * Convert all images
     */
    async function convertImages() {
        if (files.length === 0) return;

        if (window.umami) {
            window.umami.track('Image Converter: Convert Start', {
                count: files.length,
                format: selectedFormat,
                quality: quality
            });
        }

        convertBtn.disabled = true;
        convertBtn.innerHTML = `
      <span class="spinner inline-block mr-2"></span>
      Converting...
    `;

        convertedFiles = [];

        for (const file of files) {
            try {
                const converted = await convertImage(file, selectedFormat, quality);
                convertedFiles.push(converted);
            } catch (error) {
                console.error('Failed to convert:', file.name, error);
                // Add error state for this file
                convertedFiles.push({
                    name: file.name,
                    error: true
                });
            }
        }

        convertBtn.disabled = false;
        convertBtn.textContent = 'Convert Images';

        // Show download section
        downloadSection.classList.remove('hidden');

        // Update previews with converted versions
        updatePreviewsWithConverted();
    }

    /**
     * Convert a single image
     */
    function convertImage(file, format, quality) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.naturalWidth;
                    canvas.height = img.naturalHeight;

                    const ctx = canvas.getContext('2d');

                    // For JPEG, fill with white background (no transparency support)
                    if (format === 'jpeg') {
                        ctx.fillStyle = '#FFFFFF';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                    }

                    ctx.drawImage(img, 0, 0);

                    const mimeType = getMimeType(format);
                    const qualityValue = ['jpeg', 'webp'].includes(format) ? quality : undefined;

                    canvas.toBlob((blob) => {
                        if (blob) {
                            const extension = format === 'jpeg' ? 'jpg' : format;
                            const newName = file.name.replace(/\.[^/.]+$/, `.${extension}`);

                            resolve({
                                name: newName,
                                blob: blob,
                                url: URL.createObjectURL(blob),
                                size: blob.size,
                                originalSize: file.size
                            });
                        } else {
                            reject(new Error('Failed to create blob'));
                        }
                    }, mimeType, qualityValue);
                } catch (error) {
                    reject(error);
                }
            };

            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = URL.createObjectURL(file);
        });
    }

    /**
     * Get MIME type for format
     */
    function getMimeType(format) {
        const types = {
            'png': 'image/png',
            'jpeg': 'image/jpeg',
            'webp': 'image/webp',
            'gif': 'image/gif'
        };
        return types[format] || 'image/png';
    }

    /**
     * Update previews with converted file info
     */
    function updatePreviewsWithConverted() {
        const cards = previewContainer.querySelectorAll('.preview-card');

        cards.forEach((card, index) => {
            const converted = convertedFiles[index];

            if (converted && !converted.error) {
                // Update image src
                const img = card.querySelector('img');
                img.src = converted.url;

                // Update info
                const infoDiv = card.querySelector('.p-3');
                const savings = ((1 - converted.size / converted.originalSize) * 100).toFixed(1);
                const savingsClass = savings > 0 ? 'text-green-500' : 'text-red-500';

                infoDiv.innerHTML = `
          <p class="text-sm font-medium truncate" title="${converted.name}">${converted.name}</p>
          <p class="text-xs text-[var(--text-secondary)]">
            ${formatFileSize(converted.size)}
            <span class="${savingsClass}">(${savings > 0 ? '-' : '+'}${Math.abs(savings)}%)</span>
          </p>
          <button class="btn-accent text-xs py-1 px-3 mt-2 w-full" data-download="${index}">
            Download
          </button>
        `;

                // Add download handler
                card.querySelector('[data-download]').addEventListener('click', (e) => {
                    e.stopPropagation();
                    downloadFile(index);
                });
            }
        });
    }

    /**
     * Download a single converted file
     */
    function downloadFile(index) {
        const file = convertedFiles[index];
        if (!file || file.error) return;

        if (window.umami) {
            // Extract format from name or use global? Global is safer if mixed state, but here synchronous.
            window.umami.track('Image Converter: Download Single', { filename: file.name });
        }

        const a = document.createElement('a');
        a.href = file.url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    /**
     * Download all converted files
     */
    function downloadAll() {
        convertedFiles.forEach((file, index) => {
            if (!file.error) {
                // Stagger downloads slightly to prevent browser blocking
                setTimeout(() => downloadFile(index), index * 200);
            }
        });
    }

    /**
     * Format file size for display
     */
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', init);
})();
