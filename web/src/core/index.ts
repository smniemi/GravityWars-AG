export type TickResult = {
  deltaMs: number;
};

export class GameLoop {
  private lastTime = performance.now();

  constructor(private readonly onTick: (result: TickResult) => void) {}

  start() {
    requestAnimationFrame(this.step);
  }

  private step = (now: number) => {
    const deltaMs = now - this.lastTime;
    this.lastTime = now;
    this.onTick({ deltaMs });
    requestAnimationFrame(this.step);
  };
}

