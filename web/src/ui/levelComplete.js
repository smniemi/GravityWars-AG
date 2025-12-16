export class LevelCompleteScreen {
    onContinue;
    element;
    isVisible = false;
    constructor(container, onContinue) {
        this.onContinue = onContinue;
        this.element = document.createElement('div');
        this.element.className = 'ui-screen hidden';
        this.element.style.cursor = 'pointer'; // Click anywhere to continue
        this.element.innerHTML = `
            <h1 id="lc-title">Completed Level X !!!</h1>
            <div class="stats-grid">
                <h2 id="lc-time">Time: 0.0 sec</h2>
                <h2 id="lc-best">Your best time: 0.0 sec</h2>
                <h2 id="lc-global">Global high score: - sec</h2>
            </div>
            <div style="margin-top: 50px; animation: blink 1s infinite;">
                Tap to continue
            </div>
        `;
        container.appendChild(this.element);
        this.element.addEventListener('click', () => {
            if (this.isVisible) {
                this.onContinue();
            }
        });
    }
    show(stats) {
        this.isVisible = true;
        this.element.classList.remove('hidden');
        const title = this.element.querySelector('#lc-title');
        if (title)
            title.textContent = `Completed Level ${stats.level} !!!`;
        const time = this.element.querySelector('#lc-time');
        if (time)
            time.textContent = `Time: ${stats.time.toFixed(1)} sec`;
        const best = this.element.querySelector('#lc-best');
        if (best)
            best.textContent = `Your best time: ${stats.bestTime.toFixed(1)} sec`;
        const global = this.element.querySelector('#lc-global');
        if (global)
            global.textContent = `Global high score: ${stats.globalBest > 0 ? stats.globalBest.toFixed(1) : '-'} sec`;
    }
    hide() {
        this.isVisible = false;
        this.element.classList.add('hidden');
    }
}
