document.addEventListener('DOMContentLoaded', () => {
    const displayElement = document.getElementById('display');
    const livePreviewElement = document.getElementById('live-preview');
    const historyListElement = document.getElementById('history-list');

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
        }

        function updateDisplay(text) {
            displayElement.innerText = text;
        }

        function evaluateExpression(expression) {
            // Sanitize and prepare expression for evaluation
            let evalString = expression
                .replace(/×/g, '*')
                .replace(/÷/g, '/')
                .replace(/\^/g, '**')
                .replace(/√/g, 'Math.sqrt')
                .replace(/sin/g, 'Math.sin')
                .replace(/cos/g, 'Math.cos')
                .replace(/tan/g, 'Math.tan')
                .replace(/log/g, 'Math.log10')
                .replace(/ln/g, 'Math.log')
                .replace(/π/g, 'Math.PI')
                .replace(/e/g, 'Math.E');

            // Handle implicitly multiplied parentheses e.g. 5(2) -> 5*(2)
            evalString = evalString.replace(/(\d)\(/g, '$1*(');

            const result = new Function('return ' + evalString)();

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
                // Incomplete or invalid expression while typing
                // Keep the previous preview or clear it.
                // We choose to clear it to indicate incomplete state.
                // Do not show "Error" here.
                livePreviewElement.innerText = '';
            }
        }

        function calculate() {
            try {
                const result = evaluateExpression(currentExpression);

                saveToHistory(currentExpression, result);

                currentExpression = result;
                updateDisplay(currentExpression);
                updatePreview(''); // Clear preview as result is now in main display

            } catch (error) {
                updateDisplay('Error');
                currentExpression = '';
                updatePreview('');
            }
        }

        function saveToHistory(eqn, res) {
            const historyItem = {
                equation: eqn,
                result: res,
                timestamp: new Date().toLocaleString()
            };

            let history = JSON.parse(localStorage.getItem('prismCalcHistory')) || [];
            history.unshift(historyItem); // Add to beginning
            // Limit history to 50 items
            if (history.length > 50) history.pop();

            localStorage.setItem('prismCalcHistory', JSON.stringify(history));
        }
    }

    // Vault Logic (vault.html)
    if (historyListElement) {
        loadHistory();

        const clearBtn = document.getElementById('clear-history');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                localStorage.removeItem('prismCalcHistory');
                loadHistory();
            });
        }
    }

    function loadHistory() {
        let history = JSON.parse(localStorage.getItem('prismCalcHistory')) || [];

        // Migration Check: If legacy strings exist, clear history
        if (history.some(item => typeof item === 'string')) {
            localStorage.removeItem('prismCalcHistory');
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
            li.className = 'history-item history-card'; // Added history-card class

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

            // Add restore click listener
            li.addEventListener('click', () => {
                localStorage.setItem('calc_pending_restore', item.equation);
                window.location.href = 'index.html';
            });

            historyListElement.appendChild(li);
        });
    }
});
