export class Joystick {
    x = 0;
    y = 0;
    radius = 50; // Default, will be updated on resize
    knobRadius = 20;
    // Current knob position relative to center
    dragX = 0;
    dragY = 0;
    active = false;
    touchId = null;
    // Output values
    angle = 0; // Radians
    magnitude = 0; // 0 to 1
    // Inertia
    currentAngle = -Math.PI / 2;
    targetAngle = -Math.PI / 2;
    SMOOTHING = 0.15;
    constructor() { }
    setPosition(x, y, radius) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.knobRadius = radius / 4;
        // Initialize position on the rim (right side by default)
        this.updateKnobPosition();
    }
    handleTouchStart(x, y, id) {
        const dx = x - this.x;
        const dy = y - this.y;
        // Increased touch area for better usability
        const dist = Math.sqrt(dx * dx + dy * dy);
        // Allow touching anywhere inside a slightly larger area (1.2x radius)
        if (dist <= this.radius * 1.5) {
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
            this.active = false;
            this.touchId = null;
            // Don't reset angle, let it stay where it is (like a dial)
        }
    }
    updateTarget(dx, dy) {
        this.targetAngle = Math.atan2(dy, dx);
    }
    updateKnobPosition() {
        this.dragX = Math.cos(this.currentAngle) * this.radius;
        this.dragY = Math.sin(this.currentAngle) * this.radius;
    }
    lerpAngle(start, end, t) {
        let diff = end - start;
        // Normalize diff to -PI to PI
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
        // Normalize current angle
        while (this.currentAngle > Math.PI)
            this.currentAngle -= Math.PI * 2;
        while (this.currentAngle < -Math.PI)
            this.currentAngle += Math.PI * 2;
        this.angle = this.currentAngle;
        this.updateKnobPosition();
        // Magnitude is always 1 because it's always on the rim?
        // Or should it be 0 if not active? 
        // Request says "drag the middle button along the rim to rotate".
        // Current implementation is rotation only right? So magnitude might not matter as much, 
        // but for compatibility lets say magnitude is 1.
        this.magnitude = 1.0;
    }
    render(ctx) {
        this.update(); // Update physics/interpretation every frame
        // Draw Perimeter path (track)
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 4;
        ctx.stroke();
        // Draw Knob on the rim
        const knobX = this.x + this.dragX;
        const knobY = this.y + this.dragY;
        ctx.beginPath();
        ctx.arc(knobX, knobY, this.knobRadius, 0, Math.PI * 2);
        ctx.fillStyle = this.active ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.6)';
        ctx.fill();
        // Draw connector line for visual clarity
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(knobX, knobY);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}
