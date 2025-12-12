/**
 * YouTube Thumbnail Previewer - WithoutAccount
 * Handles image upload and preview updates across all device layouts
 */

(function () {
    'use strict';

    // DOM Elements
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const thumbnailPreview = document.getElementById('thumbnail-preview');
    const changeImageBtn = document.getElementById('change-image-btn');
    const videoTitleInput = document.getElementById('video-title');
    const channelNameInput = document.getElementById('channel-name');
    const videoDurationInput = document.getElementById('video-duration');
    const charCount = document.getElementById('char-count');

    // Preview element mappings
    const previewMappings = {
        thumbnails: [
            'home-thumb-1',
            'sidebar-thumb-1',
            'mobile-thumb-1',
            'search-thumb-1'
        ],
        titles: [
            'home-title-1',
            'sidebar-title-1',
            'mobile-title-1',
            'search-title-1'
        ],
        channels: [
            'home-channel-1',
            'sidebar-channel-1',
            'mobile-channel-1',
            'search-channel-1'
        ],
        durations: [
            'home-duration-1',
            'sidebar-duration-1',
            'mobile-duration-1',
            'search-duration-1'
        ]
    };

    // State
    let currentImageUrl = null;

    /**
     * Initialize the previewer
     */
    function init() {
        if (!dropZone || !fileInput) return;

        setupDropZone();
        setupFileInput();
        setupInputListeners();
    }

    /**
     * Setup drag and drop functionality
     */
    function setupDropZone() {
        // Click to select file
        dropZone.addEventListener('click', (e) => {
            if (e.target !== changeImageBtn) {
                fileInput.click();
            }
        });

        // Change image button
        if (changeImageBtn) {
            changeImageBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                fileInput.click();
            });
        }

        // Drag events
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');

            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleFile(files[0]);
            }
        });
    }

    /**
     * Setup file input change handler
     */
    function setupFileInput() {
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFile(e.target.files[0]);
            }
        });
    }

    /**
     * Setup input field listeners for live updates
     */
    function setupInputListeners() {
        // Video title
        if (videoTitleInput) {
            videoTitleInput.addEventListener('input', () => {
                updateTitles(videoTitleInput.value);
                updateCharCount();
            });
        }

        // Channel name
        if (channelNameInput) {
            channelNameInput.addEventListener('input', () => {
                updateChannelNames(channelNameInput.value);
            });
        }

        // Video duration
        if (videoDurationInput) {
            videoDurationInput.addEventListener('input', () => {
                updateDurations(videoDurationInput.value);
            });
        }
    }

    /**
     * Handle uploaded file
     */
    function handleFile(file) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        // Revoke previous URL to prevent memory leaks
        if (currentImageUrl) {
            URL.revokeObjectURL(currentImageUrl);
        }

        // Create object URL for the image
        currentImageUrl = URL.createObjectURL(file);

        // Update drop zone preview
        if (thumbnailPreview) {
            thumbnailPreview.src = currentImageUrl;
            dropZone.classList.add('has-image');
        }

        // Update all preview thumbnails
        updateThumbnails(currentImageUrl);
    }

    /**
     * Update all thumbnail placeholders with the uploaded image
     */
    function updateThumbnails(imageUrl) {
        previewMappings.thumbnails.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                // Replace placeholder with actual image
                const parent = element.parentElement;
                const existingImg = parent.querySelector('.yt-thumbnail');

                if (existingImg) {
                    // Update existing image
                    existingImg.src = imageUrl;
                } else {
                    // Create new image element
                    const img = document.createElement('img');
                    img.src = imageUrl;
                    img.alt = 'Video thumbnail';
                    img.className = 'yt-thumbnail';

                    // Hide placeholder and insert image
                    element.style.display = 'none';
                    parent.insertBefore(img, element);
                }
            }
        });
    }

    /**
     * Update all title elements
     */
    function updateTitles(title) {
        const displayTitle = title.trim() || 'Your Video Title Will Appear Here';

        previewMappings.titles.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = displayTitle;
            }
        });
    }

    /**
     * Update all channel name elements
     */
    function updateChannelNames(name) {
        const displayName = name.trim() || 'My Channel';

        previewMappings.channels.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                // Handle mobile channel which has extra info
                if (id === 'mobile-channel-1') {
                    element.textContent = `${displayName} • 125K views • 2 days ago`;
                } else if (id === 'search-channel-1') {
                    // Search result channel has avatar
                    element.innerHTML = `
                        <div class="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 inline-block mr-2 align-middle"></div>
                        ${displayName}
                    `;
                } else {
                    element.textContent = displayName;
                }
            }
        });
    }

    /**
     * Update all duration elements
     */
    function updateDurations(duration) {
        const displayDuration = duration.trim() || '10:24';

        previewMappings.durations.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = displayDuration;
            }
        });
    }

    /**
     * Update character count display
     */
    function updateCharCount() {
        if (charCount && videoTitleInput) {
            charCount.textContent = videoTitleInput.value.length;
        }
    }

    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', init);

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        if (currentImageUrl) {
            URL.revokeObjectURL(currentImageUrl);
        }
    });
})();
