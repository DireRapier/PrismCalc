document.addEventListener('DOMContentLoaded', () => {
    const displayElement = document.getElementById('display');
    const historyPreviewElement = document.getElementById('history-preview');
    const historyListElement = document.getElementById('history-list');

    // Calculator Logic (index.html)
    if (displayElement) {
        let currentExpression = '';
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
            } else if (action === 'calculate') {
                calculate();
            } else {
                // Append value
                if (currentExpression === 'Error') currentExpression = '';

                // Handle specific function replacements for display if needed,
                // but strictly keeping simple concatenation for now.
                // We will rely on data-value providing the correct char.
                currentExpression += value;
                updateDisplay(currentExpression);
            }
        }

        function updateDisplay(text) {
            displayElement.innerText = text;
        }

        function updatePreview(text) {
            if (historyPreviewElement) {
                historyPreviewElement.innerText = text;
            }
        }

        function calculate() {
            try {
                // Sanitize and prepare expression for evaluation
                // Replace visual symbols with JS math functions
                let evalString = currentExpression
                    .replace(/×/g, '*')
                    .replace(/÷/g, '/')
                    .replace(/\^/g, '**')
                    .replace(/√/g, 'Math.sqrt')
                    .replace(/sin/g, 'Math.sin')
                    .replace(/cos/g, 'Math.cos')
                    .replace(/tan/g, 'Math.tan')
                    .replace(/log/g, 'Math.log10') // Standard log usually implies base 10 on calc, Math.log is ln
                    .replace(/ln/g, 'Math.log')
                    .replace(/π/g, 'Math.PI')
                    .replace(/e/g, 'Math.E');

                // Handle implicitly multiplied parentheses e.g. 5(2) -> 5*(2)
                // This is a simple regex attempt, might not cover all edge cases but adds polish
                evalString = evalString.replace(/(\d)\(/g, '$1*(');

                // Safe evaluation
                // Using Function constructor is slightly safer than eval for scope isolation
                const result = new Function('return ' + evalString)();

                // Check for Infinity or NaN
                if (!isFinite(result) || isNaN(result)) {
                    throw new Error('Invalid Result');
                }

                // Format result (max decimal places)
                const formattedResult = parseFloat(result.toFixed(10)).toString();

                saveToHistory(currentExpression, formattedResult);

                updatePreview(currentExpression + ' =');
                currentExpression = formattedResult;
                updateDisplay(currentExpression);

            } catch (error) {
                updateDisplay('Error');
                currentExpression = '';
            }
        }

        function saveToHistory(eqn, res) {
            const historyItem = {
                equation: eqn,
                result: res,
                timestamp: new Date().toISOString()
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
    }

    function loadHistory() {
        const history = JSON.parse(localStorage.getItem('prismCalcHistory')) || [];

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
            li.className = 'history-item';

            const eqnDiv = document.createElement('div');
            eqnDiv.className = 'history-equation';
            eqnDiv.innerText = item.equation;

            const resDiv = document.createElement('div');
            resDiv.className = 'history-result';
            resDiv.innerText = '= ' + item.result;

            li.appendChild(eqnDiv);
            li.appendChild(resDiv);
            historyListElement.appendChild(li);
        });
    }
});
