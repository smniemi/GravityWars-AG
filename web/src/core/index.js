export class GameLoop {
    onTick;
    lastTime = performance.now();
    constructor(onTick) {
        this.onTick = onTick;
    }
    start() {
        requestAnimationFrame(this.step);
    }
    step = (now) => {
        const deltaMs = now - this.lastTime;
        this.lastTime = now;
        this.onTick({ deltaMs });
        requestAnimationFrame(this.step);
    };
}
