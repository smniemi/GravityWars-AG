export class GameCompleteScreen {
    private element: HTMLElement;
    private isVisible: boolean = false;

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
        this.element.style.background = 'radial-gradient(ellipse at center, rgba(0, 50, 100, 0.95) 0%, rgba(0, 0, 0, 0.98) 100%)';
        this.element.style.color = '#fff';
        this.element.style.zIndex = '50';
        this.element.style.backdropFilter = 'blur(8px)';
        this.element.style.overflow = 'hidden';

        this.element.innerHTML = `
            <style>
                @keyframes starfield {
                    0% { transform: translateY(0); }
                    100% { transform: translateY(-100%); }
                }
                @keyframes glow-pulse {
                    0%, 100% { text-shadow: 0 0 20px rgba(255, 215, 0, 0.8), 0 0 40px rgba(255, 215, 0, 0.6); }
                    50% { text-shadow: 0 0 30px rgba(255, 215, 0, 1), 0 0 60px rgba(255, 215, 0, 0.8), 0 0 80px rgba(255, 215, 0, 0.4); }
                }
                @keyframes confetti {
                    0% { transform: translateY(-100vh) rotate(0deg); opacity: 1; }
                    100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
                }
                .gc-starfield {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 200%;
                    background: radial-gradient(1px 1px at 20% 30%, white, transparent),
                                radial-gradient(1px 1px at 40% 70%, rgba(255, 255, 200, 0.8), transparent),
                                radial-gradient(1px 1px at 60% 20%, rgba(200, 220, 255, 0.9), transparent),
                                radial-gradient(1px 1px at 80% 50%, white, transparent),
                                radial-gradient(1.5px 1.5px at 10% 60%, rgba(255, 215, 0, 0.7), transparent),
                                radial-gradient(1px 1px at 90% 10%, white, transparent);
                    background-size: 200px 200px;
                    animation: starfield 20s linear infinite;
                    pointer-events: none;
                }
                .gc-confetti-particle {
                    position: absolute;
                    width: 10px;
                    height: 10px;
                    animation: confetti 4s ease-in-out infinite;
                    pointer-events: none;
                }
            </style>
            <div class="gc-starfield"></div>
            <div style="text-align: center; position: relative; z-index: 10;">
                <div style="font-size: 14px; color: rgba(255, 255, 255, 0.7); letter-spacing: 8px; text-transform: uppercase; margin-bottom: 10px; font-family: monospace;">Mission Complete</div>
                <h1 class="galactic-text" style="font-size: 48px; background: linear-gradient(180deg, #ffd700 0%, #ff8c00 50%, #ffd700 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin: 0 0 20px 0; animation: glow-pulse 2s ease-in-out infinite; filter: drop-shadow(0 0 10px rgba(255, 215, 0, 0.5)); letter-spacing: 4px;">
                    CONGRATULATIONS!
                </h1>
                <div style="font-size: 20px; color: #0ff; margin: 10px 0; text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);">
                    You have conquered all 13 levels!
                </div>
                <div style="font-size: 16px; color: rgba(255, 255, 255, 0.8); margin: 15px 0; max-width: 400px; line-height: 1.6;">
                    The galaxy is safe once more. Your piloting skills are legendary across the cosmos.
                </div>
                <div style="height: 20px;"></div>
                <div style="font-size: 24px; color: #fff; margin-top: 20px;">
                    FINAL SCORE: <span id="gc-score" style="color: #ffd700; font-weight: bold; text-shadow: 0 0 15px rgba(255, 215, 0, 0.7);">0</span>
                </div>
            </div>

            <div class="menu-buttons" style="display: flex; flex-direction: column; gap: 15px; width: 220px; margin-top: 40px; position: relative; z-index: 10;">
                <button id="gc-btn-replay" style="background: linear-gradient(180deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 140, 0, 0.2) 100%); border: 2px solid #ffd700; color: #ffd700; padding: 14px; font-family: inherit; font-size: 16px; cursor: pointer; transition: all 0.3s; border-radius: 6px; text-transform: uppercase; letter-spacing: 2px;">
                    Play Again
                </button>
                <button id="gc-btn-menu" style="background: rgba(255, 255, 255, 0.05); border: 1px solid #666; color: #aaa; padding: 12px; cursor: pointer; font-family: inherit; font-size: 14px; border-radius: 4px; text-transform: uppercase; letter-spacing: 1px; transition: all 0.2s;">
                    Back to Menu
                </button>
            </div>
        `;
        container.appendChild(this.element);

        this.setupButtons();
    }

    private setupButtons() {
        const replayBtn = this.element.querySelector('#gc-btn-replay') as HTMLElement;
        replayBtn.addEventListener('click', () => {
            this.onReplay();
            this.hide();
        });
        replayBtn.onmouseenter = () => {
            replayBtn.style.background = 'linear-gradient(180deg, rgba(255, 215, 0, 0.4) 0%, rgba(255, 140, 0, 0.4) 100%)';
            replayBtn.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.5)';
            replayBtn.style.transform = 'scale(1.02)';
        };
        replayBtn.onmouseleave = () => {
            replayBtn.style.background = 'linear-gradient(180deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 140, 0, 0.2) 100%)';
            replayBtn.style.boxShadow = 'none';
            replayBtn.style.transform = 'scale(1)';
        };

        const menuBtn = this.element.querySelector('#gc-btn-menu') as HTMLElement;
        menuBtn.addEventListener('click', () => {
            this.onMenu();
            this.hide();
        });
        menuBtn.onmouseenter = () => {
            menuBtn.style.background = 'rgba(255, 255, 255, 0.1)';
            menuBtn.style.borderColor = '#aaa';
            menuBtn.style.color = '#fff';
        };
        menuBtn.onmouseleave = () => {
            menuBtn.style.background = 'rgba(255, 255, 255, 0.05)';
            menuBtn.style.borderColor = '#666';
            menuBtn.style.color = '#aaa';
        };
    }

    public show(score: number) {
        if (this.isVisible) return;
        this.isVisible = true;

        const scoreEl = this.element.querySelector('#gc-score');
        if (scoreEl) scoreEl.textContent = score.toLocaleString();

        this.element.style.display = 'flex';
        // Animate in with fade and scale
        this.element.style.opacity = '0';
        this.element.style.transform = 'scale(0.95)';
        requestAnimationFrame(() => {
            this.element.style.transition = 'opacity 0.8s ease-out, transform 0.8s ease-out';
            this.element.style.opacity = '1';
            this.element.style.transform = 'scale(1)';
        });
    }

    public hide() {
        this.isVisible = false;
        this.element.style.display = 'none';
        this.element.style.opacity = '0';
        this.element.style.transform = 'scale(0.95)';
    }
}
