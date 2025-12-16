export class Button {
    x = 0;
    y = 0;
    radius = 40;
    active = false;
    touchId = null;
    label = '';
    constructor(label = '') {
        this.label = label;
    }
    setPosition(x, y, radius) {
        this.x = x;
        this.y = y;
        this.radius = radius;
    }
    handleTouchStart(x, y, id) {
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
    handleTouchEnd(id) {
        if (this.active && this.touchId === id) {
            this.active = false;
            this.touchId = null;
        }
    }
    render(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.active ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.2)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
        if (this.label) {
            ctx.fillStyle = '#fff';
            ctx.font = '16px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.label, this.x, this.y);
        }
    }
}
