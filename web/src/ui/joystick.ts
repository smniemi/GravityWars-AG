import type { ShipSprites } from '../render/shipSprites.js';

export class Joystick {
    public x: number = 0;
    public y: number = 0;
    public radius: number = 50; // Default, will be updated on resize
    public knobRadius: number = 20;

    // Indicator (Small Circle) size
    // 2x larger than before (was 10, now 20)
    public indicatorRadius: number = 20;

    public active: boolean = false;
    public touchId: number | null = null;

    // Output values
    public angle: number = 0; // Radians
    public magnitude: number = 0; // 0 to 1

    // Inertia
    private currentAngle: number = -Math.PI / 2;
    private targetAngle: number = -Math.PI / 2;
    private readonly SMOOTHING = 0.15;

    // Ship sprite reference
    private shipSprites: HTMLCanvasElement[] | null = null;

    // External ship angle to display
    private shipDisplayAngle: number = 0;

    constructor() { }

    public setShipSprites(sprites: ShipSprites) {
        this.shipSprites = sprites.noThrust;
    }

    public setShipDisplayAngle(angle: number) {
        this.shipDisplayAngle = angle;
    }

    public get isTouching(): boolean {
        return this.touchId !== null;
    }

    public rotate(delta: number) {
        if (this.touchId !== null) return; // Touch priority
        this.targetAngle += delta;
        this.active = true;
    }

    public reset() {
        this.active = false;
        this.touchId = null;
        this.currentAngle = -Math.PI / 2; // Reset to Up
        this.targetAngle = -Math.PI / 2;
        this.angle = this.currentAngle;
    }

    public setPosition(x: number, y: number, radius: number) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.knobRadius = radius * 1.6;
    }

    public handleTouchStart(x: number, y: number, id: number): boolean {
        const dx = x - this.x;
        const dy = y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Logic: Actionable only on the rim +- indicatorRadius
        if (Math.abs(dist - this.radius) <= this.indicatorRadius * 1.5) {
            this.active = true;
            this.touchId = id;
            this.updateTarget(dx, dy);
            return true;
        }
        return false;
    }

    public handleTouchMove(x: number, y: number, id: number) {
        if (!this.active || this.touchId !== id) return;

        const dx = x - this.x;
        const dy = y - this.y;
        this.updateTarget(dx, dy);
    }

    public handleTouchEnd(id: number) {
        if (this.active && this.touchId === id) {
            this.active = false;
            this.touchId = null;
        }
    }

    private updateTarget(dx: number, dy: number) {
        this.targetAngle = Math.atan2(dy, dx);
    }

    private lerpAngle(start: number, end: number, t: number): number {
        let diff = end - start;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        return start + diff * t;
    }

    public update() {
        if (this.active) {
            this.currentAngle = this.lerpAngle(this.currentAngle, this.targetAngle, this.SMOOTHING);
        }
        while (this.currentAngle > Math.PI) this.currentAngle -= Math.PI * 2;
        while (this.currentAngle < -Math.PI) this.currentAngle += Math.PI * 2;
        this.angle = this.currentAngle;
        this.magnitude = 1.0;
    }

    public render(ctx: CanvasRenderingContext2D) {
        this.update();

        // 1. Draw Perimeter path (track)
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 4;
        ctx.stroke();

        /***** Draw Ships First *****/

        // 2. Draw Ghost Ship
        if (this.shipSprites && this.shipSprites.length > 0) {
            ctx.save();
            ctx.globalAlpha = 0.3; // Faint ghost
            ctx.filter = 'grayscale(100%) blur(1px)';

            const frameCount = this.shipSprites.length;

            // Formula: -currentAngle - PI/2.
            let ghostAngle = -this.currentAngle - Math.PI / 2;

            while (ghostAngle < 0) ghostAngle += Math.PI * 2;
            while (ghostAngle >= Math.PI * 2) ghostAngle -= Math.PI * 2;

            const ghostFrameIndex = Math.round((ghostAngle / (Math.PI * 2)) * frameCount) % frameCount;
            const ghostSprite = this.shipSprites[ghostFrameIndex];

            if (ghostSprite) {
                const drawSize = this.knobRadius;
                ctx.drawImage(
                    ghostSprite,
                    this.x - drawSize / 2,
                    this.y - drawSize / 2,
                    drawSize,
                    drawSize
                );
            }
            ctx.restore();
        }

        // 3. Draw Main Ship
        ctx.save();
        ctx.globalAlpha = 0.75;
        ctx.filter = 'blur(1px)';

        if (this.shipSprites && this.shipSprites.length > 0) {
            const frameCount = this.shipSprites.length;

            let normalizedAngle = this.shipDisplayAngle;

            while (normalizedAngle < 0) normalizedAngle += Math.PI * 2;
            while (normalizedAngle >= Math.PI * 2) normalizedAngle -= Math.PI * 2;

            const frameIndex = Math.round((normalizedAngle / (Math.PI * 2)) * frameCount) % frameCount;
            const sprite = this.shipSprites[frameIndex];

            if (sprite) {
                const drawSize = this.knobRadius;
                ctx.drawImage(
                    sprite,
                    this.x - drawSize / 2,
                    this.y - drawSize / 2,
                    drawSize,
                    drawSize
                );
            }
        } else {
            // Fallback
            ctx.translate(this.x, this.y);
            ctx.rotate(this.shipDisplayAngle + Math.PI / 2);

            ctx.beginPath();
            ctx.moveTo(0, -20);
            ctx.lineTo(-10, 20);
            ctx.lineTo(10, 20);
            ctx.closePath();
            ctx.fillStyle = this.active ? 'rgba(100, 180, 255, 0.9)' : 'rgba(100, 180, 255, 0.6)';
            ctx.fill();
        }

        ctx.restore();

        /***** Draw Input Indicator (Circle) ON TOP *****/

        const edgeX = this.x + Math.cos(this.currentAngle) * this.radius;
        const edgeY = this.y + Math.sin(this.currentAngle) * this.radius;

        // Draw visual indicator ring
        ctx.beginPath();
        ctx.arc(edgeX, edgeY, this.indicatorRadius, 0, Math.PI * 2);
        // "transparent ... on top".
        // Use overlapping alpha.
        ctx.fillStyle = this.active ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.4)'; // Slightly more transparent for overlay?
        ctx.fill();

        // Connector Line REMOVED
    }
}
