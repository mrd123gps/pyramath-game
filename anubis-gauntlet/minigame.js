// Anubis Gauntlet Mini-Game
class AnubisGauntlet {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.gameState = {
            isRunning: false,
            timeRemaining: 30,
            score: 0,
            highScore: parseInt(localStorage.getItem('anubis-gauntlet-high-score') || '0'),
            gameSpeed: 1,
            backgroundOffset: 0
        };
        
        this.player = {
            x: 100,
            y: 400,
            width: 40,
            height: 60,
            velocityX: 0,
            velocityY: 0,
            isJumping: false,
            isDashing: false,
            dashCooldown: 0,
            targetX: 100
        };
        
        this.obstacles = [];
        this.collectibles = [];
        this.particles = [];
        
        this.keys = {};
        this.lastSpawnTime = 0;
        this.gameTimer = null;
        this.animationFrame = null;
        
        // Audio context for sound effects
        this.audioContext = null;
        this.initAudio();
    }
    
    initAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Audio not supported');
        }
    }
    
    playSound(frequency, duration, type = 'sine') {
        if (!this.audioContext) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        oscillator.type = type;
        
        gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }
    
    init() {
        this.canvas = document.getElementById('minigame-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Update high score display
        document.getElementById('minigame-high-score').textContent = this.gameState.highScore;
    }
    
    setupEventListeners() {
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (e.code === 'Space') {
                e.preventDefault();
                this.jump();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        
        // Touch controls for mobile
        let touchStartX = 0;
        let touchStartY = 0;
        
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
        });
        
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
        });
        
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            const touch = e.changedTouches[0];
            const deltaX = touch.clientX - touchStartX;
            const deltaY = touch.clientY - touchStartY;
            
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                // Horizontal swipe
                if (deltaX > 50) {
                    this.player.targetX = Math.min(this.canvas.width - this.player.width, this.player.targetX + 100);
                } else if (deltaX < -50) {
                    this.player.targetX = Math.max(0, this.player.targetX - 100);
                }
            } else {
                // Vertical swipe
                if (deltaY < -50) {
                    this.dash();
                } else if (deltaY > 50) {
                    this.jump();
                }
            }
        });
        
        // Tap to jump
        this.canvas.addEventListener('click', (e) => {
            e.preventDefault();
            this.jump();
        });
    }
    
    start() {
        this.init();
        this.reset();
        this.gameState.isRunning = true;
        
        // Start game timer
        this.gameTimer = setInterval(() => {
            this.gameState.timeRemaining--;
            this.updateTimerDisplay();
            
            if (this.gameState.timeRemaining <= 0) {
                this.endGame();
            } else if (this.gameState.timeRemaining <= 10) {
                // Beep for last 10 seconds
                this.playSound(800, 0.1);
            }
        }, 1000);
        
        // Start game loop
        this.gameLoop();
    }
    
    reset() {
        this.gameState.timeRemaining = 30;
        this.gameState.score = 0;
        this.gameState.gameSpeed = 1;
        this.gameState.backgroundOffset = 0;
        
        this.player.x = 100;
        this.player.y = 400;
        this.player.velocityX = 0;
        this.player.velocityY = 0;
        this.player.isJumping = false;
        this.player.isDashing = false;
        this.player.dashCooldown = 0;
        this.player.targetX = 100;
        
        this.obstacles = [];
        this.collectibles = [];
        this.particles = [];
        this.lastSpawnTime = 0;
        
        this.updateScoreDisplay();
        this.updateTimerDisplay();
    }
    
    jump() {
        if (!this.player.isJumping && this.gameState.isRunning) {
            this.player.velocityY = -15;
            this.player.isJumping = true;
            this.playSound(400, 0.2);
        }
    }
    
    dash() {
        if (this.player.dashCooldown <= 0 && this.gameState.isRunning) {
            this.player.isDashing = true;
            this.player.velocityY = -8;
            this.player.dashCooldown = 60; // 1 second cooldown at 60fps
            this.playSound(600, 0.15);
        }
    }
    
    updatePlayer() {
        // Handle horizontal movement
        if (this.keys['ArrowLeft'] || this.keys['KeyA']) {
            this.player.targetX = Math.max(0, this.player.targetX - 5);
        }
        if (this.keys['ArrowRight'] || this.keys['KeyD']) {
            this.player.targetX = Math.min(this.canvas.width - this.player.width, this.player.targetX + 5);
        }
        if (this.keys['ArrowUp'] || this.keys['KeyW']) {
            this.dash();
        }
        
        // Smooth movement towards target
        this.player.x += (this.player.targetX - this.player.x) * 0.15;
        
        // Handle vertical movement (gravity and jumping)
        this.player.velocityY += 0.8; // gravity
        this.player.y += this.player.velocityY;
        
        // Ground collision
        const groundY = this.canvas.height - 150;
        if (this.player.y >= groundY) {
            this.player.y = groundY;
            this.player.velocityY = 0;
            this.player.isJumping = false;
            this.player.isDashing = false;
        }
        
        // Update cooldowns
        if (this.player.dashCooldown > 0) {
            this.player.dashCooldown--;
        }
    }
    
    spawnObstacle() {
        const now = Date.now();
        if (now - this.lastSpawnTime < 1500 / this.gameState.gameSpeed) return;
        
        this.lastSpawnTime = now;
        
        const types = ['anubis', 'flame', 'pitfall', 'scarab', 'boulder'];
        const type = types[Math.floor(Math.random() * types.length)];
        
        let obstacle = {
            type: type,
            x: this.canvas.width,
            y: this.canvas.height - 150,
            width: 40,
            height: 60,
            speed: 3 * this.gameState.gameSpeed
        };
        
        switch (type) {
            case 'anubis':
                obstacle.color = '#8B4513';
                obstacle.height = 80;
                obstacle.y -= 20;
                break;
            case 'flame':
                obstacle.color = '#FF4500';
                obstacle.width = 30;
                obstacle.height = 100;
                obstacle.y -= 40;
                break;
            case 'pitfall':
                obstacle.color = '#000000';
                obstacle.width = 60;
                obstacle.height = 30;
                obstacle.y += 30;
                break;
            case 'scarab':
                obstacle.color = '#4B0082';
                obstacle.width = 20;
                obstacle.height = 20;
                obstacle.y -= Math.random() * 100;
                break;
            case 'boulder':
                obstacle.color = '#A0522D';
                obstacle.width = 50;
                obstacle.height = 50;
                obstacle.y -= 50;
                break;
        }
        
        this.obstacles.push(obstacle);
        
        // Occasionally spawn collectibles
        if (Math.random() < 0.3) {
            this.collectibles.push({
                x: this.canvas.width + Math.random() * 200,
                y: this.canvas.height - 200 - Math.random() * 100,
                width: 20,
                height: 20,
                speed: 2 * this.gameState.gameSpeed,
                collected: false
            });
        }
    }
    
    updateObstacles() {
        // Update obstacles
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obstacle = this.obstacles[i];
            obstacle.x -= obstacle.speed;
            
            // Remove obstacles that are off-screen
            if (obstacle.x + obstacle.width < 0) {
                this.obstacles.splice(i, 1);
                this.gameState.score += 10; // Survival points
            }
        }
        
        // Update collectibles
        for (let i = this.collectibles.length - 1; i >= 0; i--) {
            const collectible = this.collectibles[i];
            collectible.x -= collectible.speed;
            
            // Check collision with player
            if (!collectible.collected && this.checkCollision(this.player, collectible)) {
                collectible.collected = true;
                this.gameState.score += 50;
                this.playSound(800, 0.1);
                
                // Add sparkle particles
                for (let j = 0; j < 10; j++) {
                    this.particles.push({
                        x: collectible.x + collectible.width / 2,
                        y: collectible.y + collectible.height / 2,
                        vx: (Math.random() - 0.5) * 4,
                        vy: (Math.random() - 0.5) * 4,
                        life: 30,
                        color: '#FFD700'
                    });
                }
            }
            
            // Remove collectibles that are off-screen
            if (collectible.x + collectible.width < 0) {
                this.collectibles.splice(i, 1);
            }
        }
        
        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life--;
            
            if (particle.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    checkCollisions() {
        for (const obstacle of this.obstacles) {
            if (this.checkCollision(this.player, obstacle)) {
                this.endGame();
                return;
            }
        }
    }
    
    checkCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }
    
    render() {
        // Clear canvas
        this.ctx.fillStyle = '#2F1B14';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw background (simple parallax effect)
        this.gameState.backgroundOffset -= this.gameState.gameSpeed;
        if (this.gameState.backgroundOffset <= -this.canvas.width) {
            this.gameState.backgroundOffset = 0;
        }
        
        // Draw temple columns
        this.ctx.fillStyle = '#8B4513';
        for (let i = 0; i < 5; i++) {
            const x = (i * 200) + this.gameState.backgroundOffset;
            this.ctx.fillRect(x, 0, 30, this.canvas.height - 150);
            this.ctx.fillRect(x + 200, 0, 30, this.canvas.height - 150);
        }
        
        // Draw ground
        this.ctx.fillStyle = '#DAA520';
        this.ctx.fillRect(0, this.canvas.height - 150, this.canvas.width, 150);
        
        // Draw hieroglyphs on ground
        this.ctx.fillStyle = '#8B4513';
        for (let i = 0; i < 10; i++) {
            const x = (i * 100) + (this.gameState.backgroundOffset * 0.5) % 100;
            this.ctx.fillRect(x, this.canvas.height - 140, 20, 20);
            this.ctx.fillRect(x + 30, this.canvas.height - 120, 15, 15);
        }
        
        // Draw player (Horus)
        this.ctx.fillStyle = this.player.isDashing ? '#FFD700' : '#4169E1';
        this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
        
        // Draw player details (simple falcon head)
        this.ctx.fillStyle = '#FFD700';
        this.ctx.fillRect(this.player.x + 5, this.player.y, 30, 20);
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(this.player.x + 15, this.player.y + 5, 5, 5);
        this.ctx.fillRect(this.player.x + 25, this.player.y + 5, 5, 5);
        
        // Draw obstacles
        for (const obstacle of this.obstacles) {
            this.ctx.fillStyle = obstacle.color;
            this.ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
            
            // Add red eyes for Anubis
            if (obstacle.type === 'anubis') {
                this.ctx.fillStyle = '#FF0000';
                this.ctx.fillRect(obstacle.x + 10, obstacle.y + 10, 5, 5);
                this.ctx.fillRect(obstacle.x + 25, obstacle.y + 10, 5, 5);
            }
        }
        
        // Draw collectibles (soul orbs)
        for (const collectible of this.collectibles) {
            if (!collectible.collected) {
                this.ctx.fillStyle = '#00FFFF';
                this.ctx.beginPath();
                this.ctx.arc(
                    collectible.x + collectible.width / 2,
                    collectible.y + collectible.height / 2,
                    collectible.width / 2,
                    0,
                    Math.PI * 2
                );
                this.ctx.fill();
                
                // Glow effect
                this.ctx.fillStyle = 'rgba(0, 255, 255, 0.3)';
                this.ctx.beginPath();
                this.ctx.arc(
                    collectible.x + collectible.width / 2,
                    collectible.y + collectible.height / 2,
                    collectible.width,
                    0,
                    Math.PI * 2
                );
                this.ctx.fill();
            }
        }
        
        // Draw particles
        for (const particle of this.particles) {
            const alpha = particle.life / 30;
            this.ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
            this.ctx.fillRect(particle.x - 2, particle.y - 2, 4, 4);
        }
        
        // Draw speed lines for effect
        if (this.gameState.gameSpeed > 1.5) {
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            this.ctx.lineWidth = 2;
            for (let i = 0; i < 5; i++) {
                const x = (i * 160) + (this.gameState.backgroundOffset * 2) % 160;
                this.ctx.beginPath();
                this.ctx.moveTo(x, Math.random() * this.canvas.height);
                this.ctx.lineTo(x - 50, Math.random() * this.canvas.height);
                this.ctx.stroke();
            }
        }
    }
    
    gameLoop() {
        if (!this.gameState.isRunning) return;
        
        this.updatePlayer();
        this.spawnObstacle();
        this.updateObstacles();
        this.checkCollisions();
        
        // Increase game speed over time
        this.gameState.gameSpeed = 1 + (30 - this.gameState.timeRemaining) * 0.05;
        
        this.render();
        this.updateScoreDisplay();
        
        this.animationFrame = requestAnimationFrame(() => this.gameLoop());
    }
    
    updateScoreDisplay() {
        document.getElementById('minigame-score').textContent = this.gameState.score;
    }
    
    updateTimerDisplay() {
        const timerFill = document.getElementById('minigame-timer-fill');
        const percentage = (this.gameState.timeRemaining / 30) * 100;
        timerFill.style.width = percentage + '%';
        
        // Change color based on time remaining
        if (this.gameState.timeRemaining <= 10) {
            timerFill.style.backgroundColor = '#FF4500';
        } else if (this.gameState.timeRemaining <= 20) {
            timerFill.style.backgroundColor = '#FFD700';
        } else {
            timerFill.style.backgroundColor = '#00FF00';
        }
        
        document.querySelector('.timer-text').textContent = this.gameState.timeRemaining + 's';
    }
    
    endGame() {
        this.gameState.isRunning = false;
        
        if (this.gameTimer) {
            clearInterval(this.gameTimer);
        }
        
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        
        // Update high score
        if (this.gameState.score > this.gameState.highScore) {
            this.gameState.highScore = this.gameState.score;
            localStorage.setItem('anubis-gauntlet-high-score', this.gameState.highScore.toString());
            document.getElementById('minigame-high-score').textContent = this.gameState.highScore;
        }
        
        // Play end sound
        this.playSound(200, 0.5);
        
        // Return to main game with score
        if (window.game && window.game.onMiniGameComplete) {
            window.game.onMiniGameComplete(this.gameState.score);
        }
    }
}

// Initialize mini-game when page loads
window.addEventListener('DOMContentLoaded', () => {
    window.anubisGauntlet = new AnubisGauntlet();
});

