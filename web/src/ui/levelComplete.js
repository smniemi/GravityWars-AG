export class LevelCompleteScreen {
    onContinue;
    element;
    isVisible = false;
    animationFrame = null;
    constructor(container, onContinue) {
        this.onContinue = onContinue;
        this.element = document.createElement('div');
        this.element.className = 'level-complete-screen';
        this.element.style.position = 'absolute';
        this.element.style.top = '0';
        this.element.style.left = '0';
        this.element.style.width = '100%';
        this.element.style.height = '100%';
        this.element.style.display = 'none';
        this.element.style.flexDirection = 'column';
        this.element.style.alignItems = 'center';
        this.element.style.justifyContent = 'center';
        this.element.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
        this.element.style.backdropFilter = 'blur(5px)';
        this.element.style.zIndex = '90';
        this.element.style.opacity = '0';
        this.element.style.transition = 'opacity 0.3s ease-out';
        this.element.style.cursor = 'pointer';
        this.element.innerHTML = `
            <div class="lc-content" style="text-align: center;">
                <h2 class="galactic-text" style="color: #0af; font-size: 24px; margin: 0 0 10px 0; letter-spacing: 4px;">LEVEL COMPLETED</h2>
                <h1 id="lc-level-name" class="galactic-text" style="color: #fff; font-size: 48px; margin: 0 0 5px 0; text-shadow: 0 0 20px #0af;">LEVEL X</h1>
                <div class="galactic-text" style="color: #0f0; font-size: 32px; margin-bottom: 40px; text-shadow: 0 0 10px #0f0;">WELL DONE!</div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; text-align: left; max-width: 400px; margin: 0 auto; font-family: monospace; font-size: 18px; color: #ccc;">
                    <div style="text-align: right;">SCORE</div>
                    <div id="lc-base-score" style="color: #fff;">0</div>

                    <div style="text-align: right;">TIME BONUS</div>
                    <div id="lc-time-bonus" style="color: #fff;">0</div>
                    
                    <div style="text-align: right;">FUEL BONUS</div>
                    <div id="lc-fuel-bonus" style="color: #fff;">0</div>
                </div>

                <div style="margin-top: 30px; font-size: 24px; color: #fff; font-family: monospace;">
                    TOTAL SCORE: <span id="lc-score" style="color: #ff0; font-weight: bold;">0</span>
                </div>

                <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1); display: grid; grid-template-columns: 1fr 1fr; gap: 40px; font-size: 14px; font-family: monospace; color: #888;">
                    <div style="text-align: right;">
                        <div>PERSONAL BEST</div>
                        <div id="lc-pb" style="color: #fff; font-size: 18px; margin-top: 5px;">0</div>
                    </div>
                    <div style="text-align: left;">
                        <div>HIGH SCORE</div>
                        <div id="lc-high" style="color: #fff; font-size: 18px; margin-top: 5px;">0</div>
                    </div>
                </div>

                <div style="margin-top: 50px; color: #0af; animation: pulse 1.5s infinite; font-size: 14px; letter-spacing: 2px;">
                    TAP OR PRESS FIRE TO CONTINUE
                </div>
            </div>
            <style>
                @keyframes pulse {
                    0% { opacity: 0.5; }
                    50% { opacity: 1; }
                    100% { opacity: 0.5; }
                }
            </style>
        `;
        container.appendChild(this.element);
        this.element.addEventListener('click', () => this.handleInput());
    }
    setOnContinue(callback) {
        this.onContinue = callback;
    }
    handleInput() {
        if (this.isVisible) {
            this.hide();
            this.onContinue();
        }
    }
    handleKey = (e) => {
        if (!this.isVisible)
            return;
        if (e.code === 'Space' || e.code === 'Enter' || e.key === ' ' || e.key === 'Enter') {
            this.handleInput();
        }
    };
    show(stats) {
        this.isVisible = true;
        this.element.style.display = 'flex';
        // Trigger reflow
        void this.element.offsetWidth;
        this.element.style.opacity = '1';
        window.addEventListener('keydown', this.handleKey);
        const nameEl = this.element.querySelector('#lc-level-name');
        if (nameEl)
            nameEl.textContent = stats.levelName;
        const timeBonus = Math.floor(stats.time * 10);
        const fuelBonus = Math.floor(stats.fuel);
        const totalBonus = timeBonus + fuelBonus;
        const finalScore = stats.currentScore + totalBonus;
        const levelScore = finalScore - stats.levelStartScore;
        // Local Storage Handling
        const storageKey = `gw_pb_level_${stats.levelIndex}`;
        const storedPb = localStorage.getItem(storageKey);
        let pb = storedPb ? parseInt(storedPb, 10) : 0;
        // Update PB if new score is higher
        // PB tracks the score GAINED in the level, not total score
        if (levelScore > pb) {
            pb = levelScore;
            localStorage.setItem(storageKey, pb.toString());
        }
        // Mock High score (randomly slightly higher than PB or same)
        const highScore = pb;
        const pbEl = this.element.querySelector('#lc-pb');
        if (pbEl)
            pbEl.textContent = pb.toLocaleString();
        const highEl = this.element.querySelector('#lc-high');
        if (highEl)
            highEl.textContent = highScore.toLocaleString();
        // Animation
        const baseScoreEl = this.element.querySelector('#lc-base-score');
        const timeBonusEl = this.element.querySelector('#lc-time-bonus');
        const fuelBonusEl = this.element.querySelector('#lc-fuel-bonus');
        const scoreEl = this.element.querySelector('#lc-score');
        if (baseScoreEl)
            baseScoreEl.textContent = stats.currentScore.toLocaleString();
        if (timeBonusEl)
            timeBonusEl.textContent = `+${timeBonus}`;
        if (fuelBonusEl)
            fuelBonusEl.textContent = `+${fuelBonus}`;
        if (scoreEl)
            scoreEl.textContent = stats.currentScore.toLocaleString();
        console.log('[LevelComplete] Starting animation:', {
            currentScore: stats.currentScore,
            timeBonus,
            fuelBonus,
            totalBonus,
            finalScore
        });
        const duration = 2000; // 2 seconds to count up
        let startTime = null;
        const animate = (now) => {
            if (!this.isVisible) {
                console.log('[LevelComplete] Animation stopped - not visible');
                return;
            }
            // Capture start time on first frame
            if (startTime === null) {
                startTime = now;
            }
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1.0);
            // Ease out cubic
            const ease = 1 - Math.pow(1 - progress, 3);
            const currentAdd = Math.floor(totalBonus * ease);
            const displayScore = stats.currentScore + currentAdd;
            if (scoreEl)
                scoreEl.textContent = displayScore.toLocaleString();
            if (progress < 1.0) {
                this.animationFrame = requestAnimationFrame(animate);
            }
            else {
                if (scoreEl)
                    scoreEl.textContent = finalScore.toLocaleString();
                console.log('[LevelComplete] Animation complete, final score:', finalScore);
            }
        };
        // Cancel any previous animation
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        this.animationFrame = requestAnimationFrame(animate);
    }
    hide() {
        this.isVisible = false;
        window.removeEventListener('keydown', this.handleKey);
        this.element.style.opacity = '0';
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        setTimeout(() => {
            this.element.style.display = 'none';
        }, 300);
    }
}
