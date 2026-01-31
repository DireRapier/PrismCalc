document.addEventListener('DOMContentLoaded', () => {
    const displayElement = document.getElementById('display');
    const livePreviewElement = document.getElementById('live-preview');
    const historyListElement = document.getElementById('history-list');

    // Code Mode Elements
    const appContainer = document.querySelector('.app-container');
    const codePanel = document.getElementById('code-panel');
    const codeOutput = document.getElementById('code-output');
    const toggleCodeBtn = document.getElementById('toggle-code');
    let isCodeMode = false;

    // --- Audio Engine ---
    const AudioEngine = {
        ctx: null,
        isMuted: false,

        init() {
            if (!this.ctx) {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                this.ctx = new AudioContext();
            }
            if (this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
        },

        toggleMute() {
            this.isMuted = !this.isMuted;
            const btn = document.getElementById('toggle-sound');
            if (btn) {
                const icon = btn.querySelector('i');
                if (this.isMuted) {
                    icon.className = 'ri-volume-mute-line';
                    btn.classList.add('active'); // Optional visual cue
                } else {
                    icon.className = 'ri-volume-up-line';
                    btn.classList.remove('active');
                }
            }
        },

        playTone(freq, type, duration, volStart = 0.1, volEnd = 0.01) {
            if (this.isMuted || !this.ctx) return;

            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

            gain.gain.setValueAtTime(volStart, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(volEnd, this.ctx.currentTime + duration);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start();
            osc.stop(this.ctx.currentTime + duration);
            return osc; // Return for further manipulation if needed
        },

        click() {
            // "Thock": Triangle wave, 150Hz -> 50Hz
            if (this.isMuted || !this.ctx) return;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(150, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.1);

            gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start();
            osc.stop(this.ctx.currentTime + 0.1);
        },

        delete() {
            // "Glitch": Sawtooth, 800Hz -> 100Hz
            if (this.isMuted || !this.ctx) return;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(800, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.1);

            gain.gain.setValueAtTime(0.05, this.ctx.currentTime); // Slightly quieter
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start();
            osc.stop(this.ctx.currentTime + 0.1);
        },

        calculate() {
            // "Success": Major Chord (C5 + E5)
            if (this.isMuted || !this.ctx) return;

            const duration = 0.5;
            const freqs = [523.25, 659.25]; // C5, E5

            freqs.forEach(f => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'sine';
                osc.frequency.value = f;

                gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start();
                osc.stop(this.ctx.currentTime + duration);
            });
        }
    };

    // Toggle Sound
    const toggleSoundBtn = document.getElementById('toggle-sound');
    if (toggleSoundBtn) {
        // Set initial icon state (unmuted by default logic)
        toggleSoundBtn.querySelector('i').className = 'ri-volume-up-line';

        toggleSoundBtn.addEventListener('click', () => {
            AudioEngine.init(); // Ensure context is ready
            AudioEngine.toggleMute();
        });
    }

    // Toggle Code Mode
    if (toggleCodeBtn) {
        toggleCodeBtn.addEventListener('click', () => {
            AudioEngine.init();
            AudioEngine.click();
            isCodeMode = !isCodeMode;

            if (isCodeMode) {
                appContainer.classList.add('code-active');
                codePanel.classList.add('visible');
                toggleCodeBtn.classList.add('active');
            } else {
                appContainer.classList.remove('code-active');
                codePanel.classList.remove('visible');
                toggleCodeBtn.classList.remove('active');
            }
        });
    }

    // Calculator Logic (index.html)
    if (displayElement) {
        let currentExpression = '';

        // Check for pending restore
        const pendingRestore = localStorage.getItem('calc_pending_restore');
        if (pendingRestore) {
            currentExpression = pendingRestore;
            // Use setTimeout to ensure functions are defined/hoisted and DOM is ready
            setTimeout(() => {
                updateDisplay(currentExpression);
                updatePreview();
                updateCodePanel(currentExpression);
                localStorage.removeItem('calc_pending_restore');
            }, 0);
        }

        const buttons = document.querySelectorAll('.btn');

        buttons.forEach(button => {
            button.addEventListener('click', () => {
                const action = button.dataset.action;
                const value = button.dataset.value;

                handleInput(action, value);
            });
        });

        function handleInput(action, value) {
            // Audio Hooks
            AudioEngine.init();
            if (action === 'calculate') {
                AudioEngine.calculate();
            } else if (action === 'clear' || action === 'delete') {
                AudioEngine.delete();
            } else {
                AudioEngine.click();
            }

            if (action === 'clear') {
                currentExpression = '';
                updateDisplay('0');
                updatePreview('');
            } else if (action === 'delete') {
                currentExpression = currentExpression.toString().slice(0, -1);
                updateDisplay(currentExpression || '0');
                updatePreview();
            } else if (action === 'calculate') {
                calculate();
            } else {
                // Append value
                if (currentExpression === 'Error') currentExpression = '';

                currentExpression += value;
                updateDisplay(currentExpression);
                updatePreview();
            }
            // Update Code Panel in real-time
            updateCodePanel(currentExpression);
        }

        function updateDisplay(text) {
            displayElement.innerText = text;
        }

        function evaluateExpression(expression) {
            // Sanitize and prepare expression for evaluation
            // We define local helper functions for the calculation to enforce Degree mode
            let evalString = expression
                .replace(/×/g, '*')
                .replace(/÷/g, '/')
                .replace(/\^/g, '**')
                .replace(/√/g, 'sqrt')
                .replace(/π/g, 'Math.PI')
                .replace(/e/g, 'Math.E');

            // Handle implicitly multiplied parentheses e.g. 5(2) -> 5*(2)
            evalString = evalString.replace(/(\d)\(/g, '$1*(');

            // Construct function with Degree mode helpers
            // Note: sin/cos/tan in the input string will call these local functions
            const funcBody = `
                const sin = (d) => Math.sin(d * Math.PI / 180);
                const cos = (d) => Math.cos(d * Math.PI / 180);
                const tan = (d) => Math.tan(d * Math.PI / 180);
                const log = Math.log10;
                const ln = Math.log;
                const sqrt = Math.sqrt;
                return ${evalString};
            `;

            const result = new Function(funcBody)();

            if (!isFinite(result) || isNaN(result)) {
                throw new Error('Invalid Result');
            }

            return parseFloat(result.toFixed(10)).toString();
        }

        function updatePreview(textOverride) {
            if (!livePreviewElement) return;

            // If override provided (like clearing), use it
            if (typeof textOverride === 'string') {
                livePreviewElement.innerText = textOverride;
                return;
            }

            // If empty, clear preview
            if (!currentExpression) {
                 livePreviewElement.innerText = '';
                 return;
            }

            try {
                // Attempt to evaluate
                const result = evaluateExpression(currentExpression);
                livePreviewElement.innerText = result;
            } catch (error) {
                livePreviewElement.innerText = '';
            }
        }

        function calculate() {
            try {
                const result = evaluateExpression(currentExpression);

                saveToHistory(currentExpression, result);

                currentExpression = result;
                updateDisplay(currentExpression);
                updatePreview('');
                updateCodePanel(currentExpression); // Update code panel with result

            } catch (error) {
                updateDisplay('Error');
                currentExpression = '';
                updatePreview('');
                updateCodePanel('Error');
            }
        }

        function saveToHistory(eqn, res) {
            const historyItem = {
                equation: eqn,
                result: res,
                timestamp: new Date().toLocaleString()
            };

            let history = JSON.parse(localStorage.getItem('calc_history')) || [];
            history.unshift(historyItem); // Add to beginning
            // Limit history to 50 items
            if (history.length > 50) history.pop();

            localStorage.setItem('calc_history', JSON.stringify(history));
        }

        // --- Code Mode Logic ---
        function updateCodePanel(expression) {
            if (!codeOutput) return;
            if (!expression || expression === 'Error') {
                codeOutput.innerHTML = '<span class="token-comment">// Ready for input...</span>';
                return;
            }

            // Generate JS Code
            const jsCode = generateJS(expression);

            // Calculate result for the comment
            let resultComment = '';
            try {
                const res = evaluateExpression(expression);
                resultComment = ` // ${res}`;
            } catch (e) {
                // If incomplete, don't show result
            }

            const finalString = `const result = ${jsCode};${resultComment}`;

            // Highlight Syntax
            codeOutput.innerHTML = highlightSyntax(finalString);
        }

        function generateJS(expression) {
            let code = expression
                .replace(/×/g, '*')
                .replace(/÷/g, '/')
                .replace(/\^/g, '**')
                .replace(/π/g, 'Math.PI')
                .replace(/e/g, 'Math.E')
                .replace(/sin/g, 'Math.sin')
                .replace(/cos/g, 'Math.cos')
                .replace(/tan/g, 'Math.tan')
                .replace(/√/g, 'Math.sqrt')
                .replace(/log/g, 'Math.log10')
                .replace(/ln/g, 'Math.log');

            // Educational Trig Replacement (Degree to Radian visual)
            // Matches Math.sin(simple_number_or_expression)
            // The Regex [^()]+ ensures we only match the innermost simple calls
            // e.g. Math.sin(30) -> Math.sin((30) * Math.PI / 180)
            code = code.replace(/Math\.sin\(([^()]+)\)/g, 'Math.sin(($1) * Math.PI / 180)');
            code = code.replace(/Math\.cos\(([^()]+)\)/g, 'Math.cos(($1) * Math.PI / 180)');
            code = code.replace(/Math\.tan\(([^()]+)\)/g, 'Math.tan(($1) * Math.PI / 180)');

            return code;
        }

        function highlightSyntax(code) {
            // Safer syntax highlighter using a single pass to prevent breaking HTML tags
            const regex = /(\/\/.*$)|(const|let|var|function|return)|(Math)|(\b\d+(\.\d+)?\b)|([+\-*/=])/gm;

            return code.replace(regex, (match, comment, keyword, object, number, decimal, operator) => {
                if (comment) return `<span class="token-comment">${match}</span>`;
                if (keyword) return `<span class="token-keyword">${match}</span>`;
                if (object) return `<span class="token-object">${match}</span>`;
                if (number) return `<span class="token-number">${match}</span>`;
                if (operator) return `<span class="token-operator">${match}</span>`;
                return match;
            });
        }
    }

    // Vault Logic (vault.html)
    if (historyListElement) {
        loadHistory();

        const clearBtn = document.getElementById('clear-history');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                localStorage.removeItem('calc_history');
                loadHistory();
            });
        }
    }

    function loadHistory() {
        let history = JSON.parse(localStorage.getItem('calc_history')) || [];

        // Migration Check: If legacy strings exist, clear history
        if (history.some(item => typeof item === 'string')) {
            localStorage.removeItem('calc_history');
            history = [];
        }

        historyListElement.innerHTML = '';

        if (history.length === 0) {
            const emptyState = document.createElement('li');
            emptyState.className = 'empty-state';
            emptyState.innerText = 'No calculations yet. Go make some math magic!';
            historyListElement.appendChild(emptyState);
            return;
        }

        history.forEach(item => {
            const li = document.createElement('li');
            li.className = 'history-item history-card';

            const eqnDiv = document.createElement('div');
            eqnDiv.className = 'history-equation';
            eqnDiv.innerText = item.equation;

            const resDiv = document.createElement('div');
            resDiv.className = 'history-result';
            resDiv.innerText = '= ' + item.result;

            const timeTag = document.createElement('small');
            timeTag.className = 'time-tag';
            timeTag.innerText = item.timestamp || '';

            li.appendChild(eqnDiv);
            li.appendChild(resDiv);
            li.appendChild(timeTag);

            li.addEventListener('click', () => {
                localStorage.setItem('calc_pending_restore', item.equation);
                window.location.href = 'index.html';
            });

            historyListElement.appendChild(li);
        });
    }
});
