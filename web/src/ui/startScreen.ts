export class StartScreen {
    private element: HTMLElement;
    private levelSelector: HTMLElement;
    private selectedLevel: number = 1;
    private totalLevels: number = 60; // Assuming 60 levels based on file listing
    private isVisible: boolean = false;
    private startX: number = 0;
    private isDragging: boolean = false;

    constructor(container: HTMLElement, private onPlay: (level: number) => void) {
        this.element = document.createElement('div');
        this.element.className = 'ui-screen hidden';
        this.element.innerHTML = `
            <div class="title-container">
                <h1>GRAVITY WARS</h1>
                <h2>- THE BEGINNING -</h2>
            </div>
            
            <div class="level-section">
                <div class="level-label">LEVEL</div>
                <div class="level-selector" id="level-selector">
                    <!-- Levels will be injected here -->
                </div>
            </div>

            <div class="menu-buttons">
                <button id="btn-play">PLAY</button>
                <button id="btn-tutorial">TUTORIAL</button>
                <button id="btn-credits">CREDITS</button>
            </div>

            <div class="footer-controls">
                <button id="btn-music">MUSIC ON/OFF</button>
            </div>
        `;
        container.appendChild(this.element);

        this.levelSelector = this.element.querySelector('#level-selector') as HTMLElement;
        this.renderLevels();
        this.setupInput();
        this.setupButtons();
    }

    private renderLevels() {
        this.levelSelector.innerHTML = '';
        for (let i = 1; i <= this.totalLevels; i++) {
            const el = document.createElement('div');
            el.className = `level-item ${i === this.selectedLevel ? 'selected' : ''}`;
            // Pad with zero if < 10
            el.textContent = i < 10 ? `0${i}` : `${i}`;
            el.dataset.level = i.toString();
            el.onclick = () => {
                this.selectedLevel = i;
                this.updateLevelSelection();
            };
            this.levelSelector.appendChild(el);
        }
        this.updateLevelSelection();
    }

    private updateLevelSelection() {
        const items = Array.from(this.levelSelector.children) as HTMLElement[];
        items.forEach(item => {
            const level = parseInt(item.dataset.level || '0');
            item.className = `level-item ${level === this.selectedLevel ? 'selected' : ''}`;

            if (level === this.selectedLevel) {
                item.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
            }
        });
    }

    private setupInput() {
        // Mouse Drag (Horizontal)
        this.levelSelector.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.startX = e.clientX;
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.isVisible || !this.isDragging) return;
            const deltaX = e.clientX - this.startX;
            if (Math.abs(deltaX) > 20) {
                if (deltaX > 0) this.selectPrev();
                else this.selectNext();
                this.startX = e.clientX;
            }
        });

        window.addEventListener('mouseup', () => {
            this.isDragging = false;
        });

        // Touch Swipe (Horizontal)
        this.levelSelector.addEventListener('touchstart', (e) => {
            this.startX = e.touches[0].clientX;
        }, { passive: true });

        this.levelSelector.addEventListener('touchmove', (e) => {
            if (!this.isVisible) return;
            const x = e.touches[0].clientX;
            const deltaX = x - this.startX;
            if (Math.abs(deltaX) > 30) {
                if (deltaX > 0) this.selectPrev();
                else this.selectNext();
                this.startX = x;
            }
        }, { passive: true });

        // Keyboard (Left/Right)
        window.addEventListener('keydown', (e) => {
            if (!this.isVisible) return;
            if (e.key === 'ArrowLeft') this.selectPrev();
            if (e.key === 'ArrowRight') this.selectNext();
            if (e.key === 'Enter') this.onPlay(this.selectedLevel);
        });

        // Wheel (Horizontal)
        this.levelSelector.addEventListener('wheel', (e) => {
            if (!this.isVisible) return;
            e.preventDefault();
            if (e.deltaY < 0 || e.deltaX < 0) this.selectPrev();
            else this.selectNext();
        }, { passive: false });
    }

    private selectNext() {
        if (this.selectedLevel < this.totalLevels) {
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
        this.element.querySelector('#btn-play')?.addEventListener('click', () => {
            this.onPlay(this.selectedLevel);
        });

        this.element.querySelector('#btn-tutorial')?.addEventListener('click', () => {
            this.onPlay(0);
        });

        // TODO: Implement Credits and Music toggle
    }

    public show() {
        this.isVisible = true;
        this.element.classList.remove('hidden');
        setTimeout(() => this.updateLevelSelection(), 100);
    }

    public hide() {
        this.isVisible = false;
        this.element.classList.add('hidden');
    }
}
