export class GameOverScreen {
    onReplay;
    onMenu;
    element;
    focusIndex = 0; // 0: Replay, 1: Menu
    SHIP_BLUE = '#2e9afe';
    constructor(container, onReplay, onMenu) {
        this.onReplay = onReplay;
        this.onMenu = onMenu;
        this.element = document.createElement('div');
        this.element.className = 'ui-screen hidden';
        this.element.style.position = 'absolute';
        this.element.style.top = '0';
        this.element.style.left = '0';
        this.element.style.width = '100%';
        this.element.style.height = '100%';
        this.element.style.display = 'none';
        this.element.style.flexDirection = 'column';
        this.element.style.alignItems = 'center';
        this.element.style.justifyContent = 'center';
        this.element.style.background = 'rgba(0, 0, 0, 0.85)';
        this.element.style.color = '#fff';
        this.element.style.zIndex = '50';
        this.element.style.backdropFilter = 'blur(4px)';
        this.element.innerHTML = `
            <style>
                @media (max-width: 600px) {
                    .go-title { font-size: 24px !important; }
                    .go-status { font-size: 18px !important; }
                    .go-score { font-size: 16px !important; }
                    .menu-buttons { width: 180px !important; }
                }
            </style>
            <div style="text-align: center; margin-bottom: 40px; width: 100%; padding: 0 20px; box-sizing: border-box;">
                <h1 id="go-level-name" class="galactic-text go-title" style="font-size: 32px; margin: 0; color: ${this.SHIP_BLUE}; text-shadow: 0 0 10px rgba(46, 154, 254, 0.5); letter-spacing: 2px;">LEVEL NAME</h1>
                <div style="height: 30px;"></div>
                <h2 class="go-status" style="font-size: 24px; color: #ff4444; font-weight: normal; margin: 10px 0; text-transform: uppercase;">You're out of lives</h2>
                <div class="go-score" style="font-size: 18px; color: #fff; margin-top: 20px;">SCORE: <span id="go-score" style="color: #ff0;">0</span></div>
            </div>

            <div class="menu-buttons" style="display: flex; flex-direction: column; gap: 15px; width: 220px;">
                <button id="btn-replay" style="
                    background: rgba(46, 154, 254, 0.1); 
                    border: 1px solid ${this.SHIP_BLUE}; 
                    color: ${this.SHIP_BLUE}; 
                    padding: 12px; 
                    font-family: inherit; 
                    font-size: 16px; 
                    cursor: pointer; 
                    transition: all 0.2s; 
                    border-radius: 4px; 
                    text-transform: uppercase;
                    outline: none;
                ">Replay</button>
                <button id="btn-menu" style="
                    background: rgba(255, 255, 255, 0.05); 
                    border: 1px solid rgba(46, 154, 254, 0.5); 
                    color: #aaa; 
                    padding: 12px; 
                    cursor: pointer; 
                    font-family: inherit; 
                    font-size: 16px; 
                    border-radius: 4px; 
                    text-transform: uppercase;
                    outline: none;
                    transition: all 0.2s;
                ">Go to Menu</button>
            </div>
            
            <div style="margin-top: 30px; font-size: 12px; color: #555; font-family: monospace;">
                USE ARROW KEYS & ENTER
            </div>
        `;
        container.appendChild(this.element);
        this.setupButtons();
    }
    setupButtons() {
        const replayBtn = this.element.querySelector('#btn-replay');
        const menuBtn = this.element.querySelector('#btn-menu');
        // Click handlers
        replayBtn.addEventListener('click', () => {
            this.onReplay();
            this.hide();
        });
        menuBtn.addEventListener('click', () => {
            this.onMenu();
            this.hide();
        });
        // Hover handlers to update focus
        replayBtn.onmouseenter = () => { this.focusIndex = 0; this.updateFocusVisuals(); };
        menuBtn.onmouseenter = () => { this.focusIndex = 1; this.updateFocusVisuals(); };
    }
    handleKey = (e) => {
        if (this.element.style.display === 'none')
            return;
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Enter'].includes(e.key)) {
            e.preventDefault();
        }
        switch (e.key) {
            case 'ArrowUp':
            case 'ArrowDown':
                this.focusIndex = (this.focusIndex === 0) ? 1 : 0;
                this.updateFocusVisuals();
                break;
            case 'Enter':
            case ' ':
                if (this.focusIndex === 0) {
                    this.onReplay();
                    this.hide();
                }
                else {
                    this.onMenu();
                    this.hide();
                }
                break;
        }
    };
    updateFocusVisuals() {
        const replayBtn = this.element.querySelector('#btn-replay');
        const menuBtn = this.element.querySelector('#btn-menu');
        // Reset
        replayBtn.style.background = 'rgba(46, 154, 254, 0.1)';
        replayBtn.style.boxShadow = 'none';
        menuBtn.style.background = 'rgba(255, 255, 255, 0.05)';
        menuBtn.style.color = '#aaa';
        if (this.focusIndex === 0) {
            replayBtn.style.background = 'rgba(46, 154, 254, 0.3)';
            replayBtn.style.boxShadow = '0 0 15px rgba(46, 154, 254, 0.4)';
        }
        else {
            menuBtn.style.background = 'rgba(46, 154, 254, 0.2)';
            menuBtn.style.color = '#fff';
        }
    }
    show(levelName, score) {
        if (this.element.style.display === 'flex')
            return;
        const nameEl = this.element.querySelector('#go-level-name');
        if (nameEl)
            nameEl.textContent = levelName || 'UNKNOWN SECTOR';
        const scoreEl = this.element.querySelector('#go-score');
        if (scoreEl)
            scoreEl.textContent = score.toString();
        this.element.style.display = 'flex';
        this.element.style.opacity = '0';
        // Reset focus to Replay button
        this.focusIndex = 0;
        this.updateFocusVisuals();
        window.addEventListener('keydown', this.handleKey);
        requestAnimationFrame(() => {
            this.element.style.transition = 'opacity 0.5s ease-in-out';
            this.element.style.opacity = '1';
        });
    }
    hide() {
        window.removeEventListener('keydown', this.handleKey);
        this.element.style.display = 'none';
        this.element.style.opacity = '0';
    }
}
