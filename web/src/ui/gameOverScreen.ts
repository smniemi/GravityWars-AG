
export class GameOverScreen {
    private element: HTMLElement;

    constructor(container: HTMLElement, private onReplay: () => void, private onMenu: () => void) {
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
            <div style="text-align: center; margin-bottom: 40px;">
                <h1 id="go-level-name" class="galactic-text" style="font-size: 32px; margin: 0; color: #0ff; text-shadow: 0 0 10px rgba(0, 255, 255, 0.5); letter-spacing: 2px;">LEVEL NAME</h1>
                <div style="height: 30px;"></div>
                <h2 style="font-size: 24px; color: #ff4444; font-weight: normal; margin: 10px 0; text-transform: uppercase;">You're out of lives</h2>
                <div style="font-size: 18px; color: #fff; margin-top: 20px;">SCORE: <span id="go-score" style="color: #ff0;">0</span></div>
            </div>

            <div class="menu-buttons" style="display: flex; flex-direction: column; gap: 15px; width: 200px;">
                <button id="btn-replay" style="background: rgba(0, 255, 255, 0.1); border: 1px solid #0ff; color: #0ff; padding: 12px; font-family: inherit; font-size: 16px; cursor: pointer; transition: all 0.2s; border-radius: 4px; text-transform: uppercase;">Replay</button>
                <button id="btn-menu" style="background: rgba(255, 255, 255, 0.05); border: 1px solid #666; color: #aaa; padding: 12px; cursor: pointer; font-family: inherit; font-size: 16px; border-radius: 4px; text-transform: uppercase;">Go to Menu</button>
            </div>
        `;
        container.appendChild(this.element);

        this.setupButtons();
    }

    private setupButtons() {
        const replayBtn = this.element.querySelector('#btn-replay') as HTMLElement;
        replayBtn.addEventListener('click', () => {
            this.onReplay();
            this.hide();
        });
        replayBtn.onmouseenter = () => { replayBtn.style.background = 'rgba(0, 255, 255, 0.25)'; replayBtn.style.boxShadow = '0 0 15px rgba(0, 255, 255, 0.4)'; };
        replayBtn.onmouseleave = () => { replayBtn.style.background = 'rgba(0, 255, 255, 0.1)'; replayBtn.style.boxShadow = 'none'; };

        const menuBtn = this.element.querySelector('#btn-menu') as HTMLElement;
        menuBtn.addEventListener('click', () => {
            this.onMenu();
            this.hide();
        });
        menuBtn.onmouseenter = () => { menuBtn.style.background = 'rgba(255, 255, 255, 0.1)'; menuBtn.style.borderColor = '#aaa'; menuBtn.style.color = '#fff'; };
        menuBtn.onmouseleave = () => { menuBtn.style.background = 'rgba(255, 255, 255, 0.05)'; menuBtn.style.borderColor = '#666'; menuBtn.style.color = '#aaa'; };
    }

    public show(levelName: string, score: number) {
        if (this.element.style.display === 'flex') return;

        const nameEl = this.element.querySelector('#go-level-name');
        if (nameEl) nameEl.textContent = levelName || 'UNKNOWN SECTOR';

        const scoreEl = this.element.querySelector('#go-score');
        if (scoreEl) scoreEl.textContent = score.toString();

        this.element.style.display = 'flex';
        // Simple animation
        this.element.style.opacity = '0';
        requestAnimationFrame(() => {
            this.element.style.transition = 'opacity 0.5s ease-in-out';
            this.element.style.opacity = '1';
        });
    }

    public hide() {
        this.element.style.display = 'none';
        this.element.style.opacity = '0';
    }
}
