export class StartScreen {
    private element: HTMLElement;
    private levelSelector: HTMLElement;
    private selectedLevel: number = 1;
    private totalLevels: number = 13;

    // Level progression state
    private unlockedLevels: number = 5; // Initially unlock first 5 levels
    private allUnlockedCheat: boolean = false; // Session-based cheat mode

    // Cheat code tracking (5 taps on title within 2 seconds)
    private titleTapTimes: number[] = [];
    private readonly CHEAT_TAP_COUNT = 5;
    private readonly CHEAT_TIME_WINDOW_MS = 2000;

    // Navigation state
    private focusIndex: number = 0; // 0: Levels, 1: Play, 2: Credits
    private readonly SHIP_BLUE = '#2e9afe'; // A nice ship-like blue

    // Storage key for level progression
    private readonly STORAGE_KEY = 'gravitywars_unlocked_levels';

    constructor(container: HTMLElement, private onPlay: (level: number) => void) {
        // Load saved progression from localStorage
        this.loadProgress();

        this.element = document.createElement('div');
        this.element.className = 'ui-screen hidden';
        this.element.style.position = 'absolute';
        this.element.style.top = '0';
        this.element.style.left = '0';
        this.element.style.width = '100%';
        this.element.style.height = '100%';
        this.element.style.display = 'flex';
        this.element.style.flexDirection = 'column';
        this.element.style.alignItems = 'center';
        this.element.style.justifyContent = 'center';
        this.element.style.background = 'rgba(0, 0, 0, 0.6)';
        this.element.style.color = '#fff';
        this.element.style.zIndex = '10';
        this.element.style.backdropFilter = 'blur(2px)';

        this.element.innerHTML = `
            <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%;">
                <div class="title-container" style="text-align: center; margin-bottom: 40px;">
                    <h1 id="title-text" class="galactic-text" style="font-size: 64px; margin: 0; color: ${this.SHIP_BLUE}; text-shadow: 0 0 20px rgba(46, 154, 254, 0.5); cursor: pointer; user-select: none;">GRAVITY WARS</h1>
                    <h2 style="font-size: 18px; color: #888; font-weight: normal; margin-top: 10px;">- THE BEGINNING -</h2>
                </div>
                
                <div class="level-section" style="text-align: center; margin-bottom: 30px;">
                    <div class="level-label" style="font-size: 14px; color: #aaa; margin-bottom: 15px; letter-spacing: 2px;">SELECT STARTING LEVEL</div>
                    <div class="level-selector-wrapper" style="width: 300px; overflow: hidden; position: relative; padding: 10px 0;">
                        <div class="level-selector" id="level-selector" style="display: flex; gap: 20px; transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1); padding-left: 130px;">
                            <!-- Levels injected here -->
                        </div>
                        <div class="selector-highlight" style="
                            position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); 
                            width: 50px; height: 50px; 
                            border: 2px solid ${this.SHIP_BLUE}; 
                            border-radius: 8px; 
                            box-shadow: 0 0 15px rgba(46, 154, 254, 0.3); 
                            pointer-events: none;
                            transition: all 0.2s;
                        "></div>
                    </div>
                </div>

                <div class="menu-buttons" style="display: flex; flex-direction: column; gap: 15px; width: 240px;">
                    <button id="btn-play" style="
                        background: rgba(46, 154, 254, 0.1); 
                        border: 1px solid ${this.SHIP_BLUE}; 
                        color: ${this.SHIP_BLUE}; 
                        padding: 15px; 
                        font-family: inherit; 
                        font-size: 18px; 
                        cursor: pointer; 
                        transition: all 0.2s; 
                        border-radius: 4px;
                        outline: none;
                    ">PLAY</button>
                    <div style="display: flex; gap: 15px;">
                         <button id="btn-credits" style="
                            flex: 1; 
                            background: rgba(255, 255, 255, 0.05); 
                            border: 1px solid rgba(46, 154, 254, 0.5); 
                            color: #aaa; 
                            padding: 10px; 
                            cursor: pointer; 
                            font-family: inherit; 
                            border-radius: 4px;
                            outline: none;
                            transition: all 0.2s;
                        ">CREDITS</button>
                    </div>
                </div>
            </div>

            <div class="desktop-controls-hint" style="
                margin-bottom: 30px; 
                font-size: 13px; 
                color: #666; 
                text-align: center; 
                line-height: 1.6; 
                font-family: monospace; 
                letter-spacing: 1px;
            ">
                <div style="margin-bottom: 4px;">STEER WITH <span style="color: ${this.SHIP_BLUE};">ARROW KEYS</span></div>
                <div>FIRE WITH <span style="color: ${this.SHIP_BLUE};">SPACE BAR</span></div>
            </div>

            <div id="credits-modal" class="hidden" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); flex-direction: column; align-items: center; justify-content: center; z-index: 20; display: none;">
                <h2 class="galactic-text" style="color: ${this.SHIP_BLUE}; margin-bottom: 30px;">CREDITS</h2>
                <div style="text-align: center; line-height: 2; color: #ccc;">
                    <p><span style="color: #888;">Game development:</span> <strong>Sami Niemi</strong> <span style="color: ${this.SHIP_BLUE};">@smniemi</span></p>
                    <p><span style="color: #888;">Game graphics:</span> <strong>Pär Johannesson</strong></p>
                    <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #333;">
                        <p style="margin: 8px 0;"><span style="color: ${this.SHIP_BLUE};">1995</span> <span style="color: #666;">—</span> Linux</p>
                        <p style="margin: 8px 0;"><span style="color: ${this.SHIP_BLUE};">2019</span> <span style="color: #666;">—</span> iPhone</p>
                        <p style="margin: 8px 0;"><span style="color: ${this.SHIP_BLUE};">2025</span> <span style="color: #666;">—</span> Web</p>
                    </div>
                </div>
                <button id="btn-close-credits" style="margin-top: 40px; background: none; border: 1px solid #666; color: #fff; padding: 8px 30px; cursor: pointer;">BACK</button>
            </div>
        `;
        container.appendChild(this.element);

        this.levelSelector = this.element.querySelector('#level-selector') as HTMLElement;
        this.renderLevels();
        this.setupInput();
        this.setupButtons();
        this.updateFocusVisuals();

        // Mouse hover interactions updates focus state
        const playBtn = this.element.querySelector('#btn-play') as HTMLElement;
        playBtn.onmouseenter = () => { this.focusIndex = 1; this.updateFocusVisuals(); };

        const creditsBtn = this.element.querySelector('#btn-credits') as HTMLElement;
        creditsBtn.onmouseenter = () => { this.focusIndex = 2; this.updateFocusVisuals(); };
    }

    private renderLevels() {
        this.levelSelector.innerHTML = '';
        for (let i = 1; i <= this.totalLevels; i++) {
            const isUnlocked = this.isLevelUnlocked(i);
            const el = document.createElement('div');
            el.className = 'level-item';
            el.style.minWidth = '40px';
            el.style.textAlign = 'center';
            el.style.fontSize = '24px';
            el.style.transition = 'all 0.3s';
            el.dataset.level = i.toString();

            if (isUnlocked) {
                el.style.color = '#555';
                el.style.cursor = 'pointer';
                el.textContent = i < 10 ? `0${i}` : `${i}`;
                el.onclick = () => {
                    this.selectedLevel = i;
                    this.focusIndex = 0;
                    this.updateLevelSelection();
                    this.updateFocusVisuals();
                };
            } else {
                // Locked level styling
                el.style.color = '#333';
                el.style.cursor = 'not-allowed';
                el.style.opacity = '0.4';
                el.innerHTML = `<span style="position: relative;">
                    ${i < 10 ? `0${i}` : `${i}`}
                    <span style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 14px;">🔒</span>
                </span>`;
                el.onclick = () => {
                    // Do nothing for locked levels, but give visual feedback
                    el.style.transform = 'scale(0.9)';
                    setTimeout(() => {
                        el.style.transform = 'scale(1)';
                    }, 100);
                };
            }

            this.levelSelector.appendChild(el);
        }
        this.updateLevelSelection();
    }

    private updateLevelSelection() {
        const items = Array.from(this.levelSelector.children) as HTMLElement[];
        const itemWidth = 60; // 40px width + 20px gap

        // Update visual styles
        items.forEach(item => {
            const level = parseInt(item.dataset.level || '0');
            const isUnlocked = this.isLevelUnlocked(level);

            if (!isUnlocked) {
                // Keep locked styling - don't modify
                return;
            }

            if (level === this.selectedLevel) {
                item.style.color = '#fff';
                item.style.transform = 'scale(1.2)';
                item.style.textShadow = `0 0 10px ${this.SHIP_BLUE}`;
                item.style.opacity = '1';
            } else {
                item.style.color = '#555';
                item.style.transform = 'scale(1)';
                item.style.textShadow = 'none';
                item.style.opacity = '1';
            }
        });

        // Center the selected item
        const index = this.selectedLevel - 1;
        this.levelSelector.style.transform = `translateX(${-index * itemWidth}px)`;
    }

    private updateFocusVisuals() {
        const highlight = this.element.querySelector('.selector-highlight') as HTMLElement;
        const playBtn = this.element.querySelector('#btn-play') as HTMLElement;
        const creditsBtn = this.element.querySelector('#btn-credits') as HTMLElement;

        // Reset
        highlight.style.opacity = '0.3';
        highlight.style.borderColor = '#444';

        playBtn.style.background = 'rgba(46, 154, 254, 0.1)';
        playBtn.style.boxShadow = 'none';

        creditsBtn.style.background = 'rgba(255, 255, 255, 0.05)';
        creditsBtn.style.color = '#aaa';

        switch (this.focusIndex) {
            case 0: // Levels
                highlight.style.opacity = '1';
                highlight.style.borderColor = this.SHIP_BLUE;
                highlight.style.boxShadow = `0 0 15px rgba(46, 154, 254, 0.3)`;
                break;
            case 1: // Play
                playBtn.style.background = 'rgba(46, 154, 254, 0.3)';
                playBtn.style.boxShadow = `0 0 20px rgba(46, 154, 254, 0.4)`;
                break;
            case 2: // Credits
                creditsBtn.style.background = 'rgba(46, 154, 254, 0.2)';
                creditsBtn.style.color = '#fff';
                break;
        }
    }

    private setupInput() {
        // Simple drag logic for level selector
        let isDown = false;
        let startX = 0;
        const wrapper = this.element.querySelector('.level-selector-wrapper') as HTMLElement;

        wrapper.addEventListener('mousedown', (e) => {
            isDown = true;
            startX = e.pageX;
            this.focusIndex = 0;
            this.updateFocusVisuals();
        });

        window.addEventListener('mouseup', () => {
            isDown = false;
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            const x = e.pageX;
            const walk = (x - startX);
            if (Math.abs(walk) > 40) {
                if (walk > 0) this.selectPrev();
                else this.selectNext();
                startX = x;
            }
        });

        // Keyboard support
        window.addEventListener('keydown', (e) => {
            // Only handle inputs if screen is visible
            if (this.element.style.display === 'none') return;

            // Allow arrow keys to control UI
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Enter'].includes(e.key)) {
                e.preventDefault();
            }

            switch (e.key) {
                case 'ArrowUp':
                    this.focusIndex = (this.focusIndex - 1 + 3) % 3;
                    this.updateFocusVisuals();
                    break;
                case 'ArrowDown':
                    this.focusIndex = (this.focusIndex + 1) % 3;
                    this.updateFocusVisuals();
                    break;
                case 'ArrowLeft':
                    if (this.focusIndex === 0) this.selectPrev();
                    break;
                case 'ArrowRight':
                    if (this.focusIndex === 0) this.selectNext();
                    break;
                case 'Enter':
                case ' ':
                    this.triggerSelection();
                    break;
            }
        });

        // Touch support
        wrapper.addEventListener('touchstart', (e) => {
            startX = e.touches[0].pageX;
            this.focusIndex = 0;
            this.updateFocusVisuals();
        }, { passive: true });

        wrapper.addEventListener('touchmove', (e) => {
            const x = e.touches[0].pageX;
            const walk = (x - startX);
            if (Math.abs(walk) > 40) {
                if (walk > 0) this.selectPrev();
                else this.selectNext();
                startX = x;
            }
        }, { passive: true });
    }

    private triggerSelection() {
        if (this.focusIndex === 0 || this.focusIndex === 1) {
            // Play (Levels or Play button both start game)
            // Only allow if level is unlocked
            if (this.isLevelUnlocked(this.selectedLevel)) {
                this.onPlay(this.selectedLevel);
            }
        } else if (this.focusIndex === 2) {
            // Credits
            const creditsModal = this.element.querySelector('#credits-modal') as HTMLElement;
            creditsModal.style.display = 'flex';
            setTimeout(() => creditsModal.style.opacity = '1', 10);
        }
    }

    private selectNext() {
        // Only allow selecting unlocked levels
        if (this.selectedLevel < this.totalLevels && this.isLevelUnlocked(this.selectedLevel + 1)) {
            this.selectedLevel++;
            this.updateLevelSelection();
        }
    }

    private selectPrev() {
        if (this.selectedLevel > 1) {
            this.selectedLevel--;
            this.updateLevelSelection();
        }
    }

    private setupButtons() {
        // Play - verify level is unlocked before starting
        this.element.querySelector('#btn-play')?.addEventListener('click', () => {
            if (this.isLevelUnlocked(this.selectedLevel)) {
                this.onPlay(this.selectedLevel);
            }
        });

        // Credits Modal
        const creditsModal = this.element.querySelector('#credits-modal') as HTMLElement;
        this.element.querySelector('#btn-credits')?.addEventListener('click', () => {
            creditsModal.style.display = 'flex';
            setTimeout(() => creditsModal.style.opacity = '1', 10);
        });

        this.element.querySelector('#btn-close-credits')?.addEventListener('click', () => {
            creditsModal.style.display = 'none';
        });

        // Cheat code: Tap title 5 times within 2 seconds to unlock all levels
        const titleText = this.element.querySelector('#title-text') as HTMLElement;
        if (titleText) {
            const handleTitleTap = () => {
                const now = Date.now();
                this.titleTapTimes.push(now);

                // Remove taps older than the time window
                this.titleTapTimes = this.titleTapTimes.filter(
                    t => now - t < this.CHEAT_TIME_WINDOW_MS
                );

                // Check if we have enough taps
                if (this.titleTapTimes.length >= this.CHEAT_TAP_COUNT) {
                    this.activateCheatMode();
                    this.titleTapTimes = []; // Reset
                }
            };

            titleText.addEventListener('click', handleTitleTap);
            titleText.addEventListener('touchend', (e) => {
                e.preventDefault();
                handleTitleTap();
            });
        }
    }

    public show() {
        this.element.style.display = 'flex';
        // Re-render levels in case progression changed
        this.renderLevels();
        this.updateLevelSelection();
        this.focusIndex = 0; // Reset focus to levels on show
        this.updateFocusVisuals();
    }

    public hide() {
        this.element.style.display = 'none';
    }

    // ========== Level Progression Methods ==========

    /**
     * Load saved progression from localStorage
     */
    private loadProgress(): void {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                const parsed = parseInt(saved, 10);
                if (!isNaN(parsed) && parsed >= 5) {
                    this.unlockedLevels = Math.min(parsed, this.totalLevels);
                }
            }
        } catch (e) {
            console.warn('[StartScreen] Could not load progress from localStorage:', e);
        }
    }

    /**
     * Save progression to localStorage
     */
    private saveProgress(): void {
        try {
            localStorage.setItem(this.STORAGE_KEY, this.unlockedLevels.toString());
        } catch (e) {
            console.warn('[StartScreen] Could not save progress to localStorage:', e);
        }
    }

    /**
     * Check if a level is unlocked
     */
    private isLevelUnlocked(level: number): boolean {
        if (this.allUnlockedCheat) {
            return true;
        }
        return level <= this.unlockedLevels;
    }

    /**
     * Unlock a specific level (and all before it)
     * Called when a level is completed
     */
    public unlockLevel(level: number): void {
        if (level > this.unlockedLevels) {
            this.unlockedLevels = Math.min(level, this.totalLevels);
            this.saveProgress();
            console.log(`[StartScreen] Level ${level} unlocked! Total unlocked: ${this.unlockedLevels}`);
        }
    }

    /**
     * Activate cheat mode - unlock all levels for this session
     */
    private activateCheatMode(): void {
        this.allUnlockedCheat = true;
        console.log('[StartScreen] 🎮 CHEAT MODE ACTIVATED! All levels unlocked for this session.');

        // Flash the title to indicate cheat activation
        const titleText = this.element.querySelector('#title-text') as HTMLElement;
        if (titleText) {
            const originalColor = titleText.style.color;
            titleText.style.color = '#ff0';
            titleText.style.textShadow = '0 0 30px #ff0, 0 0 60px #ff0';
            setTimeout(() => {
                titleText.style.color = '#0f0';
                titleText.style.textShadow = '0 0 30px #0f0, 0 0 60px #0f0';
                setTimeout(() => {
                    titleText.style.color = originalColor;
                    titleText.style.textShadow = `0 0 20px rgba(46, 154, 254, 0.5)`;
                }, 200);
            }, 200);
        }

        // Re-render levels to show all as unlocked
        this.renderLevels();
    }
}
