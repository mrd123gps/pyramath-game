// Pyramath Game Logic
class PyramathGame {
    constructor() {
        this.gameState = {
            operationType: null, // 'addition' or 'multiplication'
            timeLimit: 0, // seconds, 0 for no limit
            missingPosition: null, // 'top', 'bottom', 'random'
            currentProblem: null,
            correctAnswers: 0,
            totalAnswers: 0,
            answerTimes: [],
            startTime: null,
            timerInterval: null,
            remainingTime: 0,
            attempts: 0,
            gameStarted: false,
            // Mini-game trigger logic
            targetAnswers: Math.floor(Math.random() * 4) + 3, // 3-6 correct answers
            correctStreak: 0,
            miniGameUnlocked: false
        };
        
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Enter key support for answer input
        document.getElementById('answer-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.submitAnswer();
            }
        });
    }

    selectOperationType(type) {
        this.gameState.operationType = type;
        this.showScreen('time-screen');
    }

    selectTimeLimit(seconds) {
        this.gameState.timeLimit = seconds;
        this.gameState.remainingTime = seconds;
        this.showScreen('position-screen');
    }

    selectMissingPosition(position) {
        this.gameState.missingPosition = position;
        this.startGame();
    }

    showScreen(screenId) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        // Show target screen
        document.getElementById(screenId).classList.add('active');
    }

    goBack() {
        const currentScreen = document.querySelector('.screen.active').id;
        
        switch(currentScreen) {
            case 'time-screen':
                this.showScreen('welcome-screen');
                break;
            case 'position-screen':
                this.showScreen('time-screen');
                break;
            case 'game-screen':
                this.showScreen('welcome-screen');
                this.resetGame();
                break;
        }
    }

    goToMenu() {
        this.showScreen('welcome-screen');
        this.resetGame();
    }

    resetGame() {
        if (this.gameState.timerInterval) {
            clearInterval(this.gameState.timerInterval);
        }
        
        this.gameState = {
            operationType: null,
            timeLimit: 0,
            missingPosition: null,
            currentProblem: null,
            correctAnswers: 0,
            totalAnswers: 0,
            answerTimes: [],
            startTime: null,
            timerInterval: null,
            remainingTime: 0,
            attempts: 0,
            gameStarted: false
        };
        
        this.clearFeedback();
        document.getElementById('answer-input').value = '';
    }

    startGame() {
        this.showScreen('game-screen');
        this.gameState.gameStarted = true;
        this.gameState.startTime = Date.now();
        
        // Set up timer if needed
        if (this.gameState.timeLimit > 0) {
            this.startTimer();
        } else {
            document.getElementById('timer').style.display = 'none';
        }
        
        // Set operation symbol
        const symbol = this.gameState.operationType === 'addition' ? '+' : '×';
        document.getElementById('operation-symbol').textContent = symbol;
        
        this.generateNewProblem();
        this.updateStats();
    }

    startTimer() {
        document.getElementById('timer').style.display = 'block';
        this.updateTimerDisplay();
        
        this.gameState.timerInterval = setInterval(() => {
            this.gameState.remainingTime--;
            this.updateTimerDisplay();
            
            if (this.gameState.remainingTime <= 0) {
                this.endGame();
            }
        }, 1000);
    }

    updateTimerDisplay() {
        const minutes = Math.floor(this.gameState.remainingTime / 60);
        const seconds = this.gameState.remainingTime % 60;
        document.getElementById('timer').textContent = 
            `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    generateNewProblem() {
        let num1, num2, result, missingPos;
        
        // Generate random single-digit numbers
        num1 = Math.floor(Math.random() * 9) + 1;
        num2 = Math.floor(Math.random() * 9) + 1;
        
        if (this.gameState.operationType === 'addition') {
            result = num1 + num2;
        } else {
            result = num1 * num2;
        }
        
        // Determine missing position
        if (this.gameState.missingPosition === 'random') {
            const positions = ['top', 'bottom'];
            missingPos = positions[Math.floor(Math.random() * positions.length)];
        } else {
            missingPos = this.gameState.missingPosition;
        }
        
        // For bottom missing, randomly choose left or right
        let missingBottomSide = null;
        if (missingPos === 'bottom') {
            missingBottomSide = Math.random() < 0.5 ? 'left' : 'right';
        }
        
        this.gameState.currentProblem = {
            num1,
            num2,
            result,
            missingPosition: missingPos,
            missingBottomSide,
            correctAnswer: missingPos === 'top' ? result : 
                          (missingBottomSide === 'left' ? num1 : num2),
            questionStartTime: Date.now()
        };
        
        this.displayProblem();
        this.gameState.attempts = 0;
        this.clearFeedback();
        
        // Focus on input
        document.getElementById("answer-input").value = "";
        document.getElementById("answer-input").focus();
        document.getElementById("answer-input").disabled = false;
        document.querySelector(".submit-button").disabled = false;
    }

    displayProblem() {
        const problem = this.gameState.currentProblem;
        const topEl = document.getElementById('top-number');
        const leftEl = document.getElementById('bottom-left');
        const rightEl = document.getElementById('bottom-right');
        
        // Reset colors
        topEl.style.color = '#2F1B14';
        leftEl.style.color = '#2F1B14';
        rightEl.style.color = '#2F1B14';
        topEl.classList.remove('correct-answer');
        leftEl.classList.remove('correct-answer');
        rightEl.classList.remove('correct-answer');
        
        if (problem.missingPosition === 'top') {
            topEl.textContent = '?';
            leftEl.textContent = problem.num1;
            rightEl.textContent = problem.num2;
        } else {
            topEl.textContent = problem.result;
            if (problem.missingBottomSide === 'left') {
                leftEl.textContent = '?';
                rightEl.textContent = problem.num2;
            } else {
                leftEl.textContent = problem.num1;
                rightEl.textContent = '?';
            }
        }
    }

    submitAnswer() {
        const input = document.getElementById('answer-input');
        const userAnswer = parseInt(input.value);
        
        if (isNaN(userAnswer)) {
            return;
        }
        
        this.gameState.attempts++;
        this.gameState.totalAnswers++;
        
        if (userAnswer === this.gameState.currentProblem.correctAnswer) {
            this.handleCorrectAnswer();
        } else {
            this.handleIncorrectAnswer();
        }
        
        this.updateStats();
    }

   handleCorrectAnswer() {
    …
    // ---- NEW CODE -------------------------------------------------
    // Re-enable the field for the next problem (used in both branches)
    const enableInput = () => {
        const input = document.getElementById("answer-input");
        const btn   = document.querySelector(".submit-button");
        input.disabled = false;
        btn.disabled   = false;
        input.focus();               // <-- keep the cursor ready
    };
    // --------------------------------------------------------------

    // Check if mini-game should be triggered
    if (this.gameState.correctStreak >= this.gameState.targetAnswers && !this.gameState.miniGameUnlocked) {
        this.gameState.miniGameUnlocked = true;
        setTimeout(() => {
            this.triggerMiniGame();   // mini-game will take care of the UI
        }, 2000);
    } else {
        // Generate new problem after delay
        setTimeout(() => {
            this.generateNewProblem();
            enableInput();            // <-- re-enable + focus here
        }, 1500);
    }

    // (keep the old disable lines – they stop double-submission while feedback shows)
    document.getElementById("answer-input").disabled = true;
    document.querySelector(".submit-button").disabled = true;
}

    handleIncorrectAnswer() {
        this.gameState.correctStreak = 0; // Reset streak on incorrect answer
        
        if (this.gameState.attempts === 1) {
            this.showFeedback('try-again');
            document.getElementById('answer-input').value = '';
            document.getElementById('answer-input').focus();
        } else {
            this.showFeedback('show-answer');
            this.showCorrectAnswer();
            
            // Wait for user to input correct answer
            this.waitForCorrectAnswer();
        }
    }

    showCorrectAnswer() {
        const problem = this.gameState.currentProblem;
        
        if (problem.missingPosition === 'top') {
            const topEl = document.getElementById('top-number');
            topEl.textContent = problem.correctAnswer;
            topEl.classList.add('correct-answer');
        } else {
            if (problem.missingBottomSide === 'left') {
                const leftEl = document.getElementById('bottom-left');
                leftEl.textContent = problem.correctAnswer;
                leftEl.classList.add('correct-answer');
            } else {
                const rightEl = document.getElementById('bottom-right');
                rightEl.textContent = problem.correctAnswer;
                rightEl.classList.add('correct-answer');
            }
        }
    }

    waitForCorrectAnswer() {
        const input = document.getElementById('answer-input');
        input.value = '';
        input.focus();
        
        const checkAnswer = () => {
            const userAnswer = parseInt(input.value);
            if (userAnswer === this.gameState.currentProblem.correctAnswer) {
                // Correct answer entered, continue to next problem
                setTimeout(() => {
                    this.generateNewProblem();
                }, 500);
                input.removeEventListener('input', checkAnswer);
            }
        };
        
        input.addEventListener('input', checkAnswer);
    }

    showFeedback(type) {
        const container = document.getElementById('feedback-container');
        container.innerHTML = '';
        
        switch(type) {
            case 'correct':
                const happyImg = document.createElement('img');
                happyImg.src = 'happy_egyptian.jpg';
                happyImg.className = 'feedback-image';
                happyImg.alt = 'Happy Egyptian character';
                container.appendChild(happyImg);
                break;
                
            case 'try-again':
                const confusedImg = document.createElement('img');
                confusedImg.src = 'confused_egyptian.jpg';
                confusedImg.className = 'feedback-image';
                confusedImg.alt = 'Confused Egyptian character';
                container.appendChild(confusedImg);
                
                const tryAgainText = document.createElement('div');
                tryAgainText.className = 'feedback-text';
                tryAgainText.textContent = 'Try Again';
                container.appendChild(tryAgainText);
                break;
                
            case 'show-answer':
                const errorX = document.createElement('div');
                errorX.className = 'error-x';
                errorX.textContent = '✗';
                container.appendChild(errorX);
                break;
        }
    }

    clearFeedback() {
        document.getElementById('feedback-container').innerHTML = '';
    }

    updateStats() {
        document.getElementById('correct-count').textContent = this.gameState.correctAnswers;
        document.getElementById('total-count').textContent = this.gameState.totalAnswers;
    }

    endGame() {
        if (this.gameState.timerInterval) {
            clearInterval(this.gameState.timerInterval);
        }
        
        this.showResults();
    }

    showResults() {
        this.showScreen('results-screen');
        
        const accuracy = this.gameState.totalAnswers > 0 ? 
            Math.round((this.gameState.correctAnswers / this.gameState.totalAnswers) * 100) : 0;
        
        const fastestTime = this.gameState.answerTimes.length > 0 ? 
            Math.min(...this.gameState.answerTimes).toFixed(1) : '0.0';
        
        const slowestTime = this.gameState.answerTimes.length > 0 ? 
            Math.max(...this.gameState.answerTimes).toFixed(1) : '0.0';
        
        document.getElementById('final-correct').textContent = this.gameState.correctAnswers;
        document.getElementById('final-accuracy').textContent = accuracy + '%';
        document.getElementById('fastest-time').textContent = fastestTime + 's';
        document.getElementById('slowest-time').textContent = slowestTime + 's';
    }

    playAgain() {
        // Keep the same settings but reset game state
        const operationType = this.gameState.operationType;
        const timeLimit = this.gameState.timeLimit;
        const missingPosition = this.gameState.missingPosition;
        
        this.resetGame();
        
        this.gameState.operationType = operationType;
        this.gameState.timeLimit = timeLimit;
        this.gameState.remainingTime = timeLimit;
        this.gameState.missingPosition = missingPosition;
        
        this.startGame();
    }
}

// Global game instance
let game;

// Global functions for HTML onclick handlers
function selectOperationType(type) {
    game.selectOperationType(type);
}

function selectTimeLimit(seconds) {
    game.selectTimeLimit(seconds);
}

function selectMissingPosition(position) {
    game.selectMissingPosition(position);
}

function submitAnswer() {
    game.submitAnswer();
}

function goBack() {
    game.goBack();
}

function goToMenu() {
    game.goToMenu();
}

function playAgain() {
    game.playAgain();
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    game = new PyramathGame();
});

