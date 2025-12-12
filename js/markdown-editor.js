/**
 * Markdown Editor - WithoutAccount
 * Handles markdown parsing, toolbar actions, and file operations.
 */

(function () {
    'use strict';

    // DOM Elements
    const markdownInput = document.getElementById('markdown-input');
    const markdownPreview = document.getElementById('markdown-preview');
    const toolbarButtons = document.querySelectorAll('.toolbar-btn');
    const copyHtmlBtn = document.getElementById('copy-html-btn');
    const downloadBtn = document.getElementById('download-btn');

    // Default Content
    const defaultContent = `# Welcome to Markdown Editor

This is a **live preview** editor. Everything you type here is instantly rendered on the right.

## Features
- **Bold** and *Italic* text
- [Links](https://withoutaccount.com) and Images
- Code blocks and Lists
- Real-time conversion

### Try it out!
1. Type some markdown
2. Use the toolbar above
3. Export your file when done

> "Simplicity is the ultimate sophistication."

\`\`\`javascript
console.log('Hello, World!');
\`\`\`
`;

    /**
     * Initialize the editor
     */
    function init() {
        if (!markdownInput || !markdownPreview) return;

        // Configure marked.js
        if (typeof marked !== 'undefined') {
            marked.use({
                breaks: true, // Enable GFM line breaks
                gfm: true
            });
        }

        // Set default content
        markdownInput.value = defaultContent;
        updatePreview();

        // Event Listeners
        markdownInput.addEventListener('input', updatePreview);

        toolbarButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.getAttribute('data-action');
                handleToolbarAction(action);
            });
        });

        if (copyHtmlBtn) {
            copyHtmlBtn.addEventListener('click', copyHtmlToClipboard);
        }

        if (downloadBtn) {
            downloadBtn.addEventListener('click', downloadMarkdown);
        }
    }

    /**
     * Update the preview pane
     */
    function updatePreview() {
        const markdownText = markdownInput.value;
        const htmlContent = marked.parse(markdownText);
        markdownPreview.innerHTML = htmlContent;
    }

    /**
     * Handle toolbar button clicks
     * @param {string} action - The action to perform (bold, italic, etc.)
     */
    function handleToolbarAction(action) {
        const start = markdownInput.selectionStart;
        const end = markdownInput.selectionEnd;
        const text = markdownInput.value;
        const selectedText = text.substring(start, end);

        let replacement = '';
        let cursorOffset = 0;

        switch (action) {
            case 'bold':
                replacement = `**${selectedText || 'Bold Text'}**`;
                cursorOffset = selectedText ? 0 : -2; // Move cursor inside if no selection
                break;
            case 'italic':
                replacement = `*${selectedText || 'Italic Text'}*`;
                cursorOffset = selectedText ? 0 : -1;
                break;
            case 'h1':
                replacement = `# ${selectedText || 'Heading 1'}`;
                break;
            case 'h2':
                replacement = `## ${selectedText || 'Heading 2'}`;
                break;
            case 'h3':
                replacement = `### ${selectedText || 'Heading 3'}`;
                break;
            case 'ul':
                replacement = `- ${selectedText || 'List item'}`;
                break;
            case 'ol':
                replacement = `1. ${selectedText || 'List item'}`;
                break;
            case 'quote':
                replacement = `> ${selectedText || 'Blockquote'}`;
                break;
            case 'code': // Code block if multiline, inline code if single line
                if (selectedText.includes('\n')) {
                    replacement = `\`\`\`\n${selectedText || 'code'}\n\`\`\``;
                } else {
                    replacement = `\`${selectedText || 'code'}\``;
                }
                break;
            case 'link':
                replacement = `[${selectedText || 'Link Text'}](https://example.com)`;
                break;
            case 'image':
                replacement = `![${selectedText || 'Alt Text'}](https://via.placeholder.com/300)`;
                break;
        }

        // Insert text
        markdownInput.value = text.substring(0, start) + replacement + text.substring(end);

        // Restore focus and cursor
        markdownInput.focus();

        if (selectedText) {
            // If text was selected, select the replacement (simplified)
            markdownInput.setSelectionRange(start + replacement.length, start + replacement.length);
        } else {
            // If placeholder was inserted, select the placeholder text effectively? 
            // Actually simpler to just put cursor at end of replacement for now or calculate offset.
            // For now, put cursor at end of insertion
            markdownInput.setSelectionRange(start + replacement.length + cursorOffset, start + replacement.length + cursorOffset);
        }

        updatePreview();
    }

    /**
     * Copy the generated HTML to clipboard
     */
    function copyHtmlToClipboard() {
        const htmlContent = marked.parse(markdownInput.value);
        navigator.clipboard.writeText(htmlContent).then(() => {
            const originalText = copyHtmlBtn.innerText;
            copyHtmlBtn.innerText = 'Copied!';
            setTimeout(() => {
                copyHtmlBtn.innerText = originalText;
            }, 2000);
        });
    }

    /**
     * Download the markdown file
     */
    function downloadMarkdown() {
        const markdownText = markdownInput.value;
        const blob = new Blob([markdownText], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');

        a.href = url;
        a.download = 'document.md';
        document.body.appendChild(a);
        a.click();

        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Run init when DOM is ready
    document.addEventListener('DOMContentLoaded', init);

})();
