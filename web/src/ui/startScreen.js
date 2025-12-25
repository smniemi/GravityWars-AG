export class StartScreen {
    onPlay;
    element;
    levelSelector;
    selectedLevel = 1;
    totalLevels = 60;
    // Navigation state
    focusIndex = 0; // 0: Levels, 1: Play, 2: Credits
    SHIP_BLUE = '#2e9afe'; // A nice ship-like blue
    constructor(container, onPlay) {
        this.onPlay = onPlay;
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
                    <h1 class="galactic-text" style="font-size: 64px; margin: 0; color: ${this.SHIP_BLUE}; text-shadow: 0 0 20px rgba(46, 154, 254, 0.5);">GRAVITY WARS</h1>
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
                <div style="text-align: center; line-height: 1.6; color: #ccc;">
                    <p>Created by <strong>Your Name / Team</strong></p>
                    <p>Use Joystick / Touches to move</p>
                    <p>Music by ...</p>
                </div>
                <button id="btn-close-credits" style="margin-top: 40px; background: none; border: 1px solid #666; color: #fff; padding: 8px 30px; cursor: pointer;">BACK</button>
            </div>
        `;
        container.appendChild(this.element);
        this.levelSelector = this.element.querySelector('#level-selector');
        this.renderLevels();
        this.setupInput();
        this.setupButtons();
        this.updateFocusVisuals();
        // Mouse hover interactions updates focus state
        const playBtn = this.element.querySelector('#btn-play');
        playBtn.onmouseenter = () => { this.focusIndex = 1; this.updateFocusVisuals(); };
        const creditsBtn = this.element.querySelector('#btn-credits');
        creditsBtn.onmouseenter = () => { this.focusIndex = 2; this.updateFocusVisuals(); };
    }
    renderLevels() {
        this.levelSelector.innerHTML = '';
        for (let i = 1; i <= this.totalLevels; i++) {
            const el = document.createElement('div');
            el.className = 'level-item';
            el.style.minWidth = '40px';
            el.style.textAlign = 'center';
            el.style.fontSize = '24px';
            el.style.color = '#555';
            el.style.cursor = 'pointer';
            el.style.transition = 'all 0.3s';
            // Pad with zero if < 10
            el.textContent = i < 10 ? `0${i}` : `${i}`;
            el.dataset.level = i.toString();
            el.onclick = () => {
                this.selectedLevel = i;
                this.focusIndex = 0;
                this.updateLevelSelection();
                this.updateFocusVisuals();
            };
            this.levelSelector.appendChild(el);
        }
        this.updateLevelSelection();
    }
    updateLevelSelection() {
        const items = Array.from(this.levelSelector.children);
        const itemWidth = 60; // 40px width + 20px gap
        // Update visual styles
        items.forEach(item => {
            const level = parseInt(item.dataset.level || '0');
            if (level === this.selectedLevel) {
                item.style.color = '#fff';
                item.style.transform = 'scale(1.2)';
                item.style.textShadow = `0 0 10px ${this.SHIP_BLUE}`;
            }
            else {
                item.style.color = '#555';
                item.style.transform = 'scale(1)';
                item.style.textShadow = 'none';
            }
        });
        // Center the selected item
        const index = this.selectedLevel - 1;
        this.levelSelector.style.transform = `translateX(${-index * itemWidth}px)`;
    }
    updateFocusVisuals() {
        const highlight = this.element.querySelector('.selector-highlight');
        const playBtn = this.element.querySelector('#btn-play');
        const creditsBtn = this.element.querySelector('#btn-credits');
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
    setupInput() {
        // Simple drag logic for level selector
        let isDown = false;
        let startX = 0;
        const wrapper = this.element.querySelector('.level-selector-wrapper');
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
            if (!isDown)
                return;
            const x = e.pageX;
            const walk = (x - startX);
            if (Math.abs(walk) > 40) {
                if (walk > 0)
                    this.selectPrev();
                else
                    this.selectNext();
                startX = x;
            }
        });
        // Keyboard support
        window.addEventListener('keydown', (e) => {
            // Only handle inputs if screen is visible
            if (this.element.style.display === 'none')
                return;
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
                    if (this.focusIndex === 0)
                        this.selectPrev();
                    break;
                case 'ArrowRight':
                    if (this.focusIndex === 0)
                        this.selectNext();
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
                if (walk > 0)
                    this.selectPrev();
                else
                    this.selectNext();
                startX = x;
            }
        }, { passive: true });
    }
    triggerSelection() {
        if (this.focusIndex === 0 || this.focusIndex === 1) {
            // Play (Levels or Play button both start game)
            this.onPlay(this.selectedLevel);
        }
        else if (this.focusIndex === 2) {
            // Credits
            const creditsModal = this.element.querySelector('#credits-modal');
            creditsModal.style.display = 'flex';
            setTimeout(() => creditsModal.style.opacity = '1', 10);
        }
    }
    selectNext() {
        if (this.selectedLevel < this.totalLevels) {
            this.selectedLevel++;
            this.updateLevelSelection();
        }
    }
    selectPrev() {
        if (this.selectedLevel > 1) {
            this.selectedLevel--;
            this.updateLevelSelection();
        }
    }
    setupButtons() {
        // Play
        this.element.querySelector('#btn-play')?.addEventListener('click', () => {
            this.onPlay(this.selectedLevel);
        });
        // Credits Modal
        const creditsModal = this.element.querySelector('#credits-modal');
        this.element.querySelector('#btn-credits')?.addEventListener('click', () => {
            creditsModal.style.display = 'flex';
            setTimeout(() => creditsModal.style.opacity = '1', 10);
        });
        this.element.querySelector('#btn-close-credits')?.addEventListener('click', () => {
            creditsModal.style.display = 'none';
        });
    }
    show() {
        this.element.style.display = 'flex';
        // Reset to Level 1 visually or keep last selected?
        // this.selectedLevel = 1; 
        this.updateLevelSelection();
        this.focusIndex = 0; // Reset focus to levels on show
        this.updateFocusVisuals();
    }
    hide() {
        this.element.style.display = 'none';
    }
}
