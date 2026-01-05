

export class LevelCompleteScreen {
    private element: HTMLElement;
    private isVisible: boolean = false;
    private animationFrame: number | null = null;
    private onContinue: () => void = () => { };

    constructor(container: HTMLElement, onContinueCallback: () => void) {
        this.onContinue = onContinueCallback;
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
                        <div style="color: #0f0; font-size: 12px; margin-bottom: 2px; opacity: 0; transition: opacity 0.5s;" id="lc-new-pb-label">NEW RECORD!</div>
                        <div>PERSONAL BEST</div>
                        <div id="lc-pb" style="color: #fff; font-size: 18px; margin-top: 2px;">0</div>
                    </div>
                    <div style="text-align: left;">
                        <div style="color: #0f0; font-size: 12px; margin-bottom: 2px; opacity: 0; transition: opacity 0.5s;" id="lc-new-high-label">NEW RECORD!</div>
                        <div>HIGH SCORE</div>
                        <div id="lc-high" style="color: #fff; font-size: 18px; margin-top: 2px;">0</div>
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
                @keyframes rainbow { 
                    0%{color: orange;} 	
                    10%{color: purple;} 	
                    20%{color: red;} 
                    30%{color: CadetBlue;} 
                    40%{color: yellow;} 
                    50%{color: coral;} 
                    60%{color: green;} 
                    70%{color: cyan;} 
                    80%{color: DeepPink;} 
                    90%{color: DodgerBlue;} 
                    100%{color: orange;} 
                }
                .record-pulse {
                    animation: pulse 0.5s infinite alternate;
                    color: yellow !important;
                    font-weight: bold;
                    text-shadow: 0 0 10px yellow;
                }
            </style>
        `;
        container.appendChild(this.element);

        // Click for desktop
        this.element.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('[LevelComplete] Click detected');
            this.handleInput();
        });

        // Touchend for mobile (more reliable than click on touch devices)
        this.element.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('[LevelComplete] Touch detected');
            this.handleInput();
        });
    }

    public setOnContinue(callback: () => void) {
        this.onContinue = callback;
    }

    private handleInput() {
        console.log('[LevelComplete] handleInput called, isVisible:', this.isVisible);
        if (this.isVisible) {
            console.log('[LevelComplete] Calling hide and onContinue');
            this.hide();
            this.onContinue();
        }
    }

    private handleKey = (e: KeyboardEvent) => {
        if (!this.isVisible) return;
        if (e.code === 'Space' || e.code === 'Enter' || e.key === ' ' || e.key === 'Enter') {
            this.handleInput();
        }
    }

    public show(stats: {
        levelName: string,
        time: number,
        fuel: number,
        currentScore: number,
        levelIndex: number,
        levelStartScore: number
    }) {
        this.isVisible = true;
        this.element.style.display = 'flex';
        // Trigger reflow
        void this.element.offsetWidth;
        this.element.style.opacity = '1';
        window.addEventListener('keydown', this.handleKey);

        const nameEl = this.element.querySelector('#lc-level-name');
        if (nameEl) nameEl.textContent = stats.levelName;

        const timeBonus = Math.floor(stats.time * 10);
        const fuelBonus = Math.floor(stats.fuel);
        const totalBonus = timeBonus + fuelBonus;

        // Level Score = Points collected in level + Time Bonus + Fuel Bonus
        // Since we reset ShipScore at level start now, currentScore IS the points collected.
        // Wait, currentScore is shipScore from WASM. If we reset at start, it is just score obtained.
        // So Final Score for this level = currentScore + bonuses.
        const levelTotalScore = stats.currentScore + totalBonus;

        // Local Storage Handling
        const storageKey = `gw_pb_level_${stats.levelIndex}`;
        const storedPbStr = localStorage.getItem(storageKey);
        const storedPb = storedPbStr ? parseInt(storedPbStr, 10) : 0;

        const isNewRecord = levelTotalScore > storedPb;
        const previousBest = storedPb;

        // Update stored record
        if (isNewRecord) {
            localStorage.setItem(storageKey, levelTotalScore.toString());
        }

        // --- Mock High Score Logic ---
        // For simplicity, High Score = Personal Best in this local-only version.
        const storedHigh = previousBest;
        // const isNewHigh = isNewRecord;

        // Initial UI State (Before Animation)
        const pbEl = this.element.querySelector('#lc-pb');
        const highEl = this.element.querySelector('#lc-high');
        const pbLabelEl = this.element.querySelector('#lc-new-pb-label') as HTMLElement;
        const highLabelEl = this.element.querySelector('#lc-new-high-label') as HTMLElement;

        if (pbEl) pbEl.textContent = previousBest.toLocaleString();
        if (highEl) highEl.textContent = storedHigh.toLocaleString();

        if (pbLabelEl) pbLabelEl.style.opacity = '0';
        if (highLabelEl) highLabelEl.style.opacity = '0';
        if (pbEl) pbEl.classList.remove('record-pulse');
        if (highEl) highEl.classList.remove('record-pulse');

        // Main Animation Setup
        const baseScoreEl = this.element.querySelector('#lc-base-score');
        const timeBonusEl = this.element.querySelector('#lc-time-bonus');
        const fuelBonusEl = this.element.querySelector('#lc-fuel-bonus');
        const scoreEl = this.element.querySelector('#lc-score');

        if (baseScoreEl) baseScoreEl.textContent = stats.currentScore.toLocaleString();
        if (timeBonusEl) timeBonusEl.textContent = `+${timeBonus}`;
        if (fuelBonusEl) fuelBonusEl.textContent = `+${fuelBonus}`;
        if (scoreEl) scoreEl.textContent = stats.currentScore.toLocaleString(); // Start at base score

        console.log('[LevelComplete] Starting animation:', {
            currentScore: stats.currentScore,
            totalBonus,
            finalScore: levelTotalScore,
            previousBest,
            isNewRecord
        });

        const duration = 2000; // 2 seconds to count up total score
        let startTime: number | null = null;
        let pbAnimationTriggered = false;

        const animate = (now: number) => {
            if (!this.isVisible) return;

            if (startTime === null) startTime = now;
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1.0);

            // Ease out cubic
            const ease = 1 - Math.pow(1 - progress, 3);
            const currentAdd = Math.floor(totalBonus * ease);
            const currentDisplayedScore = stats.currentScore + currentAdd;

            if (scoreEl) scoreEl.textContent = currentDisplayedScore.toLocaleString();

            // Trigger "New Record" animations once the main score has finished counting up
            // Or maybe animate them in parallel? Let's do it after main counter finishes for drama.
            if (progress >= 1.0 && !pbAnimationTriggered && isNewRecord) {
                pbAnimationTriggered = true;
                this.animateRecordUpdate(previousBest, levelTotalScore, pbEl, pbLabelEl);
                this.animateRecordUpdate(storedHigh, levelTotalScore, highEl, highLabelEl);
            }

            if (progress < 1.0 || (isNewRecord && !pbAnimationDone)) {
                // Keep loop running if main animation not done OR record animation running
                this.animationFrame = requestAnimationFrame(animate);
            } else {
                if (!isNewRecord) {
                    console.log('[LevelComplete] Animation complete (No new record)');
                }
            }
        };

        // Track record animation state separately if needed, but a simple fire-and-forget 
        // secondary animation loop is easier.
        let pbAnimationDone = !isNewRecord;

        // Reset animation frame
        if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
        this.animationFrame = requestAnimationFrame(animate);
    }

    private animateRecordUpdate(startValue: number, endValue: number, element: Element | null, labelElement: HTMLElement | null) {
        if (!element) return;

        // Delay slightly for effect
        setTimeout(() => {
            if (!this.isVisible) return;

            // Show "NEW RECORD!" label
            if (labelElement) {
                labelElement.style.opacity = '1';
                labelElement.style.animation = 'rainbow 0.5s infinite'; // Flashy
            }

            // Pulse the number
            element.classList.add('record-pulse');

            // Count up
            const duration = 1000;
            const startTime = performance.now();

            const animatePb = (now: number) => {
                if (!this.isVisible) return;
                const elapsed = now - startTime;
                const progress = Math.min(elapsed / duration, 1.0);
                const ease = 1 - Math.pow(1 - progress, 3);

                const val = Math.floor(startValue + (endValue - startValue) * ease);
                element.textContent = val.toLocaleString();

                if (progress < 1.0) {
                    requestAnimationFrame(animatePb);
                } else {
                    element.textContent = endValue.toLocaleString();
                }
            };
            requestAnimationFrame(animatePb);

        }, 500); // 0.5s delay after main score finishes
    }

    public hide() {
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
