// SAT Math Prep - Main Application
// Complete SPA with routing, state management, diagnostics, practice, and progress tracking

(function() {
    'use strict';

    // ============================================
    // STATE MANAGEMENT
    // ============================================
    const DEFAULT_STATE = {
        initialized: false,
        diagnosticComplete: false,
        diagnosticResults: null,
        currentScore: null,
        startScore: null,
        targetScore: 700,
        questionsAnswered: {},    // questionId -> { correct, timestamp, attempts }
        topicScores: {},          // topic -> { correct, total, lastPractice }
        subtopicScores: {},       // subtopic -> { correct, total }
        lessonsCompleted: [],
        lessonsStarted: [],
        practiceHistory: [],      // [{date, score, total, topic, timestamp}]
        streak: 0,
        lastPracticeDate: null,
        studyDay: 1,
        startDate: null
    };

    let state = {};

    function loadState() {
        try {
            const saved = localStorage.getItem('sat_prep_state');
            if (saved) {
                state = Object.assign({}, DEFAULT_STATE, JSON.parse(saved));
            } else {
                state = Object.assign({}, DEFAULT_STATE);
            }
        } catch(e) {
            state = Object.assign({}, DEFAULT_STATE);
        }
    }

    function saveState() {
        try {
            localStorage.setItem('sat_prep_state', JSON.stringify(state));
        } catch(e) {
            console.warn('Could not save state:', e);
        }
    }

    function updateStreak() {
        var today = new Date().toDateString();
        if (state.lastPracticeDate === today) return;
        var yesterday = new Date(Date.now() - 86400000).toDateString();
        if (state.lastPracticeDate === yesterday) {
            state.streak++;
        } else if (state.lastPracticeDate !== today) {
            state.streak = 1;
        }
        state.lastPracticeDate = today;
        saveState();
    }

    // ============================================
    // SCORE ESTIMATION
    // ============================================
    function estimateScore() {
        var answered = Object.keys(state.questionsAnswered);
        if (answered.length < 5) return state.startScore || null;

        var correct = 0;
        var total = 0;
        // Weight recent answers more heavily
        var recent = answered.slice(-50);
        for (var i = 0; i < recent.length; i++) {
            var a = state.questionsAnswered[recent[i]];
            total++;
            if (a.correct) correct++;
        }
        var pct = correct / total;
        // SAT Math scoring: roughly 200 + (pct * 600), adjusted for difficulty
        var raw = Math.round(200 + (pct * 600));
        // Smooth with previous score
        if (state.currentScore) {
            raw = Math.round(state.currentScore * 0.3 + raw * 0.7);
        }
        // Clamp to valid range
        return Math.max(200, Math.min(800, raw));
    }

    function getTopicAccuracy(topic) {
        var ts = state.topicScores[topic];
        if (!ts || ts.total === 0) return 0;
        return Math.round((ts.correct / ts.total) * 100);
    }

    function getSubtopicAccuracy(subtopic) {
        var ss = state.subtopicScores[subtopic];
        if (!ss || ss.total === 0) return 0;
        return Math.round((ss.correct / ss.total) * 100);
    }

    function getWeakestTopics() {
        var topics = ['algebra', 'advanced-math', 'problem-solving', 'geometry'];
        var scores = [];
        for (var i = 0; i < topics.length; i++) {
            scores.push({
                topic: topics[i],
                accuracy: getTopicAccuracy(topics[i]),
                total: (state.topicScores[topics[i]] || {}).total || 0
            });
        }
        scores.sort(function(a, b) { return a.accuracy - b.accuracy; });
        return scores;
    }

    function recordAnswer(questionId, isCorrect, question) {
        state.questionsAnswered[questionId] = {
            correct: isCorrect,
            timestamp: Date.now(),
            attempts: ((state.questionsAnswered[questionId] || {}).attempts || 0) + 1
        };
        // Update topic scores
        if (!state.topicScores[question.topic]) {
            state.topicScores[question.topic] = { correct: 0, total: 0 };
        }
        state.topicScores[question.topic].total++;
        if (isCorrect) state.topicScores[question.topic].correct++;
        state.topicScores[question.topic].lastPractice = Date.now();

        // Update subtopic scores
        if (!state.subtopicScores[question.subtopic]) {
            state.subtopicScores[question.subtopic] = { correct: 0, total: 0 };
        }
        state.subtopicScores[question.subtopic].total++;
        if (isCorrect) state.subtopicScores[question.subtopic].correct++;

        state.currentScore = estimateScore();
        updateStreak();
        saveState();
    }

    // ============================================
    // QUESTION UTILITIES
    // ============================================
    function getQuestions() {
        return window.SAT_QUESTIONS || [];
    }

    function getLessons() {
        return window.SAT_LESSONS || [];
    }

    function getQuestionsByTopic(topic) {
        return getQuestions().filter(function(q) { return q.topic === topic; });
    }

    function getQuestionsBySubtopic(subtopic) {
        return getQuestions().filter(function(q) { return q.subtopic === subtopic; });
    }

    function getQuestionsByDifficulty(minD, maxD) {
        return getQuestions().filter(function(q) {
            return q.difficulty >= minD && q.difficulty <= maxD;
        });
    }

    function getUnansweredQuestions(questions) {
        return questions.filter(function(q) {
            return !state.questionsAnswered[q.id];
        });
    }

    function getMissedQuestions() {
        return getQuestions().filter(function(q) {
            var a = state.questionsAnswered[q.id];
            return a && !a.correct;
        });
    }

    function shuffleArray(arr) {
        var a = arr.slice();
        for (var i = a.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp = a[i]; a[i] = a[j]; a[j] = temp;
        }
        return a;
    }

    function buildDiagnosticSet() {
        // 24 questions: 6 per topic area, mixed difficulty
        var topics = ['algebra', 'advanced-math', 'problem-solving', 'geometry'];
        var set = [];
        for (var t = 0; t < topics.length; t++) {
            var topicQs = getQuestionsByTopic(topics[t]);
            // Get 2 easy, 2 medium, 2 hard
            var easy = shuffleArray(topicQs.filter(function(q) { return q.difficulty <= 2; })).slice(0, 2);
            var med = shuffleArray(topicQs.filter(function(q) { return q.difficulty === 3; })).slice(0, 2);
            var hard = shuffleArray(topicQs.filter(function(q) { return q.difficulty >= 4; })).slice(0, 2);
            set = set.concat(easy, med, hard);
        }
        return shuffleArray(set);
    }

    function buildPracticeSet(options) {
        var questions = getQuestions();
        if (options.topic && options.topic !== 'all') {
            questions = questions.filter(function(q) { return q.topic === options.topic; });
        }
        if (options.subtopic) {
            questions = questions.filter(function(q) { return q.subtopic === options.subtopic; });
        }
        if (options.difficulty) {
            var d = options.difficulty;
            questions = questions.filter(function(q) {
                if (d === 'easy') return q.difficulty <= 2;
                if (d === 'medium') return q.difficulty === 3;
                if (d === 'hard') return q.difficulty >= 4;
                return true;
            });
        }
        if (options.missedOnly) {
            questions = getMissedQuestions();
        }
        if (options.unansweredFirst) {
            var unanswered = getUnansweredQuestions(questions);
            var answered = questions.filter(function(q) { return state.questionsAnswered[q.id]; });
            questions = shuffleArray(unanswered).concat(shuffleArray(answered));
        } else {
            questions = shuffleArray(questions);
        }
        var count = options.count || 10;
        return questions.slice(0, count);
    }

    function buildWeaknessSet() {
        // Focus on weakest subtopics
        var weakest = getWeakestTopics();
        var targetTopic = weakest.length > 0 ? weakest[0].topic : 'algebra';
        var questions = getQuestionsByTopic(targetTopic);
        // Prefer unanswered and previously missed
        var missed = questions.filter(function(q) {
            var a = state.questionsAnswered[q.id];
            return a && !a.correct;
        });
        var unanswered = getUnansweredQuestions(questions);
        var pool = shuffleArray(missed).concat(shuffleArray(unanswered));
        if (pool.length < 10) {
            pool = pool.concat(shuffleArray(questions));
        }
        // Deduplicate
        var seen = {};
        var result = [];
        for (var i = 0; i < pool.length && result.length < 10; i++) {
            if (!seen[pool[i].id]) {
                seen[pool[i].id] = true;
                result.push(pool[i]);
            }
        }
        return result;
    }

    // ============================================
    // RENDERING HELPERS
    // ============================================
    var app = document.getElementById('app');
    var nav = document.getElementById('main-nav');
    var modalOverlay = document.getElementById('modal-overlay');
    var modalContent = document.getElementById('modal-content');

    function render(html) {
        app.innerHTML = html;
        renderMath();
    }

    function renderMath() {
        if (typeof renderMathInElement === 'function') {
            try {
                renderMathInElement(app, {
                    delimiters: [
                        {left: '$$', right: '$$', display: true},
                        {left: '$', right: '$', display: false}
                    ],
                    throwOnError: false
                });
            } catch(e) {
                // KaTeX not loaded yet, try again shortly
                setTimeout(renderMath, 500);
            }
        }
    }

    function showNav() {
        nav.classList.remove('hidden');
        nav.classList.remove('nav-open');
        document.body.classList.add('has-nav');
        updateNavScore();
        updateActiveNav();
    }

    function hideNav() {
        nav.classList.add('hidden');
        nav.classList.remove('nav-open');
        document.body.classList.remove('has-nav');
    }

    // Close mobile nav when a link is clicked
    nav.addEventListener('click', function(e) {
        if (e.target.closest('.nav-links a')) {
            nav.classList.remove('nav-open');
        }
    });

    function updateNavScore() {
        var el = document.getElementById('nav-score');
        if (el) {
            el.textContent = state.currentScore || '--';
        }
    }

    function updateActiveNav() {
        var links = nav.querySelectorAll('.nav-links a');
        var hash = window.location.hash.split('/')[1] || '';
        for (var i = 0; i < links.length; i++) {
            var route = links[i].getAttribute('data-route');
            if (route === hash) {
                links[i].classList.add('active');
            } else {
                links[i].classList.remove('active');
            }
        }
    }

    function showModal(html) {
        modalContent.innerHTML = html;
        modalOverlay.classList.remove('hidden');
        renderMath();
    }

    function hideModal() {
        modalOverlay.classList.add('hidden');
    }

    modalOverlay.addEventListener('click', function(e) {
        if (e.target === modalOverlay) hideModal();
    });

    function topicLabel(topic) {
        var labels = {
            'algebra': 'Algebra',
            'advanced-math': 'Advanced Math',
            'problem-solving': 'Problem Solving & Data',
            'geometry': 'Geometry & Trig'
        };
        return labels[topic] || topic;
    }

    function topicClass(topic) {
        var classes = {
            'algebra': 'algebra',
            'advanced-math': 'advanced',
            'problem-solving': 'problem-solving',
            'geometry': 'geometry'
        };
        return classes[topic] || '';
    }

    function difficultyLabel(d) {
        var labels = ['', 'Easy', 'Medium-Easy', 'Medium', 'Medium-Hard', 'Hard'];
        return labels[d] || '';
    }

    function formatTime(seconds) {
        var m = Math.floor(seconds / 60);
        var s = seconds % 60;
        return m + ':' + (s < 10 ? '0' : '') + s;
    }

    function getStudyDay() {
        if (!state.startDate) return 1;
        var start = new Date(state.startDate);
        var now = new Date();
        var diff = Math.floor((now - start) / 86400000) + 1;
        return Math.min(diff, 30);
    }

    // ============================================
    // ROUTER
    // ============================================
    function route() {
        var hash = window.location.hash || '';
        var parts = hash.replace('#/', '').split('/');
        var page = parts[0] || '';
        var param = parts[1] || '';

        if (!state.initialized && page !== 'welcome' && page !== 'diagnostic-intro' && page !== 'diagnostic') {
            if (!state.diagnosticComplete) {
                window.location.hash = '#/welcome';
                return;
            }
        }

        switch(page) {
            case 'welcome':
                renderWelcome();
                break;
            case 'diagnostic-intro':
                renderDiagnosticIntro();
                break;
            case 'diagnostic':
                startQuiz('diagnostic');
                break;
            case 'dashboard':
                renderDashboard();
                break;
            case 'lessons':
                renderLessons();
                break;
            case 'lesson':
                renderLessonDetail(param);
                break;
            case 'practice':
                renderPracticeConfig();
                break;
            case 'start-practice':
                startQuiz('practice');
                break;
            case 'weakness-drill':
                startQuiz('weakness');
                break;
            case 'review-missed':
                startQuiz('missed');
                break;
            case 'timed-test':
                startQuiz('timed');
                break;
            case 'strategies':
                renderStrategies();
                break;
            case 'progress':
                renderProgress();
                break;
            default:
                if (state.diagnosticComplete) {
                    window.location.hash = '#/dashboard';
                } else {
                    window.location.hash = '#/welcome';
                }
        }
    }

    window.addEventListener('hashchange', route);

    // ============================================
    // WELCOME SCREEN
    // ============================================
    function renderWelcome() {
        hideNav();
        render(
            '<div class="welcome-screen fade-in">' +
                '<div class="welcome-logo">SAT MATH PREP</div>' +
                '<div class="welcome-subtitle">Your 30-Day Path to 700+</div>' +
                '<div class="welcome-card">' +
                    '<h2>Let\'s Get You There</h2>' +
                    '<p>This app is designed to take your SAT Math score from where you are now to 700+. ' +
                    'We\'ll start with a quick diagnostic to find your strengths and weaknesses, then build a personalized study plan.</p>' +
                    '<div class="welcome-features">' +
                        '<div class="welcome-feature">' +
                            '<div class="welcome-feature-icon">&#9733;</div>' +
                            '<div class="welcome-feature-text">Smart diagnostic finds your weak spots</div>' +
                        '</div>' +
                        '<div class="welcome-feature">' +
                            '<div class="welcome-feature-icon">&#9654;</div>' +
                            '<div class="welcome-feature-text">Step-by-step lessons that actually teach</div>' +
                        '</div>' +
                        '<div class="welcome-feature">' +
                            '<div class="welcome-feature-icon">&#9632;</div>' +
                            '<div class="welcome-feature-text">150+ real SAT-style practice questions</div>' +
                        '</div>' +
                        '<div class="welcome-feature">' +
                            '<div class="welcome-feature-icon">&#9650;</div>' +
                            '<div class="welcome-feature-text">Track your progress and score gains</div>' +
                        '</div>' +
                    '</div>' +
                    '<button class="btn btn-primary btn-lg btn-block" onclick="window.location.hash=\'#/diagnostic-intro\'">Start Diagnostic Test</button>' +
                    '<p style="margin-top:16px;font-size:13px;color:var(--gray-400);">Takes about 20 minutes. No time limit for the diagnostic.</p>' +
                '</div>' +
            '</div>'
        );
    }

    // ============================================
    // DIAGNOSTIC INTRO
    // ============================================
    function renderDiagnosticIntro() {
        hideNav();
        render(
            '<div class="diagnostic-intro fade-in">' +
                '<h1>Diagnostic Assessment</h1>' +
                '<p>Before we build your study plan, let\'s see where you stand. This diagnostic covers all four SAT Math topic areas. Don\'t worry about getting everything right &mdash; this is about finding where to focus your energy.</p>' +
                '<div class="diagnostic-info">' +
                    '<div class="diagnostic-info-item">' +
                        '<div class="diagnostic-info-value">24</div>' +
                        '<div class="diagnostic-info-label">Questions</div>' +
                    '</div>' +
                    '<div class="diagnostic-info-item">' +
                        '<div class="diagnostic-info-value">~20</div>' +
                        '<div class="diagnostic-info-label">Minutes</div>' +
                    '</div>' +
                    '<div class="diagnostic-info-item">' +
                        '<div class="diagnostic-info-value">4</div>' +
                        '<div class="diagnostic-info-label">Topic Areas</div>' +
                    '</div>' +
                '</div>' +
                '<p><strong>Tips:</strong> Try your best on each question. If you\'re stuck, make your best guess and move on. You\'ll see explanations after each answer.</p>' +
                '<button class="btn btn-primary btn-lg" onclick="window.location.hash=\'#/diagnostic\'">Begin Diagnostic</button>' +
                '<br><br>' +
                '<button class="btn btn-ghost" onclick="skipDiagnostic()">Skip &amp; assume ~450 score</button>' +
            '</div>'
        );
    }

    window.skipDiagnostic = function() {
        state.initialized = true;
        state.diagnosticComplete = true;
        state.startScore = 450;
        state.currentScore = 450;
        state.startDate = new Date().toISOString();
        saveState();
        window.location.hash = '#/dashboard';
    };

    // ============================================
    // QUIZ ENGINE (Diagnostic, Practice, Review)
    // ============================================
    var quizState = {
        questions: [],
        currentIndex: 0,
        answers: [],
        mode: '',       // 'diagnostic', 'practice', 'missed', 'weakness', 'timed'
        selectedChoice: null,
        answered: false,
        timerInterval: null,
        timeElapsed: 0,
        startTime: null,
        timeLimit: 0        // seconds, 0 = no limit
    };

    function startQuiz(mode) {
        if (mode === 'diagnostic') {
            hideNav();
        } else {
            showNav();
        }

        quizState.mode = mode;
        quizState.currentIndex = 0;
        quizState.answers = [];
        quizState.selectedChoice = null;
        quizState.answered = false;
        quizState.timeElapsed = 0;
        quizState.startTime = Date.now();
        quizState.timeLimit = 0;

        if (quizState.timerInterval) clearInterval(quizState.timerInterval);

        switch(mode) {
            case 'diagnostic':
                quizState.questions = buildDiagnosticSet();
                break;
            case 'practice':
                var opts = window._practiceOptions || { topic: 'all', count: 10, difficulty: 'all', unansweredFirst: true };
                if (opts._override && opts._override.length > 0) {
                    quizState.questions = opts._override;
                    delete opts._override;
                } else {
                    quizState.questions = buildPracticeSet(opts);
                }
                break;
            case 'weakness':
                quizState.questions = buildWeaknessSet();
                break;
            case 'missed':
                var missed = getMissedQuestions();
                quizState.questions = shuffleArray(missed).slice(0, 15);
                break;
            case 'timed':
                // Full SAT-style timed section: 44 questions, 70 minutes
                var timedOpts = window._practiceOptions || { topic: 'all', count: 44, difficulty: 'all', unansweredFirst: true };
                timedOpts.count = 44;
                quizState.questions = buildPracticeSet(timedOpts);
                quizState.timeLimit = 70 * 60; // 70 minutes in seconds
                break;
        }

        if (quizState.questions.length === 0) {
            render(
                '<div class="empty-state">' +
                    '<div class="empty-state-icon">&#128209;</div>' +
                    '<h3>No Questions Available</h3>' +
                    '<p>Try a different topic or difficulty setting.</p>' +
                    '<button class="btn btn-primary" onclick="window.location.hash=\'#/practice\'">Back to Practice</button>' +
                '</div>'
            );
            return;
        }

        // Start timer
        quizState.timerInterval = setInterval(function() {
            quizState.timeElapsed = Math.floor((Date.now() - quizState.startTime) / 1000);
            var timerEl = document.getElementById('quiz-timer');
            if (!timerEl) return;

            if (quizState.timeLimit > 0) {
                // Countdown timer for timed mode
                var remaining = Math.max(0, quizState.timeLimit - quizState.timeElapsed);
                timerEl.textContent = formatTime(remaining);
                timerEl.className = 'quiz-timer countdown';
                if (remaining <= 60) timerEl.className += ' danger';
                else if (remaining <= 300) timerEl.className += ' warning';
                // Auto-finish when time runs out
                if (remaining === 0) {
                    finishQuiz();
                }
            } else {
                timerEl.textContent = formatTime(quizState.timeElapsed);
                var perQ = quizState.timeElapsed / (quizState.currentIndex + 1);
                if (perQ > 120) timerEl.className = 'quiz-timer danger';
                else if (perQ > 90) timerEl.className = 'quiz-timer warning';
                else timerEl.className = 'quiz-timer';
            }
        }, 1000);

        renderQuestion();
    }

    function renderQuestion() {
        var q = quizState.questions[quizState.currentIndex];
        if (!q) {
            finishQuiz();
            return;
        }

        var pct = Math.round(((quizState.currentIndex) / quizState.questions.length) * 100);
        var modeLabel = quizState.mode === 'diagnostic' ? 'Diagnostic' : 'Practice';

        var html = '<div class="quiz-container fade-in">' +
            '<div class="quiz-header">' +
                '<div class="quiz-progress">' +
                    '<span class="quiz-progress-text">' + (quizState.currentIndex + 1) + ' / ' + quizState.questions.length + '</span>' +
                    '<div class="quiz-progress-bar"><div class="quiz-progress-fill" style="width:' + pct + '%"></div></div>' +
                '</div>' +
                '<span class="quiz-timer" id="quiz-timer">' + formatTime(quizState.timeElapsed) + '</span>' +
            '</div>' +
            '<div class="question-card">' +
                '<div class="question-meta">' +
                    '<span class="question-tag topic">' + topicLabel(q.topic) + '</span>' +
                    '<span class="question-tag difficulty-' + q.difficulty + '">' + difficultyLabel(q.difficulty) + '</span>' +
                '</div>' +
                '<div class="question-text">' + q.question + '</div>';

        if (q.type === 'mc' && q.choices) {
            html += '<div class="choices-list" id="choices-list">';
            var letters = ['A', 'B', 'C', 'D'];
            for (var i = 0; i < q.choices.length; i++) {
                html += '<button class="choice-btn" data-index="' + i + '" onclick="selectChoice(' + i + ')">' +
                    '<span class="choice-letter">' + letters[i] + '</span>' +
                    '<span class="choice-text">' + q.choices[i] + '</span>' +
                '</button>';
            }
            html += '</div>';
        } else {
            html += '<div class="grid-in-container">' +
                '<input type="text" class="grid-in-input" id="grid-in-input" placeholder="Your answer" ' +
                'onkeydown="if(event.key===\'Enter\')submitGridIn()" autocomplete="off">' +
                '<div class="grid-in-hint">Enter a number (decimals and fractions like 3/4 accepted)</div>' +
            '</div>';
        }

        html += '<div id="explanation-area"></div>' +
            '<div class="question-actions">' +
                '<div>';
        if (quizState.mode !== 'diagnostic') {
            html += '<button class="btn btn-ghost btn-sm" onclick="skipQuestion()">Skip</button>';
        }
        html += '</div>' +
                '<div id="submit-area">';
        if (q.type === 'mc') {
            html += '<button class="btn btn-primary" id="submit-btn" onclick="submitAnswer()" disabled>Check Answer</button>';
        } else {
            html += '<button class="btn btn-primary" id="submit-btn" onclick="submitGridIn()">Check Answer</button>';
        }
        html += '</div></div></div></div>';

        render(html);

        // Focus grid-in input
        if (q.type !== 'mc') {
            var input = document.getElementById('grid-in-input');
            if (input) input.focus();
        }
    }

    window.selectChoice = function(index) {
        if (quizState.answered) return;
        quizState.selectedChoice = index;
        var buttons = document.querySelectorAll('.choice-btn');
        for (var i = 0; i < buttons.length; i++) {
            buttons[i].classList.remove('selected');
        }
        buttons[index].classList.add('selected');
        var submitBtn = document.getElementById('submit-btn');
        if (submitBtn) submitBtn.disabled = false;
    };

    // Keyboard shortcuts for quiz: A/B/C/D to select, Enter to submit/next
    document.addEventListener('keydown', function(e) {
        // Only active during quiz
        if (!quizState.questions || quizState.questions.length === 0) return;
        var q = quizState.questions[quizState.currentIndex];
        if (!q) return;

        var key = e.key.toLowerCase();

        if (q.type === 'mc' && !quizState.answered) {
            var keyMap = { 'a': 0, 'b': 1, 'c': 2, 'd': 3, '1': 0, '2': 1, '3': 2, '4': 3 };
            if (keyMap[key] !== undefined && keyMap[key] < (q.choices || []).length) {
                e.preventDefault();
                window.selectChoice(keyMap[key]);
            }
        }

        if (key === 'enter') {
            e.preventDefault();
            if (quizState.answered) {
                if (quizState.currentIndex < quizState.questions.length - 1) {
                    window.nextQuestion();
                } else {
                    finishQuiz();
                }
            } else if (q.type === 'mc' && quizState.selectedChoice !== null) {
                window.submitAnswer();
            }
            // Grid-in Enter is handled by the input's onkeydown
        }
    });

    window.submitAnswer = function() {
        if (quizState.answered || quizState.selectedChoice === null) return;
        quizState.answered = true;

        var q = quizState.questions[quizState.currentIndex];
        var isCorrect = quizState.selectedChoice === q.correctAnswer;

        quizState.answers.push({
            questionId: q.id,
            correct: isCorrect,
            userAnswer: quizState.selectedChoice,
            timeSpent: quizState.timeElapsed
        });

        recordAnswer(q.id, isCorrect, q);

        // Show correct/incorrect on buttons
        var buttons = document.querySelectorAll('.choice-btn');
        for (var i = 0; i < buttons.length; i++) {
            buttons[i].onclick = null;
            if (i === q.correctAnswer) {
                buttons[i].classList.add(i === quizState.selectedChoice ? 'correct' : 'reveal-correct');
            } else if (i === quizState.selectedChoice) {
                buttons[i].classList.add('incorrect');
            }
        }

        showExplanation(q, isCorrect);
    };

    window.submitGridIn = function() {
        if (quizState.answered) return;
        var input = document.getElementById('grid-in-input');
        if (!input || !input.value.trim()) return;

        quizState.answered = true;
        var q = quizState.questions[quizState.currentIndex];
        var userVal = input.value.trim();

        // Parse user input
        var userNum;
        if (userVal.indexOf('/') !== -1) {
            var parts = userVal.split('/');
            userNum = parseFloat(parts[0]) / parseFloat(parts[1]);
        } else {
            userNum = parseFloat(userVal);
        }

        var correctVal = q.correctAnswer;
        var isCorrect = Math.abs(userNum - correctVal) < 0.01;

        quizState.answers.push({
            questionId: q.id,
            correct: isCorrect,
            userAnswer: userVal,
            timeSpent: quizState.timeElapsed
        });

        recordAnswer(q.id, isCorrect, q);

        input.classList.add(isCorrect ? 'correct' : 'incorrect');
        input.disabled = true;

        showExplanation(q, isCorrect);
    };

    function showExplanation(q, isCorrect) {
        var area = document.getElementById('explanation-area');
        if (!area) return;

        var html = '<div class="explanation-box">' +
            '<div class="explanation-header">' +
                (isCorrect ? '&#10003; Correct!' : '&#10007; Not quite.') +
            '</div>' +
            '<div class="explanation-text">';

        // Format explanation with steps
        var expText = q.explanation || '';
        var lines = expText.split('\n');
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();
            if (line) {
                if (line.match(/^step\s*\d/i) || line.match(/^\d+[\.\)]/)) {
                    html += '<div class="step">' + line + '</div>';
                } else {
                    html += '<p>' + line + '</p>';
                }
            }
        }
        html += '</div>';

        if (q.strategy) {
            html += '<div class="explanation-strategy"><strong>SAT Strategy Tip</strong>' + q.strategy + '</div>';
        }
        if (q.commonMistake && !isCorrect) {
            html += '<div class="explanation-mistake"><strong>Common Mistake: </strong>' + q.commonMistake + '</div>';
        }

        html += '</div>';

        area.innerHTML = html;

        // Replace submit button with next button
        var submitArea = document.getElementById('submit-area');
        if (submitArea) {
            if (quizState.currentIndex < quizState.questions.length - 1) {
                submitArea.innerHTML = '<button class="btn btn-primary" onclick="nextQuestion()">Next Question &#8594;</button>';
            } else {
                submitArea.innerHTML = '<button class="btn btn-success btn-lg" onclick="finishQuiz()">See Results</button>';
            }
        }

        renderMath();
    }

    window.nextQuestion = function() {
        quizState.currentIndex++;
        quizState.selectedChoice = null;
        quizState.answered = false;
        renderQuestion();
    };

    window.skipQuestion = function() {
        quizState.currentIndex++;
        quizState.selectedChoice = null;
        quizState.answered = false;
        if (quizState.currentIndex >= quizState.questions.length) {
            finishQuiz();
        } else {
            renderQuestion();
        }
    };

    function finishQuiz() {
        if (quizState.timerInterval) {
            clearInterval(quizState.timerInterval);
            quizState.timerInterval = null;
        }

        var correct = 0;
        var total = quizState.answers.length;
        var byTopic = {};

        for (var i = 0; i < quizState.answers.length; i++) {
            var a = quizState.answers[i];
            if (a.correct) correct++;

            var q = quizState.questions.filter(function(qq) { return qq.id === a.questionId; })[0];
            if (q) {
                if (!byTopic[q.topic]) byTopic[q.topic] = { correct: 0, total: 0 };
                byTopic[q.topic].total++;
                if (a.correct) byTopic[q.topic].correct++;
            }
        }

        var pct = total > 0 ? Math.round((correct / total) * 100) : 0;
        var estScore = Math.round(200 + (pct / 100) * 600);

        // Save practice history
        state.practiceHistory.push({
            date: new Date().toLocaleDateString(),
            score: correct,
            total: total,
            pct: pct,
            mode: quizState.mode,
            timestamp: Date.now()
        });

        if (quizState.mode === 'diagnostic') {
            state.initialized = true;
            state.diagnosticComplete = true;
            state.startScore = estScore;
            state.currentScore = estScore;
            state.startDate = new Date().toISOString();
            state.diagnosticResults = { correct: correct, total: total, pct: pct, byTopic: byTopic };
        }

        state.currentScore = estimateScore() || estScore;
        saveState();

        showNav();
        updateNavScore();

        // Build results HTML
        var circumference = 2 * Math.PI * 85;
        var dashOffset = circumference - (pct / 100) * circumference;

        var html = '<div class="results-container fade-in">' +
            '<h1 class="page-title text-center">' +
                (quizState.mode === 'diagnostic' ? 'Diagnostic Results' : 'Practice Results') +
            '</h1>' +
            '<div class="results-score-ring">' +
                '<svg viewBox="0 0 200 200">' +
                    '<circle class="bg" cx="100" cy="100" r="85"/>' +
                    '<circle class="fill" cx="100" cy="100" r="85" stroke-dasharray="' + circumference + '" stroke-dashoffset="' + dashOffset + '"/>' +
                '</svg>' +
                '<div class="results-score-text">' +
                    '<div class="results-pct">' + pct + '%</div>' +
                    '<div class="results-label">Accuracy</div>' +
                '</div>' +
            '</div>' +
            '<div class="results-stats">' +
                '<div class="results-stat">' +
                    '<div class="results-stat-value correct">' + correct + '</div>' +
                    '<div class="results-stat-label">Correct</div>' +
                '</div>' +
                '<div class="results-stat">' +
                    '<div class="results-stat-value incorrect">' + (total - correct) + '</div>' +
                    '<div class="results-stat-label">Incorrect</div>' +
                '</div>' +
                '<div class="results-stat">' +
                    '<div class="results-stat-value time">' + formatTime(quizState.timeElapsed) + '</div>' +
                    '<div class="results-stat-label">Time</div>' +
                '</div>' +
            '</div>';

        if (quizState.mode === 'diagnostic') {
            html += '<div class="card card-padded mb-24" style="text-align:center">' +
                '<h3 style="margin-bottom:8px">Estimated SAT Math Score</h3>' +
                '<div style="font-size:56px;font-weight:800;background:linear-gradient(135deg,var(--primary),var(--secondary));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">' + estScore + '</div>' +
                '<p style="color:var(--gray-500);margin-top:8px">Target: 700+ | We\'ll get you there.</p>' +
            '</div>';
        }

        // Topic breakdown
        html += '<div class="results-breakdown card card-padded mb-24">' +
            '<h3>Performance by Topic</h3>';

        var topics = ['algebra', 'advanced-math', 'problem-solving', 'geometry'];
        for (var t = 0; t < topics.length; t++) {
            var topicData = byTopic[topics[t]] || { correct: 0, total: 0 };
            var topicPct = topicData.total > 0 ? Math.round((topicData.correct / topicData.total) * 100) : 0;
            var barColor = topicPct >= 80 ? 'var(--success)' : topicPct >= 50 ? 'var(--warning)' : 'var(--danger)';

            html += '<div class="results-topic-row">' +
                '<span class="results-topic-name">' + topicLabel(topics[t]) + '</span>' +
                '<div class="results-topic-bar">' +
                    '<div class="progress-bar"><div class="progress-fill" style="width:' + topicPct + '%;background:' + barColor + '"></div></div>' +
                '</div>' +
                '<span class="results-topic-score">' + topicData.correct + '/' + topicData.total + '</span>' +
            '</div>';
        }

        html += '</div>';

        // Recommendations
        var weak = getWeakestTopics();
        html += '<div class="card card-padded mb-24">' +
            '<h3 style="margin-bottom:12px">Your Study Plan</h3>' +
            '<p style="color:var(--gray-600);margin-bottom:16px">Based on your results, here\'s where to focus:</p>';

        if (weak.length > 0 && weak[0].total > 0) {
            html += '<div style="padding:12px 16px;background:var(--danger-bg);border-radius:8px;margin-bottom:8px">' +
                '<strong style="color:var(--danger)">Priority Focus:</strong> <span style="color:var(--gray-700)">' + topicLabel(weak[0].topic) + ' (' + weak[0].accuracy + '% accuracy)</span></div>';
        }
        if (weak.length > 1 && weak[1].total > 0) {
            html += '<div style="padding:12px 16px;background:var(--warning-bg);border-radius:8px;margin-bottom:8px">' +
                '<strong style="color:var(--warning)">Secondary Focus:</strong> <span style="color:var(--gray-700)">' + topicLabel(weak[1].topic) + ' (' + weak[1].accuracy + '% accuracy)</span></div>';
        }

        html += '<p style="color:var(--gray-500);font-size:14px;margin-top:12px">Start with the lessons for your weakest topics, then drill with practice questions.</p>';
        html += '</div>';

        html += '<div class="results-actions">' +
            '<button class="btn btn-primary btn-lg" onclick="window.location.hash=\'#/dashboard\'">Go to Dashboard</button>' +
            '<button class="btn btn-secondary" onclick="window.location.hash=\'#/lessons\'">Start Learning</button>' +
        '</div></div>';

        render(html);
    }

    // ============================================
    // DASHBOARD
    // ============================================
    function renderDashboard() {
        showNav();
        var score = state.currentScore || '--';
        var answered = Object.keys(state.questionsAnswered).length;
        var totalQ = getQuestions().length;
        var accuracy = answered > 0 ?
            Math.round((Object.values(state.questionsAnswered).filter(function(a) { return a.correct; }).length / answered) * 100) : 0;
        var day = getStudyDay();

        var html = '<div class="fade-in">' +
            '<div class="dashboard-header">' +
                '<h1>Welcome Back</h1>' +
                '<p>Day ' + day + ' of 30 &mdash; Keep pushing toward 700+!</p>' +
            '</div>' +
            '<div class="dashboard-grid">' +
                '<div class="stat-card">' +
                    '<div class="stat-label">Est. Math Score</div>' +
                    '<div class="stat-value score">' + score + '</div>' +
                    (state.startScore ? '<div class="stat-change up">&#9650; ' + Math.max(0, (state.currentScore || 0) - state.startScore) + ' pts from start</div>' : '') +
                '</div>' +
                '<div class="stat-card">' +
                    '<div class="stat-label">Questions Done</div>' +
                    '<div class="stat-value">' + answered + '</div>' +
                    '<div class="stat-detail">of ' + totalQ + ' available</div>' +
                '</div>' +
                '<div class="stat-card">' +
                    '<div class="stat-label">Accuracy</div>' +
                    '<div class="stat-value">' + accuracy + '%</div>' +
                    '<div class="stat-detail">overall average</div>' +
                '</div>' +
                '<div class="stat-card">' +
                    '<div class="stat-label">Study Streak</div>' +
                    '<div class="stat-value">' + (state.streak || 0) + '</div>' +
                    '<div class="stat-detail">day' + (state.streak !== 1 ? 's' : '') + ' in a row</div>' +
                '</div>' +
            '</div>';

        html += '<div class="dashboard-main">' +
            '<div>';

        // Today's Tasks
        html += '<div class="card mb-24">' +
            '<div class="card-header"><h3>Today\'s Study Plan</h3></div>' +
            '<div class="card-body">' +
                '<ul class="task-list">';

        // Generate smart daily tasks
        var weak = getWeakestTopics();
        var missedCount = getMissedQuestions().length;
        var weakTopic = weak.length > 0 && weak[0].total > 0 ? weak[0] : null;

        // Task 1: Lesson for weakest area
        if (weakTopic) {
            var lessons = getLessons().filter(function(l) { return l.topic === weakTopic.topic; });
            var nextLesson = lessons.filter(function(l) { return state.lessonsCompleted.indexOf(l.id) === -1; })[0] || lessons[0];
            if (nextLesson) {
                html += '<li class="task-item" onclick="window.location.hash=\'#/lesson/' + nextLesson.id + '\'">' +
                    '<div class="task-icon lesson">&#9733;</div>' +
                    '<div class="task-info">' +
                        '<div class="task-title">Study: ' + nextLesson.title + '</div>' +
                        '<div class="task-desc">Focus area &mdash; ' + topicLabel(weakTopic.topic) + ' (' + weakTopic.accuracy + '% accuracy)</div>' +
                    '</div>' +
                    '<span class="task-arrow">&#8250;</span>' +
                '</li>';
            }
        }

        // Task 2: Weakness drill
        html += '<li class="task-item" onclick="window.location.hash=\'#/weakness-drill\'">' +
            '<div class="task-icon practice">&#9654;</div>' +
            '<div class="task-info">' +
                '<div class="task-title">Weakness Drill (10 questions)</div>' +
                '<div class="task-desc">Targeted practice on your weakest areas</div>' +
            '</div>' +
            '<span class="task-arrow">&#8250;</span>' +
        '</li>';

        // Task 3: Review missed (if any)
        if (missedCount > 0) {
            html += '<li class="task-item" onclick="window.location.hash=\'#/review-missed\'">' +
                '<div class="task-icon review">&#9888;</div>' +
                '<div class="task-info">' +
                    '<div class="task-title">Review Missed Questions (' + missedCount + ')</div>' +
                    '<div class="task-desc">Re-attempt questions you got wrong</div>' +
                '</div>' +
                '<span class="task-arrow">&#8250;</span>' +
            '</li>';
        }

        // Task 4: General practice
        html += '<li class="task-item" onclick="window.location.hash=\'#/practice\'">' +
            '<div class="task-icon test">&#9632;</div>' +
            '<div class="task-info">' +
                '<div class="task-title">Custom Practice Session</div>' +
                '<div class="task-desc">Choose topic, difficulty, and number of questions</div>' +
            '</div>' +
            '<span class="task-arrow">&#8250;</span>' +
        '</li>';

        html += '</ul></div></div>';

        // Quick Actions
        html += '<div class="card">' +
            '<div class="card-header"><h3>Quick Actions</h3></div>' +
            '<div class="card-body" style="display:flex;flex-direction:column;gap:8px">' +
                '<button class="btn btn-primary btn-block" onclick="quickPractice(\'all\')">Quick 10: All Topics</button>' +
                '<button class="btn btn-secondary btn-block" onclick="quickPractice(\'algebra\')">Quick 10: Algebra</button>' +
                '<button class="btn btn-secondary btn-block" onclick="quickPractice(\'advanced-math\')">Quick 10: Advanced Math</button>' +
                '<button class="btn btn-secondary btn-block" onclick="quickPractice(\'problem-solving\')">Quick 10: Problem Solving</button>' +
                '<button class="btn btn-secondary btn-block" onclick="quickPractice(\'geometry\')">Quick 10: Geometry</button>' +
            '</div>' +
        '</div>';

        html += '</div>'; // end left column

        // Right column: Topic progress + streak
        html += '<div>';

        // Streak
        if (state.streak > 0) {
            html += '<div class="streak-display">' +
                '<div class="streak-flame">&#128293;</div>' +
                '<div class="streak-info">' +
                    '<h3>' + state.streak + ' Day Streak!</h3>' +
                    '<p>Keep it going &mdash; consistency is key.</p>' +
                '</div>' +
            '</div>';
        }

        // Topic Progress
        html += '<div class="card card-padded mb-24">' +
            '<h3 style="margin-bottom:16px">Topic Mastery</h3>';

        var topics = ['algebra', 'advanced-math', 'problem-solving', 'geometry'];
        for (var i = 0; i < topics.length; i++) {
            var acc = getTopicAccuracy(topics[i]);
            var ts = state.topicScores[topics[i]] || { total: 0 };
            html += '<div class="topic-progress-item">' +
                '<div class="topic-progress-header">' +
                    '<span class="topic-progress-name">' + topicLabel(topics[i]) + '</span>' +
                    '<span class="topic-progress-pct">' + acc + '%</span>' +
                '</div>' +
                '<div class="progress-bar"><div class="progress-fill ' + topicClass(topics[i]) + '" style="width:' + acc + '%"></div></div>' +
                '<div style="font-size:11px;color:var(--gray-400);margin-top:2px">' + ts.total + ' questions attempted</div>' +
            '</div>';
        }

        html += '</div>';

        // Score Target
        html += '<div class="card card-padded">' +
            '<h3 style="margin-bottom:12px">Score Target</h3>' +
            '<div style="text-align:center">' +
                '<div style="font-size:13px;color:var(--gray-500)">Current</div>' +
                '<div style="font-size:40px;font-weight:800;color:var(--primary)">' + (state.currentScore || '--') + '</div>' +
                '<div style="font-size:24px;color:var(--gray-300);margin:4px 0">&#8595;</div>' +
                '<div style="font-size:13px;color:var(--gray-500)">Target</div>' +
                '<div style="font-size:40px;font-weight:800;color:var(--success)">700+</div>' +
            '</div>';

        if (state.currentScore && state.currentScore < 700) {
            var gap = 700 - state.currentScore;
            html += '<p style="text-align:center;font-size:14px;color:var(--gray-500);margin-top:12px">' + gap + ' points to go. You\'ve got this!</p>';
        } else if (state.currentScore >= 700) {
            html += '<p style="text-align:center;font-size:14px;color:var(--success);font-weight:600;margin-top:12px">Target reached! Keep practicing to lock it in.</p>';
        }

        html += '</div>';
        html += '</div>'; // end right column
        html += '</div>'; // end dashboard-main
        html += '</div>'; // end fade-in

        render(html);
    }

    window.quickPractice = function(topic) {
        window._practiceOptions = { topic: topic, count: 10, difficulty: 'all', unansweredFirst: true };
        window.location.hash = '#/start-practice';
    };

    // ============================================
    // LESSONS LIST
    // ============================================
    function renderLessons() {
        showNav();
        var lessons = getLessons();

        var html = '<div class="fade-in">' +
            '<h1 class="page-title">Lessons</h1>' +
            '<p class="page-subtitle">Master each topic step by step. Start with your weakest areas.</p>' +
            '<div class="lessons-grid">';

        for (var i = 0; i < lessons.length; i++) {
            var l = lessons[i];
            var status = 'not-started';
            var statusText = 'Not Started';
            if (state.lessonsCompleted.indexOf(l.id) !== -1) {
                status = 'completed';
                statusText = 'Completed';
            } else if (state.lessonsStarted.indexOf(l.id) !== -1) {
                status = 'in-progress';
                statusText = 'In Progress';
            }

            var diffDots = '';
            for (var d = 1; d <= 3; d++) {
                var filled = d <= l.difficulty;
                var cls = filled ? (l.difficulty >= 3 ? 'filled hard' : l.difficulty >= 2 ? 'filled medium' : 'filled') : '';
                diffDots += '<div class="diff-dot ' + cls + '"></div>';
            }

            html += '<div class="lesson-card" onclick="window.location.hash=\'#/lesson/' + l.id + '\'">' +
                '<div class="lesson-card-accent ' + topicClass(l.topic) + '"></div>' +
                '<div class="lesson-card-body">' +
                    '<div class="lesson-card-topic">' + topicLabel(l.topic) + '</div>' +
                    '<div class="lesson-card-title">' + l.title + '</div>' +
                    '<div class="lesson-card-desc">' + (l.description || '') + '</div>' +
                    '<div class="lesson-card-footer">' +
                        '<div class="lesson-card-difficulty">' + diffDots + '</div>' +
                        '<span class="lesson-card-status ' + status + '">' + statusText + '</span>' +
                    '</div>' +
                '</div>' +
            '</div>';
        }

        html += '</div></div>';
        render(html);
    }

    // ============================================
    // LESSON DETAIL
    // ============================================
    function renderLessonDetail(lessonId) {
        showNav();
        var lesson = getLessons().filter(function(l) { return l.id === lessonId; })[0];
        if (!lesson) {
            render('<div class="empty-state"><h3>Lesson not found</h3><button class="btn btn-primary" onclick="window.location.hash=\'#/lessons\'">Back to Lessons</button></div>');
            return;
        }

        // Mark as started
        if (state.lessonsStarted.indexOf(lessonId) === -1) {
            state.lessonsStarted.push(lessonId);
            saveState();
        }

        var html = '<div class="lesson-detail fade-in">' +
            '<div class="lesson-detail-header">' +
                '<span class="lesson-back" onclick="window.location.hash=\'#/lessons\'">&#8592; Back to Lessons</span>' +
                '<h1 class="lesson-detail-title">' + lesson.title + '</h1>' +
                '<div class="lesson-detail-subtitle">' + topicLabel(lesson.topic) + ' &bull; ~' + (lesson.estimatedMinutes || 20) + ' min</div>' +
            '</div>' +
            '<div class="lesson-content">' + (lesson.content || '<p>Lesson content loading...</p>') + '</div>';

        // Key formulas
        if (lesson.keyFormulas && lesson.keyFormulas.length > 0) {
            html += '<div class="card card-padded mb-24">' +
                '<h3 style="margin-bottom:12px">Key Formulas & Rules</h3>' +
                '<ul>';
            for (var i = 0; i < lesson.keyFormulas.length; i++) {
                html += '<li style="margin-bottom:8px;font-size:15px">' + lesson.keyFormulas[i] + '</li>';
            }
            html += '</ul></div>';
        }

        // Practice with related questions
        html += '<div class="card card-padded mb-24">' +
            '<h3 style="margin-bottom:12px">Practice These Concepts</h3>' +
            '<p style="color:var(--gray-500);font-size:14px;margin-bottom:16px">Ready to test your understanding? Try practice questions on this topic.</p>' +
            '<div style="display:flex;gap:12px;flex-wrap:wrap">' +
                '<button class="btn btn-primary" onclick="practiceFromLesson(\'' + lesson.topic + '\', \'' + (lesson.id || '') + '\')">Practice This Topic (10 Qs)</button>' +
                '<button class="btn btn-secondary" onclick="markLessonComplete(\'' + lessonId + '\')">Mark as Complete</button>' +
            '</div>' +
        '</div>';

        html += '</div>';
        render(html);
    }

    window.practiceFromLesson = function(topic, lessonId) {
        // Use the lesson's questionIds to build a targeted practice set
        var lesson = getLessons().filter(function(l) { return l.id === lessonId; })[0];
        if (lesson && lesson.questionIds && lesson.questionIds.length > 0) {
            var lessonQs = getQuestions().filter(function(q) {
                return lesson.questionIds.indexOf(q.id) !== -1;
            });
            // Also add more from same topic to reach 10
            if (lessonQs.length < 10) {
                var topicQs = getQuestionsByTopic(topic).filter(function(q) {
                    return lesson.questionIds.indexOf(q.id) === -1;
                });
                lessonQs = lessonQs.concat(shuffleArray(topicQs).slice(0, 10 - lessonQs.length));
            }
            window._practiceOptions = { topic: topic, count: 10, difficulty: 'all', unansweredFirst: true, _override: lessonQs };
        } else {
            window._practiceOptions = { topic: topic, count: 10, difficulty: 'all', unansweredFirst: true };
        }
        window.location.hash = '#/start-practice';
    };

    window.markLessonComplete = function(lessonId) {
        if (state.lessonsCompleted.indexOf(lessonId) === -1) {
            state.lessonsCompleted.push(lessonId);
            saveState();
        }
        showModal(
            '<div style="text-align:center">' +
                '<div style="font-size:48px;margin-bottom:16px">&#10003;</div>' +
                '<h2 style="margin-bottom:8px">Lesson Complete!</h2>' +
                '<p style="color:var(--gray-500);margin-bottom:24px">Great work. Now practice these concepts to lock them in.</p>' +
                '<button class="btn btn-primary" onclick="hideModal();window.location.hash=\'#/lessons\'">Back to Lessons</button>' +
            '</div>'
        );
    };

    // ============================================
    // PRACTICE CONFIG
    // ============================================
    function renderPracticeConfig() {
        showNav();
        var html = '<div class="practice-config fade-in">' +
            '<h1 class="page-title text-center">Practice Session</h1>' +
            '<p class="page-subtitle text-center">Configure your practice to target exactly what you need.</p>' +
            '<div class="card card-padded">' +
                '<div class="config-section">' +
                    '<h3>Topic</h3>' +
                    '<div class="config-options" id="topic-options">' +
                        '<button class="config-option selected" data-value="all" onclick="setConfig(\'topic\', \'all\', this)">All Topics</button>' +
                        '<button class="config-option" data-value="algebra" onclick="setConfig(\'topic\', \'algebra\', this)">Algebra</button>' +
                        '<button class="config-option" data-value="advanced-math" onclick="setConfig(\'topic\', \'advanced-math\', this)">Advanced Math</button>' +
                        '<button class="config-option" data-value="problem-solving" onclick="setConfig(\'topic\', \'problem-solving\', this)">Problem Solving</button>' +
                        '<button class="config-option" data-value="geometry" onclick="setConfig(\'topic\', \'geometry\', this)">Geometry</button>' +
                    '</div>' +
                '</div>' +
                '<div class="config-section">' +
                    '<h3>Difficulty</h3>' +
                    '<div class="config-options" id="diff-options">' +
                        '<button class="config-option selected" data-value="all" onclick="setConfig(\'difficulty\', \'all\', this)">All Levels</button>' +
                        '<button class="config-option" data-value="easy" onclick="setConfig(\'difficulty\', \'easy\', this)">Easy</button>' +
                        '<button class="config-option" data-value="medium" onclick="setConfig(\'difficulty\', \'medium\', this)">Medium</button>' +
                        '<button class="config-option" data-value="hard" onclick="setConfig(\'difficulty\', \'hard\', this)">Hard</button>' +
                    '</div>' +
                '</div>' +
                '<div class="config-section">' +
                    '<h3>Number of Questions</h3>' +
                    '<div class="config-options" id="count-options">' +
                        '<button class="config-option" data-value="5" onclick="setConfig(\'count\', 5, this)">5</button>' +
                        '<button class="config-option selected" data-value="10" onclick="setConfig(\'count\', 10, this)">10</button>' +
                        '<button class="config-option" data-value="20" onclick="setConfig(\'count\', 20, this)">20</button>' +
                        '<button class="config-option" data-value="44" onclick="setConfig(\'count\', 44, this)">Full Test (44)</button>' +
                    '</div>' +
                '</div>' +
                '<div style="margin-top:28px;display:flex;gap:12px;justify-content:center">' +
                    '<button class="btn btn-primary btn-lg" onclick="launchPractice()">Start Practice</button>' +
                '</div>' +
            '</div>' +
            '<div style="margin-top:24px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap">' +
                '<button class="btn btn-secondary" onclick="window.location.hash=\'#/weakness-drill\'">Weakness Drill (Auto)</button>' +
                '<button class="btn btn-secondary" onclick="window.location.hash=\'#/review-missed\'">Review Missed Questions</button>' +
            '</div>' +
            '<div class="card card-padded" style="margin-top:24px;text-align:center">' +
                '<h3 style="margin-bottom:8px">Simulate Test Conditions</h3>' +
                '<p style="color:var(--gray-500);font-size:14px;margin-bottom:16px">44 questions, 70-minute countdown &mdash; just like the real SAT Math section.</p>' +
                '<button class="btn btn-success btn-lg" onclick="window.location.hash=\'#/timed-test\'">Start Timed Test</button>' +
            '</div>' +
        '</div>';

        render(html);

        // Initialize config state
        window._practiceConfig = { topic: 'all', difficulty: 'all', count: 10 };
    }

    window._practiceConfig = { topic: 'all', difficulty: 'all', count: 10 };

    window.setConfig = function(key, value, btn) {
        window._practiceConfig[key] = value;
        // Update UI
        var parent = btn.parentElement;
        var siblings = parent.querySelectorAll('.config-option');
        for (var i = 0; i < siblings.length; i++) {
            siblings[i].classList.remove('selected');
        }
        btn.classList.add('selected');
    };

    window.launchPractice = function() {
        window._practiceOptions = {
            topic: window._practiceConfig.topic,
            difficulty: window._practiceConfig.difficulty,
            count: window._practiceConfig.count,
            unansweredFirst: true
        };
        window.location.hash = '#/start-practice';
    };

    // ============================================
    // STRATEGIES
    // ============================================
    function renderStrategies() {
        showNav();
        var strategies = [
            {
                title: "The 2-Minute Rule",
                body: "<p>On the SAT, you get about 1 minute 35 seconds per question. If you've spent 2 minutes on a question and aren't close to an answer, <strong>make your best guess and move on</strong>.</p><p>Here's why: easier questions are worth the same as harder ones. Spending 4 minutes on one hard question means losing time on two easy questions you would've gotten right.</p><ul><li>First pass: do every question you can solve in under 90 seconds</li><li>Second pass: go back to the ones you skipped</li><li>Never leave a question blank (no penalty for guessing)</li></ul>"
            },
            {
                title: "Plug In Answers (PIA)",
                body: "<p>When the answer choices are numbers, try plugging them back into the question. Start with choice B or C (the middle values) to save time.</p><p><strong>When to use it:</strong> When the question asks \"What is the value of $x$?\" and gives you four numerical options.</p><ul><li>Start with a middle answer choice</li><li>Plug it into the equation or condition</li><li>If it works, you're done. If it's too big, try smaller. If too small, try bigger.</li></ul>"
            },
            {
                title: "Pick Smart Numbers",
                body: "<p>When a problem uses variables but no specific numbers, <strong>pick easy numbers</strong> to substitute in. This turns abstract algebra into simple arithmetic.</p><ul><li>Pick small numbers: 2, 3, 5 are great choices</li><li>Avoid 0 and 1 (they have special properties)</li><li>For percents, use 100</li><li>For \"what fraction of,\" use the denominator as your total</li></ul><p>After picking numbers, work through the problem AND check which answer choice gives the same result with your numbers.</p>"
            },
            {
                title: "Process of Elimination",
                body: "<p>Even if you can't solve a problem, you can often eliminate 1-2 wrong answers. This dramatically improves your guessing odds.</p><ul><li>4 choices, random guess = 25% chance</li><li>Eliminate 1 = 33% chance</li><li>Eliminate 2 = 50% chance</li></ul><p><strong>Common eliminations:</strong></p><ul><li>The answer can't be negative if the question asks for a length</li><li>The answer should be in a reasonable range (if someone drives 30 mph for 2 hours, the answer isn't 600 miles)</li><li>If the question asks for $x + 3$ and you find $x = 5$, the answer is 8, not 5</li></ul>"
            },
            {
                title: "Read What They're Actually Asking",
                body: "<p><strong>The #1 source of wrong answers</strong> is not reading the question carefully. The SAT deliberately asks for things like:</p><ul><li>$2x$ instead of $x$</li><li>$x + 3$ instead of $x$</li><li>\"How many MORE\" instead of \"how many total\"</li><li>\"Which is NOT\" or \"EXCEPT\"</li></ul><p><strong>Before picking your answer:</strong> Re-read the last line of the question. Make sure you're answering what they asked, not what you think they asked.</p>"
            },
            {
                title: "Use Your Calculator Wisely",
                body: "<p>The Digital SAT has a built-in Desmos calculator. Learn to use it for:</p><ul><li><strong>Graphing equations</strong> to find intersections (solves systems visually)</li><li><strong>Checking your algebra</strong> after solving by hand</li><li><strong>Testing values</strong> quickly when plugging in answers</li></ul><p>But don't over-rely on it. Many problems are faster by hand. The calculator is a tool, not a crutch.</p>"
            },
            {
                title: "Master the Most Common Patterns",
                body: "<p>80% of SAT Math comes from a small set of patterns. Master these and you master the test:</p><ul><li><strong>Linear equations:</strong> Solve for x, slope-intercept form, systems</li><li><strong>Percentages:</strong> \"What is 30% of 200?\" \"15 is what percent of 60?\"</li><li><strong>Ratios:</strong> If the ratio is 2:3 and total is 25...</li><li><strong>Quadratics:</strong> Factor, use the formula, find the vertex</li><li><strong>Right triangles:</strong> Pythagorean theorem, 30-60-90, 45-45-90</li></ul><p>These topics alone cover roughly 70% of the test.</p>"
            },
            {
                title: "The 30-Day Game Plan",
                body: "<p>Here's how to structure your month of prep:</p><p><strong>Week 1 (Foundation):</strong> Linear equations, graphing, systems. Get 90%+ accuracy on easy/medium questions.</p><p><strong>Week 2 (Core Skills):</strong> Ratios, percents, statistics, quadratics. Expand your comfort zone.</p><p><strong>Week 3 (Level Up):</strong> Functions, exponents, geometry. Tackle medium-hard questions.</p><p><strong>Week 4 (Peak Performance):</strong> Full practice tests, review mistakes, refine strategies. Focus on weak spots.</p><p><strong>Daily minimum:</strong> 30 minutes of focused practice. Quality over quantity.</p>"
            }
        ];

        var html = '<div class="strategies-container fade-in">' +
            '<h1 class="page-title">Test-Taking Strategies</h1>' +
            '<p class="page-subtitle">These strategies can boost your score by 50+ points even without learning new math.</p>';

        for (var i = 0; i < strategies.length; i++) {
            html += '<div class="strategy-card' + (i === 0 ? ' open' : '') + '" id="strategy-' + i + '">' +
                '<div class="strategy-header" onclick="toggleStrategy(' + i + ')">' +
                    '<div class="strategy-number">' + (i + 1) + '</div>' +
                    '<div class="strategy-title">' + strategies[i].title + '</div>' +
                    '<div class="strategy-toggle">&#9660;</div>' +
                '</div>' +
                '<div class="strategy-body">' + strategies[i].body + '</div>' +
            '</div>';
        }

        html += '</div>';
        render(html);
    }

    window.toggleStrategy = function(index) {
        var card = document.getElementById('strategy-' + index);
        if (card) card.classList.toggle('open');
    };

    // ============================================
    // PROGRESS VIEW
    // ============================================
    function renderProgress() {
        showNav();
        var score = state.currentScore || '--';
        var startScore = state.startScore || '--';

        var html = '<div class="progress-container fade-in">' +
            '<div class="progress-header">' +
                '<h1>Your Progress</h1>' +
                '<div class="score-journey">' +
                    '<div class="score-point">' +
                        '<div class="score-point-value start">' + startScore + '</div>' +
                        '<div class="score-point-label">Starting Score</div>' +
                    '</div>' +
                    '<div class="score-arrow">&#8594;</div>' +
                    '<div class="score-point">' +
                        '<div class="score-point-value current">' + score + '</div>' +
                        '<div class="score-point-label">Current Score</div>' +
                    '</div>' +
                    '<div class="score-arrow">&#8594;</div>' +
                    '<div class="score-point">' +
                        '<div class="score-point-value target">700+</div>' +
                        '<div class="score-point-label">Target Score</div>' +
                    '</div>' +
                '</div>' +
            '</div>';

        // Practice History Chart
        var history = state.practiceHistory || [];
        if (history.length > 0) {
            html += '<div class="history-chart">' +
                '<h3 style="margin-bottom:16px">Practice Session History</h3>' +
                '<div class="chart-bar-container">';

            var recent = history.slice(-12);
            for (var i = 0; i < recent.length; i++) {
                var h = recent[i];
                var barHeight = Math.max(10, (h.pct / 100) * 160);
                html += '<div class="chart-bar-wrapper">' +
                    '<div class="chart-bar-value">' + h.pct + '%</div>' +
                    '<div class="chart-bar" style="height:' + barHeight + 'px"></div>' +
                    '<div class="chart-bar-label">' + (h.date || '').replace(/^\d+\//, '').replace(/\/\d+$/, '') + '</div>' +
                '</div>';
            }

            html += '</div></div>';
        }

        // Topic Breakdown
        html += '<div class="card card-padded mb-24">' +
            '<h3 style="margin-bottom:16px">Topic Breakdown</h3>';

        var topics = ['algebra', 'advanced-math', 'problem-solving', 'geometry'];
        for (var t = 0; t < topics.length; t++) {
            var acc = getTopicAccuracy(topics[t]);
            var ts = state.topicScores[topics[t]] || { correct: 0, total: 0 };
            var color = acc >= 80 ? 'var(--success)' : acc >= 50 ? 'var(--warning)' : 'var(--danger)';

            html += '<div class="topic-progress-item">' +
                '<div class="topic-progress-header">' +
                    '<span class="topic-progress-name">' + topicLabel(topics[t]) + '</span>' +
                    '<span class="topic-progress-pct">' + ts.correct + '/' + ts.total + ' (' + acc + '%)</span>' +
                '</div>' +
                '<div class="progress-bar"><div class="progress-fill" style="width:' + acc + '%;background:' + color + '"></div></div>' +
            '</div>';
        }

        html += '</div>';

        // Subtopic Detail
        html += '<div class="card card-padded mb-24">' +
            '<h3 style="margin-bottom:16px">Subtopic Detail</h3>';

        var subtopics = {};
        var allQs = getQuestions();
        for (var q = 0; q < allQs.length; q++) {
            if (!subtopics[allQs[q].subtopic]) {
                subtopics[allQs[q].subtopic] = { title: allQs[q].title || allQs[q].subtopic, topic: allQs[q].topic };
            }
        }

        var stKeys = Object.keys(subtopics);
        for (var s = 0; s < stKeys.length; s++) {
            var st = stKeys[s];
            var sAcc = getSubtopicAccuracy(st);
            var sData = state.subtopicScores[st] || { correct: 0, total: 0 };
            if (sData.total === 0) continue;
            var sColor = sAcc >= 80 ? 'var(--success)' : sAcc >= 50 ? 'var(--warning)' : 'var(--danger)';

            html += '<div style="display:flex;align-items:center;padding:8px 0;border-bottom:1px solid var(--gray-100)">' +
                '<span style="flex:1;font-size:14px;font-weight:500;color:var(--gray-700)">' + subtopics[st].title + '</span>' +
                '<span style="font-size:13px;color:' + sColor + ';font-weight:600;width:80px;text-align:right">' + sAcc + '% (' + sData.correct + '/' + sData.total + ')</span>' +
            '</div>';
        }

        html += '</div>';

        // Total stats
        var totalAnswered = Object.keys(state.questionsAnswered).length;
        var totalCorrect = Object.values(state.questionsAnswered).filter(function(a) { return a.correct; }).length;
        var totalQuestions = getQuestions().length;

        html += '<div class="card card-padded mb-24">' +
            '<h3 style="margin-bottom:16px">Overall Statistics</h3>' +
            '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;text-align:center">' +
                '<div>' +
                    '<div style="font-size:32px;font-weight:700;color:var(--primary)">' + totalAnswered + '</div>' +
                    '<div style="font-size:13px;color:var(--gray-500)">Questions Answered</div>' +
                '</div>' +
                '<div>' +
                    '<div style="font-size:32px;font-weight:700;color:var(--success)">' + totalCorrect + '</div>' +
                    '<div style="font-size:13px;color:var(--gray-500)">Correct Answers</div>' +
                '</div>' +
                '<div>' +
                    '<div style="font-size:32px;font-weight:700;color:var(--secondary)">' + state.practiceHistory.length + '</div>' +
                    '<div style="font-size:13px;color:var(--gray-500)">Practice Sessions</div>' +
                '</div>' +
            '</div>' +
        '</div>';

        // Reset option
        html += '<div class="text-center mt-32">' +
            '<button class="btn btn-ghost btn-sm" onclick="confirmReset()">Reset All Progress</button>' +
        '</div>';

        html += '</div>';
        render(html);
    }

    window.confirmReset = function() {
        showModal(
            '<div style="text-align:center">' +
                '<h2 style="margin-bottom:8px;color:var(--danger)">Reset Progress?</h2>' +
                '<p style="color:var(--gray-600);margin-bottom:24px">This will delete all your scores, practice history, and lesson progress. This cannot be undone.</p>' +
                '<div style="display:flex;gap:12px;justify-content:center">' +
                    '<button class="btn btn-ghost" onclick="hideModal()">Cancel</button>' +
                    '<button class="btn btn-danger" onclick="resetProgress()">Reset Everything</button>' +
                '</div>' +
            '</div>'
        );
    };

    window.resetProgress = function() {
        localStorage.removeItem('sat_prep_state');
        state = Object.assign({}, DEFAULT_STATE);
        hideModal();
        window.location.hash = '#/welcome';
    };

    // ============================================
    // INITIALIZATION
    // ============================================
    function init() {
        loadState();

        // Wait for question data to load
        var checkData = setInterval(function() {
            if (window.SAT_QUESTIONS && window.SAT_LESSONS) {
                clearInterval(checkData);
                route();
            }
        }, 100);

        // Fallback: if data doesn't load in 3 seconds, route anyway
        setTimeout(function() {
            clearInterval(checkData);
            if (!window.SAT_QUESTIONS) window.SAT_QUESTIONS = [];
            if (!window.SAT_LESSONS) window.SAT_LESSONS = [];
            route();
        }, 3000);
    }

    // Expose hideModal globally for onclick handlers
    window.hideModal = hideModal;

    // Start the app
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
