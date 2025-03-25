const WORD_LENGTH = 5;
const MAX_ATTEMPTS = 6;
let allWords = [];
let possibleWords = [];
let currentWord;
let currentAttempt = 0;
let currentGuess = [];
let gameOver = false;

async function loadWords() {
    try {
        const response = await fetch('https://raw.githubusercontent.com/tabatkins/wordle-list/main/words');
        if (!response.ok) {
            throw new Error(`Failed to fetch words: ${response.status} ${response.statusText}`);
        }
        const text = await response.text();
        if (!text) {
            throw new Error('Word list is empty');
        }
        
        allWords = text.toUpperCase().split(/\r?\n/)
            .map(word => word.trim())
            .filter(word => word.length === WORD_LENGTH && /^[A-Z]{5}$/.test(word));
            
        if (allWords.length === 0) {
            throw new Error('No valid 5-letter words found');
        }
        
        possibleWords = [...allWords];
        currentWord = possibleWords[Math.floor(Math.random() * possibleWords.length)];
        console.log('Successfully loaded', allWords.length, 'words');
        initGame();
    } catch (error) {
        console.error('Error loading words:', error);
        document.getElementById('message').textContent = `Error: ${error.message}`;
    }
}

function filterPossibleWords(guess, result) {
    possibleWords = possibleWords.filter(word => {
        // Check for correct letters
        for (let i = 0; i < WORD_LENGTH; i++) {
            if (result[i] === 'correct' && word[i] !== guess[i]) {
                return false;
            }
        }
        
        // Check for present letters
        for (let i = 0; i < WORD_LENGTH; i++) {
            if (result[i] === 'present' && 
                (word[i] === guess[i] || !word.includes(guess[i]))) {
                return false;
            }
        }
        
        // Check for absent letters
        const absentLetters = [];
        for (let i = 0; i < WORD_LENGTH; i++) {
            if (result[i] === 'absent') {
                absentLetters.push(guess[i]);
            }
        }
        
        for (const letter of absentLetters) {
            if (word.includes(letter)) {
                // Only exclude if the letter isn't already marked as correct/present
                const correctOrPresent = guess.split('').some((g, i) => 
                    g === letter && (result[i] === 'correct' || result[i] === 'present'));
                if (!correctOrPresent) {
                    return false;
                }
            }
        }
        
        return true;
    });
}

function initGame() {
    currentAttempt = 0;
    currentGuess = [];
    gameOver = false;
    document.querySelectorAll('.cell').forEach(cell => {
        cell.textContent = '';
        cell.removeAttribute('data-state');
    });
    document.querySelectorAll('#keyboard button').forEach(button => {
        button.disabled = false;
    });
    document.getElementById('message').textContent = '';
}

function updateCell(row, col, letter, state) {
    const cell = document.querySelector(`.row[data-row="${row}"] .cell[data-col="${col}"]`);
    cell.textContent = letter;
    if (state) {
        cell.setAttribute('data-state', state);
    }
}

function updateKeyboard(letter, state) {
    const key = document.querySelector(`#keyboard button[data-key="${letter}"]`);
    if (key && !key.getAttribute('data-state')) {
        key.setAttribute('data-state', state);
    }
}

function checkGuess() {
    const guess = currentGuess.join('');
    if (guess.length !== WORD_LENGTH) return;

    if (!allWords.includes(guess.toUpperCase())) {
        showMessage('Not in word list');
        return;
    }

    const result = [];
    const letterCounts = {};
    
    // First pass: mark correct letters
    for (let i = 0; i < WORD_LENGTH; i++) {
        if (guess[i] === currentWord[i]) {
            result[i] = 'correct';
            letterCounts[guess[i]] = (letterCounts[guess[i]] || 0) + 1;
        }
    }

    // Second pass: mark present and absent letters
    for (let i = 0; i < WORD_LENGTH; i++) {
        if (result[i] === 'correct') continue;
        
        if (currentWord.includes(guess[i]) && (letterCounts[guess[i]] || 0) < currentWord.split(guess[i]).length - 1) {
            result[i] = 'present';
            letterCounts[guess[i]] = (letterCounts[guess[i]] || 0) + 1;
        } else {
            result[i] = 'absent';
        }
    }

    // Update cells and keyboard
    for (let i = 0; i < WORD_LENGTH; i++) {
        updateCell(currentAttempt, i, guess[i], result[i]);
        updateKeyboard(guess[i], result[i]);
    }

    // Filter possible words based on the result
    filterPossibleWords(guess.toUpperCase(), result);

    if (guess === currentWord) {
        gameOver = true;
        showMessage('You win!');
    } else if (currentAttempt === MAX_ATTEMPTS - 1) {
        gameOver = true;
        showMessage(`Game over! The word was ${currentWord}`);
    } else {
        currentAttempt++;
        currentGuess = [];
    }
}

function showMessage(message) {
    const messageElement = document.getElementById('message');
    messageElement.textContent = message;
}

function handleKeyPress(key) {
    if (gameOver) return;

    if (key === 'Backspace') {
        if (currentGuess.length > 0) {
            currentGuess.pop();
            updateCell(currentAttempt, currentGuess.length, '');
        }
    } else if (key === 'Enter') {
        checkGuess();
    } else if (/^[A-Z]$/.test(key)) {
        if (currentGuess.length < WORD_LENGTH) {
            currentGuess.push(key);
            updateCell(currentAttempt, currentGuess.length - 1, key);
        }
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', loadWords);

document.querySelectorAll('#keyboard button').forEach(button => {
    button.addEventListener('click', () => {
        handleKeyPress(button.dataset.key);
    });
});

document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    
    let key = e.key.toUpperCase();
    if (key === 'BACKSPACE') key = 'Backspace';
    if (key === 'ENTER') key = 'Enter';
    
    handleKeyPress(key);
});
