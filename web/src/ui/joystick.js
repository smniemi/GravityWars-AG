export class Joystick {
    x = 0;
    y = 0;
    radius = 50; // Default, will be updated on resize
    knobRadius = 20;
    // Indicator (Small Circle) size
    // 50% larger (was 20, now 30)
    indicatorRadius = 30;
    _active = false;
    get active() { return this._active; }
    set active(value) {
        this._active = value;
    }
    touchId = null;
    // Output values
    angle = 0; // Radians
    magnitude = 0; // 0 to 1
    // Inertia
    currentAngle = -Math.PI / 2;
    targetAngle = -Math.PI / 2;
    SMOOTHING = 0.15;
    // Ship sprite reference
    shipSprites = null;
    shipBase = null;
    // External ship angle to display
    shipDisplayAngle = 0;
    constructor() { }
    setShipSprites(sprites) {
        this.shipSprites = sprites.noThrust;
        this.shipBase = sprites.noThrustBase ?? null;
    }
    setShipDisplayAngle(angle) {
        this.shipDisplayAngle = angle;
    }
    get isTouching() {
        return this.touchId !== null;
    }
    // ... (rest of class)
    rotate(delta) {
        if (this.touchId !== null)
            return; // Touch priority
        this.targetAngle += delta;
        this.active = true;
    }
    reset() {
        this.active = false;
        this.touchId = null;
        this.currentAngle = -Math.PI / 2; // Reset to Up
        this.targetAngle = -Math.PI / 2;
        this.angle = this.currentAngle;
    }
    setPosition(x, y, radius) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.knobRadius = radius * 1.6;
    }
    handleTouchStart(x, y, id) {
        // If already active with a different touch, ignore new ones
        if (this.active && this.touchId !== null && this.touchId !== id) {
            console.log(`[Joystick] handleTouchStart ignored. Active with ${this.touchId}, new id ${id}`);
            return false;
        }
        const dx = x - this.x;
        const dy = y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        // Logic: Actionable only on the rim +- indicatorRadius
        if (Math.abs(dist - this.radius) <= this.indicatorRadius * 1.5) {
            console.log(`[Joystick] handleTouchStart accepted. id: ${id}, dist: ${dist}`);
            this.active = true;
            this.touchId = id;
            this.updateTarget(dx, dy);
            return true;
        }
        return false;
    }
    handleTouchMove(x, y, id) {
        if (!this.active || this.touchId !== id)
            return;
        const dx = x - this.x;
        const dy = y - this.y;
        this.updateTarget(dx, dy);
    }
    handleTouchEnd(id) {
        if (this.active && this.touchId === id) {
            console.log(`[Joystick] handleTouchEnd. id: ${id}`);
            this.active = false;
            this.touchId = null;
        }
    }
    updateTarget(dx, dy) {
        this.targetAngle = Math.atan2(dy, dx);
    }
    lerpAngle(start, end, t) {
        let diff = end - start;
        while (diff > Math.PI)
            diff -= Math.PI * 2;
        while (diff < -Math.PI)
            diff += Math.PI * 2;
        return start + diff * t;
    }
    update() {
        if (this.active) {
            this.currentAngle = this.lerpAngle(this.currentAngle, this.targetAngle, this.SMOOTHING);
        }
        while (this.currentAngle > Math.PI)
            this.currentAngle -= Math.PI * 2;
        while (this.currentAngle < -Math.PI)
            this.currentAngle += Math.PI * 2;
        this.angle = this.currentAngle;
        this.magnitude = 1.0;
    }
    render(ctx) {
        this.update();
        // 1. Draw Perimeter path (track)
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 4;
        ctx.stroke();
        /***** Draw Ships First *****/
        // 2. Draw Ghost Ship
        ctx.save();
        ctx.globalAlpha = 0.3; // Faint ghost
        ctx.filter = 'grayscale(100%) blur(1px)';
        // Formula: currentAngle + PI/2 to make UP (0 in texture) match currentAngle.
        let ghostAngle = this.currentAngle + Math.PI / 2;
        ctx.translate(this.x, this.y);
        ctx.rotate(ghostAngle);
        if (this.shipBase) {
            const drawSize = this.knobRadius;
            ctx.drawImage(this.shipBase, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
        }
        else if (this.shipSprites && this.shipSprites.length > 0) {
            const frameCount = this.shipSprites.length;
            let tempAngle = ghostAngle;
            while (tempAngle < 0)
                tempAngle += Math.PI * 2;
            while (tempAngle >= Math.PI * 2)
                tempAngle -= Math.PI * 2;
            const ghostFrameIndex = Math.round((tempAngle / (Math.PI * 2)) * frameCount) % frameCount;
            const ghostSprite = this.shipSprites[ghostFrameIndex];
            if (ghostSprite) {
                const drawSize = this.knobRadius;
                ctx.drawImage(ghostSprite, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
            }
        }
        ctx.restore();
        // 3. Draw Main Ship
        ctx.save();
        ctx.globalAlpha = 0.75;
        ctx.filter = 'blur(1px)';
        if (this.shipBase || (this.shipSprites && this.shipSprites.length > 0)) {
            ctx.translate(this.x, this.y);
            ctx.rotate(-this.shipDisplayAngle); // Negative for CCW rotation from UP
            const drawSize = this.knobRadius;
            if (this.shipBase) {
                ctx.drawImage(this.shipBase, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
            }
            else if (this.shipSprites && this.shipSprites.length > 0) {
                const frameCount = this.shipSprites.length;
                let normalizedAngle = this.shipDisplayAngle;
                while (normalizedAngle < 0)
                    normalizedAngle += Math.PI * 2;
                while (normalizedAngle >= Math.PI * 2)
                    normalizedAngle -= Math.PI * 2;
                const frameIndex = Math.round((normalizedAngle / (Math.PI * 2)) * frameCount) % frameCount;
                const sprite = this.shipSprites[frameIndex];
                if (sprite) {
                    ctx.drawImage(sprite, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
                }
            }
        }
        else {
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
