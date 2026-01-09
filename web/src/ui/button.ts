export class Button {
    public x: number = 0;
    public y: number = 0;
    public radius: number = 40;
    public active: boolean = false;
    public touchId: number | null = null;
    public label: string = '';

    constructor(label: string = '') {
        this.label = label;
    }

    public setPosition(x: number, y: number, radius: number) {
        this.x = x;
        this.y = y;
        this.radius = radius;
    }

    public handleTouchStart(x: number, y: number, id: number): boolean {
        // If already active with a different touch, ignore new ones
        if (this.active && this.touchId !== null && this.touchId !== id) {
            return false;
        }

        const dx = x - this.x;
        const dy = y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= this.radius) {
            this.active = true;
            this.touchId = id;
            return true;
        }
        return false;
    }

    public handleTouchEnd(id: number) {
        if (this.active && this.touchId === id) {
            this.active = false;
            this.touchId = null;
        }
    }

    public render(ctx: CanvasRenderingContext2D) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.active ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.2)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();

        if (this.label) {
            ctx.fillStyle = '#fff';
            ctx.font = '20px "Galactic", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.label, this.x, this.y);
        }
    }
}
