/**
 * Word Counter Tool - JavaScript
 * Provides text analysis, keyword density, similar word grouping, and topic detection
 */

(function () {
    'use strict';

    // DOM Elements
    const textInput = document.getElementById('text-input');
    const clearBtn = document.getElementById('clear-btn');
    const copyBtn = document.getElementById('copy-btn');

    // Stats elements
    const statElements = {
        characters: document.getElementById('stat-characters'),
        charsNoSpaces: document.getElementById('stat-chars-no-spaces'),
        words: document.getElementById('stat-words'),
        sentences: document.getElementById('stat-sentences'),
        paragraphs: document.getElementById('stat-paragraphs'),
        lines: document.getElementById('stat-lines'),
        uniqueWords: document.getElementById('stat-unique-words'),
        numbers: document.getElementById('stat-numbers'),
        avgWordLength: document.getElementById('stat-avg-word-length'),
        avgSentenceLength: document.getElementById('stat-avg-sentence-length')
    };

    // Time elements
    const timeElements = {
        reading: document.getElementById('time-reading'),
        speaking: document.getElementById('time-speaking'),
        handwriting: document.getElementById('time-handwriting')
    };

    // Analysis containers
    const keywordsList = document.getElementById('keywords-list');
    const similarList = document.getElementById('similar-list');
    const topicsList = document.getElementById('topics-list');

    // Topic definitions with keywords
    const TOPICS = {
        technology: {
            name: 'Technology',
            icon: 'TECH',
            keywords: ['software', 'computer', 'code', 'programming', 'app', 'data', 'ai', 'artificial', 'intelligence',
                'machine', 'learning', 'algorithm', 'digital', 'internet', 'web', 'system', 'database', 'cloud',
                'server', 'network', 'developer', 'api', 'framework', 'technology', 'tech', 'automation', 'robot',
                'hardware', 'processor', 'memory', 'storage', 'cybersecurity', 'encryption', 'blockchain']
        },
        business: {
            name: 'Business',
            icon: 'BUS',
            keywords: ['company', 'market', 'sales', 'revenue', 'strategy', 'growth', 'business', 'enterprise', 'corporate',
                'management', 'customer', 'client', 'profit', 'investment', 'startup', 'entrepreneur', 'marketing',
                'brand', 'product', 'service', 'industry', 'competition', 'partnership', 'deal', 'contract']
        },
        science: {
            name: 'Science',
            icon: 'SCI',
            keywords: ['research', 'study', 'experiment', 'theory', 'hypothesis', 'science', 'scientific', 'laboratory',
                'analysis', 'discovery', 'observation', 'evidence', 'data', 'method', 'biology', 'chemistry',
                'physics', 'mathematics', 'statistics', 'genetics', 'evolution', 'molecule', 'atom', 'energy']
        },
        health: {
            name: 'Health',
            icon: 'HLTH',
            keywords: ['medicine', 'health', 'doctor', 'treatment', 'symptoms', 'patient', 'hospital', 'medical',
                'disease', 'diagnosis', 'therapy', 'healthcare', 'wellness', 'nutrition', 'exercise', 'mental',
                'physical', 'vaccine', 'drug', 'pharmaceutical', 'surgery', 'nurse', 'clinic', 'recovery']
        },
        education: {
            name: 'Education',
            icon: 'EDU',
            keywords: ['school', 'learning', 'student', 'teacher', 'course', 'education', 'university', 'college',
                'class', 'lesson', 'curriculum', 'degree', 'academic', 'study', 'knowledge', 'training',
                'skill', 'exam', 'test', 'grade', 'professor', 'lecture', 'assignment', 'homework']
        },
        finance: {
            name: 'Finance',
            icon: 'FIN',
            keywords: ['money', 'investment', 'budget', 'stock', 'banking', 'finance', 'financial', 'bank', 'loan',
                'credit', 'debt', 'interest', 'savings', 'currency', 'tax', 'income', 'expense', 'payment',
                'fund', 'portfolio', 'dividend', 'bond', 'insurance', 'mortgage', 'wealth']
        },
        travel: {
            name: 'Travel',
            icon: 'TRVL',
            keywords: ['trip', 'destination', 'hotel', 'flight', 'vacation', 'travel', 'tourist', 'tourism', 'journey',
                'adventure', 'explore', 'beach', 'mountain', 'city', 'country', 'passport', 'airport', 'booking',
                'resort', 'cruise', 'backpack', 'itinerary', 'sightseeing', 'culture']
        },
        food: {
            name: 'Food',
            icon: 'FOOD',
            keywords: ['recipe', 'cooking', 'ingredient', 'restaurant', 'meal', 'food', 'chef', 'kitchen', 'dish',
                'cuisine', 'taste', 'flavor', 'delicious', 'bake', 'grill', 'fry', 'vegetable', 'fruit',
                'meat', 'dessert', 'breakfast', 'lunch', 'dinner', 'organic', 'diet']
        },
        sports: {
            name: 'Sports',
            icon: 'SPORT',
            keywords: ['game', 'team', 'player', 'score', 'championship', 'sport', 'sports', 'match', 'competition',
                'athlete', 'coach', 'training', 'fitness', 'workout', 'football', 'basketball', 'soccer',
                'tennis', 'golf', 'swimming', 'running', 'marathon', 'olympics', 'league', 'tournament']
        },
        entertainment: {
            name: 'Entertainment',
            icon: 'MEDIA',
            keywords: ['movie', 'music', 'show', 'artist', 'concert', 'entertainment', 'film', 'actor', 'actress',
                'director', 'song', 'album', 'band', 'singer', 'streaming', 'netflix', 'youtube', 'tv',
                'television', 'series', 'episode', 'celebrity', 'performance', 'theater', 'comedy']
        }
    };

    // Stop words to filter out from keyword analysis
    const STOP_WORDS = new Set([
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as',
        'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
        'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'that',
        'this', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which', 'who', 'whom',
        'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some',
        'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'also', 'now',
        'here', 'there', 'then', 'if', 'else', 'because', 'about', 'into', 'through', 'during', 'before',
        'after', 'above', 'below', 'between', 'under', 'again', 'further', 'once', 'up', 'down', 'out', 'off',
        'over', 'any', 'am', 'your', 'my', 'our', 'their', 'his', 'her', 'its', 'me', 'him', 'us', 'them'
    ]);

    // ========================================
    // TEXT ANALYSIS FUNCTIONS
    // ========================================

    function countCharacters(text) {
        return text.length;
    }

    function countCharactersNoSpaces(text) {
        return text.replace(/\s/g, '').length;
    }

    function getWords(text) {
        const trimmed = text.trim();
        if (!trimmed) return [];
        return trimmed.match(/[\w'-]+/g) || [];
    }

    function countWords(text) {
        return getWords(text).length;
    }

    function countSentences(text) {
        const trimmed = text.trim();
        if (!trimmed) return 0;
        // Match sentence-ending punctuation
        const sentences = trimmed.match(/[^.!?]+[.!?]+/g);
        return sentences ? sentences.length : (trimmed.length > 0 ? 1 : 0);
    }

    function countParagraphs(text) {
        const trimmed = text.trim();
        if (!trimmed) return 0;
        // Split by double line breaks or more
        const paragraphs = trimmed.split(/\n\s*\n/).filter(p => p.trim().length > 0);
        return paragraphs.length || (trimmed.length > 0 ? 1 : 0);
    }

    function countLines(text) {
        if (!text) return 0;
        return text.split('\n').length;
    }

    function countUniqueWords(text) {
        const words = getWords(text).map(w => w.toLowerCase());
        return new Set(words).size;
    }

    function countNumbers(text) {
        const numbers = text.match(/\d+(\.\d+)?/g);
        return numbers ? numbers.length : 0;
    }

    function calculateAvgWordLength(text) {
        const words = getWords(text);
        if (words.length === 0) return 0;
        const totalChars = words.reduce((sum, word) => sum + word.length, 0);
        return (totalChars / words.length).toFixed(1);
    }

    function calculateAvgSentenceLength(text) {
        const wordCount = countWords(text);
        const sentenceCount = countSentences(text);
        if (sentenceCount === 0) return 0;
        return (wordCount / sentenceCount).toFixed(1);
    }

    // ========================================
    // TIME CALCULATIONS
    // ========================================

    function formatTime(minutes) {
        if (minutes < 1) {
            const seconds = Math.round(minutes * 60);
            return `${seconds} sec`;
        } else if (minutes < 60) {
            const mins = Math.floor(minutes);
            const secs = Math.round((minutes - mins) * 60);
            if (secs > 0) {
                return `${mins} min ${secs} sec`;
            }
            return `${mins} min`;
        } else {
            const hours = Math.floor(minutes / 60);
            const mins = Math.round(minutes % 60);
            if (mins > 0) {
                return `${hours} hr ${mins} min`;
            }
            return `${hours} hr`;
        }
    }

    function calculateReadingTime(wordCount) {
        // Average reading speed: 200 WPM
        return formatTime(wordCount / 200);
    }

    function calculateSpeakingTime(wordCount) {
        // Average speaking speed: 150 WPM
        return formatTime(wordCount / 150);
    }

    function calculateHandwritingTime(wordCount) {
        // Average handwriting speed: 13 WPM
        return formatTime(wordCount / 13);
    }

    // ========================================
    // KEYWORD DENSITY
    // ========================================

    function getKeywordDensity(text, limit = 15) {
        const words = getWords(text).map(w => w.toLowerCase());
        if (words.length === 0) return [];

        // Count word frequencies, excluding stop words
        const frequency = {};
        words.forEach(word => {
            if (word.length > 2 && !STOP_WORDS.has(word)) {
                frequency[word] = (frequency[word] || 0) + 1;
            }
        });

        // Sort by frequency and take top N
        const sorted = Object.entries(frequency)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit);

        // Calculate percentages
        return sorted.map(([word, count]) => ({
            word,
            count,
            percentage: ((count / words.length) * 100).toFixed(1)
        }));
    }

    // ========================================
    // LEVENSHTEIN DISTANCE FOR SIMILAR WORDS
    // ========================================

    function levenshteinDistance(a, b) {
        const matrix = [];

        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1, // substitution
                        matrix[i][j - 1] + 1,     // insertion
                        matrix[i - 1][j] + 1      // deletion
                    );
                }
            }
        }

        return matrix[b.length][a.length];
    }

    function getSimilarKeywordDensity(text, maxDistance = 2) {
        const words = getWords(text).map(w => w.toLowerCase());
        if (words.length === 0) return [];

        // Get word frequencies (excluding stop words)
        const frequency = {};
        words.forEach(word => {
            if (word.length > 2 && !STOP_WORDS.has(word)) {
                frequency[word] = (frequency[word] || 0) + 1;
            }
        });

        const uniqueWords = Object.keys(frequency);
        const groups = [];
        const assigned = new Set();

        // Group similar words together
        uniqueWords.forEach(word => {
            if (assigned.has(word)) return;

            const group = {
                words: [word],
                count: frequency[word]
            };
            assigned.add(word);

            uniqueWords.forEach(otherWord => {
                if (assigned.has(otherWord)) return;
                if (word === otherWord) return;

                // Only compare words of similar length (optimization)
                if (Math.abs(word.length - otherWord.length) <= maxDistance) {
                    const distance = levenshteinDistance(word, otherWord);
                    if (distance <= maxDistance) {
                        group.words.push(otherWord);
                        group.count += frequency[otherWord];
                        assigned.add(otherWord);
                    }
                }
            });

            if (group.words.length > 1 || group.count >= 2) {
                groups.push(group);
            }
        });

        // Sort by total count
        groups.sort((a, b) => b.count - a.count);

        // Calculate percentages
        return groups.slice(0, 15).map(group => ({
            words: group.words,
            count: group.count,
            percentage: ((group.count / words.length) * 100).toFixed(1)
        }));
    }

    // ========================================
    // TOPIC DENSITY
    // ========================================

    function getTopicDensity(text) {
        const words = getWords(text).map(w => w.toLowerCase());
        if (words.length === 0) return [];

        const topicScores = {};
        let totalMatches = 0;

        // Count topic keyword matches
        Object.entries(TOPICS).forEach(([topicId, topic]) => {
            let matches = 0;
            topic.keywords.forEach(keyword => {
                words.forEach(word => {
                    if (word === keyword || word.includes(keyword) || keyword.includes(word)) {
                        matches++;
                    }
                });
            });

            if (matches > 0) {
                topicScores[topicId] = {
                    name: topic.name,
                    icon: topic.icon,
                    matches
                };
                totalMatches += matches;
            }
        });

        // Calculate percentages and sort
        const results = Object.values(topicScores)
            .map(topic => ({
                ...topic,
                percentage: totalMatches > 0 ? ((topic.matches / totalMatches) * 100).toFixed(1) : 0
            }))
            .sort((a, b) => b.matches - a.matches);

        return results;
    }

    // ========================================
    // UI UPDATE FUNCTIONS
    // ========================================

    function updateStats(text) {
        const wordCount = countWords(text);

        // Update basic stats
        statElements.characters.textContent = countCharacters(text).toLocaleString();
        statElements.charsNoSpaces.textContent = countCharactersNoSpaces(text).toLocaleString();
        statElements.words.textContent = wordCount.toLocaleString();
        statElements.sentences.textContent = countSentences(text).toLocaleString();
        statElements.paragraphs.textContent = countParagraphs(text).toLocaleString();
        statElements.lines.textContent = countLines(text).toLocaleString();
        statElements.uniqueWords.textContent = countUniqueWords(text).toLocaleString();
        statElements.numbers.textContent = countNumbers(text).toLocaleString();
        statElements.avgWordLength.textContent = calculateAvgWordLength(text);
        statElements.avgSentenceLength.textContent = calculateAvgSentenceLength(text);

        // Update time estimates
        timeElements.reading.textContent = calculateReadingTime(wordCount);
        timeElements.speaking.textContent = calculateSpeakingTime(wordCount);
        timeElements.handwriting.textContent = calculateHandwritingTime(wordCount);

        // Update keyword density
        updateKeywordDensity(text);

        // Update similar keywords
        updateSimilarKeywords(text);

        // Update topic density
        updateTopicDensity(text);
    }

    function updateKeywordDensity(text) {
        const keywords = getKeywordDensity(text);

        if (keywords.length === 0) {
            keywordsList.innerHTML = `
        <div class="empty-state">
          <p>Enter text above to see keyword density analysis</p>
        </div>
      `;
            return;
        }

        const maxPercentage = Math.max(...keywords.map(k => parseFloat(k.percentage)));

        keywordsList.innerHTML = keywords.map(k => `
      <div class="keyword-item">
        <div class="flex-1">
          <div class="flex items-center justify-between mb-1">
            <span class="font-medium">${escapeHtml(k.word)}</span>
            <span class="text-sm text-[var(--text-secondary)]">${k.count}x (${k.percentage}%)</span>
          </div>
          <div class="density-bar">
            <div class="density-fill" style="width: ${(parseFloat(k.percentage) / maxPercentage) * 100}%"></div>
          </div>
        </div>
      </div>
    `).join('');
    }

    function updateSimilarKeywords(text) {
        const similar = getSimilarKeywordDensity(text);

        if (similar.length === 0) {
            similarList.innerHTML = `
        <div class="empty-state">
          <p>Enter text above to see similar keyword groups</p>
        </div>
      `;
            return;
        }

        const grouped = similar.filter(s => s.words.length > 1);
        const single = similar.filter(s => s.words.length === 1);

        let html = '';

        if (grouped.length > 0) {
            html += '<h4 class="text-sm font-medium mb-3 text-[var(--text-secondary)]">Similar Word Groups</h4>';
            html += grouped.map(s => `
        <div class="keyword-item">
          <div class="flex-1">
            <div class="flex items-center justify-between mb-1">
              <span class="font-medium">${s.words.map(w => escapeHtml(w)).join(', ')}</span>
              <span class="text-sm text-[var(--text-secondary)]">${s.count}x (${s.percentage}%)</span>
            </div>
          </div>
        </div>
      `).join('');
        }

        if (single.length > 0 && grouped.length > 0) {
            html += '<h4 class="text-sm font-medium mb-3 mt-4 text-[var(--text-secondary)]">Standalone Keywords</h4>';
        }

        if (single.length > 0) {
            html += single.slice(0, 10).map(s => `
        <div class="keyword-item">
          <div class="flex-1">
            <div class="flex items-center justify-between">
              <span class="font-medium">${escapeHtml(s.words[0])}</span>
              <span class="text-sm text-[var(--text-secondary)]">${s.count}x (${s.percentage}%)</span>
            </div>
          </div>
        </div>
      `).join('');
        }

        similarList.innerHTML = html || `
      <div class="empty-state">
        <p>No similar keyword groups found</p>
      </div>
    `;
    }

    function updateTopicDensity(text) {
        const topics = getTopicDensity(text);

        if (topics.length === 0) {
            topicsList.innerHTML = `
        <div class="empty-state">
          <p>Enter text above to see topic analysis</p>
        </div>
      `;
            return;
        }

        topicsList.innerHTML = `
      <div class="flex flex-wrap gap-3">
        ${topics.map(t => `
          <div class="topic-tag">
            <span>${t.icon}</span>
            <span>${t.name}</span>
            <span class="percentage">${t.percentage}%</span>
          </div>
        `).join('')}
      </div>
    `;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ========================================
    // TAB FUNCTIONALITY
    // ========================================

    function setupTabs() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTab = btn.dataset.tab;

                // Update button states
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Update content visibility
                tabContents.forEach(content => {
                    content.classList.remove('active');
                    if (content.id === `tab-${targetTab}`) {
                        content.classList.add('active');
                    }
                });
            });
        });
    }

    // ========================================
    // EVENT HANDLERS
    // ========================================

    function handleTextInput() {
        const text = textInput.value;
        updateStats(text);
    }

    function handleClear() {
        textInput.value = '';
        updateStats('');
        textInput.focus();
    }

    function handleCopyStats() {
        const text = textInput.value;
        const wordCount = countWords(text);

        const stats = `Text Statistics:
Characters: ${countCharacters(text)}
Characters (no spaces): ${countCharactersNoSpaces(text)}
Words: ${wordCount}
Sentences: ${countSentences(text)}
Paragraphs: ${countParagraphs(text)}
Lines: ${countLines(text)}
Unique Words: ${countUniqueWords(text)}
Numbers: ${countNumbers(text)}
Avg Word Length: ${calculateAvgWordLength(text)}
Avg Words/Sentence: ${calculateAvgSentenceLength(text)}

Time Estimates:
Reading Time: ${calculateReadingTime(wordCount)}
Speaking Time: ${calculateSpeakingTime(wordCount)}
Handwriting Time: ${calculateHandwritingTime(wordCount)}`;

        navigator.clipboard.writeText(stats).then(() => {
            const originalText = copyBtn.innerHTML;
            copyBtn.innerHTML = `
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
        </svg>
        Copied!
      `;
            setTimeout(() => {
                copyBtn.innerHTML = originalText;
            }, 2000);
        });
    }

    // ========================================
    // INITIALIZATION
    // ========================================

    function init() {
        // Set up event listeners
        textInput.addEventListener('input', handleTextInput);
        clearBtn.addEventListener('click', handleClear);
        copyBtn.addEventListener('click', handleCopyStats);

        // Set up tabs
        setupTabs();

        // Initial update
        updateStats('');

        // Focus the text input
        textInput.focus();
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
