export class Joystick {
    public x: number = 0;
    public y: number = 0;
    public radius: number = 50; // Default, will be updated on resize
    public knobRadius: number = 20;

    // Current knob position relative to center
    public dragX: number = 0;
    public dragY: number = 0;

    public active: boolean = false;
    public touchId: number | null = null;

    // Output values
    public angle: number = 0; // Radians
    public magnitude: number = 0; // 0 to 1

    constructor() { }

    public setPosition(x: number, y: number, radius: number) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.knobRadius = radius / 4;
    }

    public handleTouchStart(x: number, y: number, id: number): boolean {
        const dx = x - this.x;
        const dy = y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Allow touching anywhere inside the perimeter
        if (dist <= this.radius) {
            this.active = true;
            this.touchId = id;
            this.updateDrag(dx, dy);
            return true;
        }
        return false;
    }

    public handleTouchMove(x: number, y: number, id: number) {
        if (!this.active || this.touchId !== id) return;

        const dx = x - this.x;
        const dy = y - this.y;
        this.updateDrag(dx, dy);
    }

    public handleTouchEnd(id: number) {
        if (this.active && this.touchId === id) {
            this.reset();
        }
    }

    private updateDrag(dx: number, dy: number) {
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= this.radius) {
            this.dragX = dx;
            this.dragY = dy;
            this.magnitude = dist / this.radius;
        } else {
            // Clamp to radius
            const scale = this.radius / dist;
            this.dragX = dx * scale;
            this.dragY = dy * scale;
            this.magnitude = 1.0;
        }

        this.angle = Math.atan2(this.dragY, this.dragX);
    }

    public reset() {
        this.active = false;
        this.touchId = null;
        this.dragX = 0;
        this.dragY = 0;
        this.magnitude = 0;
        this.angle = 0;
    }

    public render(ctx: CanvasRenderingContext2D) {
        // Draw Perimeter
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.fill();

        // Draw Knob
        const knobX = this.x + this.dragX;
        const knobY = this.y + this.dragY;

        ctx.beginPath();
        ctx.arc(knobX, knobY, this.knobRadius, 0, Math.PI * 2);
        ctx.fillStyle = this.active ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.5)';
        ctx.fill();
    }
}
