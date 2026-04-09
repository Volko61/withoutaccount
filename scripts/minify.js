/**
 * Minification Script for WithoutAccount
 * 
 * This script minifies HTML, CSS, and JavaScript files from the source directory
 * and outputs them to a 'dist' folder ready for production deployment.
 * 
 * Usage:
 *   npm run minify          - One-time minification
 *   npm run minify:watch    - Watch mode for development
 */

const fs = require('fs-extra');
const path = require('path');
const { minify: minifyHTML } = require('html-minifier-terser');
const CleanCSS = require('clean-css');
const { minify: minifyJS } = require('terser');

// Configuration
const CONFIG = {
    srcDir: path.resolve(__dirname, '..'),
    distDir: path.resolve(__dirname, '..', 'dist'),

    // Files and directories to process
    htmlFiles: [
        'index.html',
        'blog.html',
        '404.html',
        'blog/*.html',
        'tools/*.html'
    ],
    cssFiles: [
        'css/*.css'
    ],
    jsFiles: [
        'js/*.js',
        // Exclude vendor files from minification (they're usually already minified)
        '!js/vendor/**'
    ],

    // Files to copy without processing
    copyAsIs: [
        'robots.txt',
        'sitemap.xml',
        'firebase.json',
        '.firebaserc',
        'assets/**/*',
        'js/vendor/**/*'
    ],

    // Minification options
    htmlOptions: {
        collapseWhitespace: true,
        removeComments: true,
        removeRedundantAttributes: true,
        removeScriptTypeAttributes: true,
        removeStyleLinkTypeAttributes: true,
        useShortDoctype: true,
        minifyCSS: true,
        minifyJS: true,
        sortAttributes: true,
        sortClassName: true
    },
    cssOptions: {
        level: 2 // Advanced optimizations
    },
    jsOptions: {
        compress: {
            drop_console: false, // Keep console logs (set to true to remove them)
            drop_debugger: true,
            pure_funcs: ['console.debug']
        },
        mangle: true,
        format: {
            comments: false
        }
    }
};

// Utilities
const glob = require('path');

function getFiles(patterns, baseDir) {
    const results = [];
    const includePatterns = patterns.filter(p => !p.startsWith('!'));
    const excludePatterns = patterns.filter(p => p.startsWith('!')).map(p => p.slice(1));

    for (const pattern of includePatterns) {
        const files = globSync(pattern, baseDir);
        for (const file of files) {
            const shouldExclude = excludePatterns.some(ep => {
                const excludeFiles = globSync(ep, baseDir);
                return excludeFiles.includes(file);
            });
            if (!shouldExclude && !results.includes(file)) {
                results.push(file);
            }
        }
    }
    return results;
}

function globSync(pattern, baseDir) {
    const results = [];
    const parts = pattern.split('/');

    function walk(dir, partIndex) {
        if (partIndex >= parts.length) return;

        const part = parts[partIndex];
        const isLast = partIndex === parts.length - 1;

        if (part === '**') {
            // Recursive glob
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    walk(fullPath, partIndex); // Stay at ** level
                    walk(fullPath, partIndex + 1); // Move past **
                } else if (isLast || partIndex + 1 < parts.length) {
                    walk(dir, partIndex + 1);
                }
            }
        } else if (part.includes('*')) {
            // Wildcard pattern
            const regex = new RegExp('^' + part.replace(/\*/g, '.*') + '$');
            try {
                const entries = fs.readdirSync(dir, { withFileTypes: true });
                for (const entry of entries) {
                    if (regex.test(entry.name)) {
                        const fullPath = path.join(dir, entry.name);
                        if (isLast) {
                            if (entry.isFile()) {
                                results.push(path.relative(baseDir, fullPath));
                            }
                        } else if (entry.isDirectory()) {
                            walk(fullPath, partIndex + 1);
                        }
                    }
                }
            } catch (e) {
                // Directory doesn't exist
            }
        } else {
            // Exact match
            const fullPath = path.join(dir, part);
            if (isLast) {
                if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
                    results.push(path.relative(baseDir, fullPath));
                }
            } else if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
                walk(fullPath, partIndex + 1);
            }
        }
    }

    walk(baseDir, 0);
    return results;
}

// Stats tracking
const stats = {
    html: { files: 0, originalSize: 0, minifiedSize: 0 },
    css: { files: 0, originalSize: 0, minifiedSize: 0 },
    js: { files: 0, originalSize: 0, minifiedSize: 0 },
    copied: { files: 0, size: 0 }
};

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatPercent(original, minified) {
    if (original === 0) return '0%';
    const saved = ((original - minified) / original * 100).toFixed(1);
    return `${saved}%`;
}

// Minification functions
async function minifyHTMLFile(filePath) {
    const srcPath = path.join(CONFIG.srcDir, filePath);
    const distPath = path.join(CONFIG.distDir, filePath);

    try {
        const content = await fs.readFile(srcPath, 'utf8');
        const minified = await minifyHTML(content, CONFIG.htmlOptions);

        await fs.ensureDir(path.dirname(distPath));
        await fs.writeFile(distPath, minified);

        stats.html.files++;
        stats.html.originalSize += content.length;
        stats.html.minifiedSize += minified.length;

        console.log(`  ✓ ${filePath} (${formatBytes(content.length)} → ${formatBytes(minified.length)})`);
    } catch (error) {
        console.error(`  ✗ ${filePath}: ${error.message}`);
    }
}

async function minifyCSSFile(filePath) {
    const srcPath = path.join(CONFIG.srcDir, filePath);
    const distPath = path.join(CONFIG.distDir, filePath);

    try {
        const content = await fs.readFile(srcPath, 'utf8');
        const result = new CleanCSS(CONFIG.cssOptions).minify(content);

        if (result.errors.length > 0) {
            throw new Error(result.errors.join(', '));
        }

        await fs.ensureDir(path.dirname(distPath));
        await fs.writeFile(distPath, result.styles);

        stats.css.files++;
        stats.css.originalSize += content.length;
        stats.css.minifiedSize += result.styles.length;

        console.log(`  ✓ ${filePath} (${formatBytes(content.length)} → ${formatBytes(result.styles.length)})`);
    } catch (error) {
        console.error(`  ✗ ${filePath}: ${error.message}`);
    }
}

async function minifyJSFile(filePath) {
    const srcPath = path.join(CONFIG.srcDir, filePath);
    const distPath = path.join(CONFIG.distDir, filePath);

    try {
        const content = await fs.readFile(srcPath, 'utf8');
        const result = await minifyJS(content, CONFIG.jsOptions);

        if (result.code === undefined) {
            throw new Error('Minification failed');
        }

        await fs.ensureDir(path.dirname(distPath));
        await fs.writeFile(distPath, result.code);

        stats.js.files++;
        stats.js.originalSize += content.length;
        stats.js.minifiedSize += result.code.length;

        console.log(`  ✓ ${filePath} (${formatBytes(content.length)} → ${formatBytes(result.code.length)})`);
    } catch (error) {
        console.error(`  ✗ ${filePath}: ${error.message}`);
    }
}

async function copyFile(filePath) {
    const srcPath = path.join(CONFIG.srcDir, filePath);
    const distPath = path.join(CONFIG.distDir, filePath);

    try {
        await fs.ensureDir(path.dirname(distPath));
        await fs.copy(srcPath, distPath);

        const fileStats = await fs.stat(srcPath);
        stats.copied.files++;
        stats.copied.size += fileStats.size;

        console.log(`  → ${filePath} (copied)`);
    } catch (error) {
        console.error(`  ✗ ${filePath}: ${error.message}`);
    }
}

async function build() {
    const startTime = Date.now();

    console.log('\nStarting minification...\n');

    // Clean dist directory
    console.log('Cleaning dist directory...');
    await fs.emptyDir(CONFIG.distDir);

    // Minify HTML files
    console.log('\nMinifying HTML files...');
    const htmlFiles = getFiles(CONFIG.htmlFiles, CONFIG.srcDir);
    for (const file of htmlFiles) {
        await minifyHTMLFile(file);
    }

    // Minify CSS files
    console.log('\nMinifying CSS files...');
    const cssFiles = getFiles(CONFIG.cssFiles, CONFIG.srcDir);
    for (const file of cssFiles) {
        await minifyCSSFile(file);
    }

    // Minify JS files
    console.log('\nMinifying JavaScript files...');
    const jsFiles = getFiles(CONFIG.jsFiles, CONFIG.srcDir);
    for (const file of jsFiles) {
        await minifyJSFile(file);
    }

    // Copy files as-is
    console.log('\nCopying other files...');
    const copyFiles = getFiles(CONFIG.copyAsIs, CONFIG.srcDir);
    for (const file of copyFiles) {
        await copyFile(file);
    }

    // Print summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const totalOriginal = stats.html.originalSize + stats.css.originalSize + stats.js.originalSize;
    const totalMinified = stats.html.minifiedSize + stats.css.minifiedSize + stats.js.minifiedSize;

    console.log('\n' + '═'.repeat(60));
    console.log('Minification Summary');
    console.log('═'.repeat(60));
    console.log(`\n  HTML: ${stats.html.files} files`);
    console.log(`        ${formatBytes(stats.html.originalSize)} → ${formatBytes(stats.html.minifiedSize)} (saved ${formatPercent(stats.html.originalSize, stats.html.minifiedSize)})`);
    console.log(`\n  CSS:  ${stats.css.files} files`);
    console.log(`        ${formatBytes(stats.css.originalSize)} → ${formatBytes(stats.css.minifiedSize)} (saved ${formatPercent(stats.css.originalSize, stats.css.minifiedSize)})`);
    console.log(`\n  JS:   ${stats.js.files} files`);
    console.log(`        ${formatBytes(stats.js.originalSize)} → ${formatBytes(stats.js.minifiedSize)} (saved ${formatPercent(stats.js.originalSize, stats.js.minifiedSize)})`);
    console.log(`\n  Copied: ${stats.copied.files} files (${formatBytes(stats.copied.size)})`);
    console.log('\n' + '─'.repeat(60));
    console.log(`  Total: ${formatBytes(totalOriginal)} → ${formatBytes(totalMinified)} (saved ${formatPercent(totalOriginal, totalMinified)})`);
    console.log(`  Time:  ${duration}s`);
    console.log('═'.repeat(60));
    console.log(`\nBuild complete! Output: ${CONFIG.distDir}\n`);
}

// Watch mode
async function watch() {
    const chokidar = require('chokidar');

    console.log('\nWatch mode enabled. Watching for changes...\n');

    // Initial build
    await build();

    // Watch for changes
    const watcher = chokidar.watch([
        path.join(CONFIG.srcDir, '**/*.html'),
        path.join(CONFIG.srcDir, '**/*.css'),
        path.join(CONFIG.srcDir, '**/*.js')
    ], {
        ignored: [
            path.join(CONFIG.srcDir, 'dist/**'),
            path.join(CONFIG.srcDir, 'node_modules/**'),
            path.join(CONFIG.srcDir, 'scripts/**'),
            path.join(CONFIG.srcDir, 'js/vendor/**')
        ],
        persistent: true,
        ignoreInitial: true
    });

    watcher.on('change', async (filePath) => {
        const relativePath = path.relative(CONFIG.srcDir, filePath);
        console.log(`\nChanged: ${relativePath}`);

        // Reset stats
        Object.keys(stats).forEach(key => {
            stats[key] = { files: 0, originalSize: 0, minifiedSize: 0 };
        });
        stats.copied = { files: 0, size: 0 };

        // Re-minify the changed file
        if (filePath.endsWith('.html')) {
            await minifyHTMLFile(relativePath);
        } else if (filePath.endsWith('.css')) {
            await minifyCSSFile(relativePath);
        } else if (filePath.endsWith('.js')) {
            await minifyJSFile(relativePath);
        }
    });

    watcher.on('add', async (filePath) => {
        const relativePath = path.relative(CONFIG.srcDir, filePath);
        console.log(`\nAdded: ${relativePath}`);
        await build();
    });

    watcher.on('unlink', async (filePath) => {
        const relativePath = path.relative(CONFIG.srcDir, filePath);
        const distPath = path.join(CONFIG.distDir, relativePath);
        console.log(`\nDeleted: ${relativePath}`);
        await fs.remove(distPath);
    });
}

// Main entry point
const isWatch = process.argv.includes('--watch');

if (isWatch) {
    watch().catch(console.error);
} else {
    build().catch(console.error);
}
