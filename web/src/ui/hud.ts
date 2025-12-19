import type { GlobalState } from '../core/globalState.js';

export function drawHUD(ctx: CanvasRenderingContext2D, globals: GlobalState) {
    const { width } = ctx.canvas;
    const padding = 20;
    const fontSize = 30;

    ctx.save();
    ctx.font = `${fontSize}px 'Galactic', monospace`;
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    // Top Left: Level & Score
    ctx.textAlign = 'left';
    ctx.fillText(`Level: ${globals.levelnum}`, padding, padding);
    ctx.fillText(`Score: ${globals.shipScore}`, padding, padding + fontSize * 1.5);

    // Top Center: Time
    ctx.textAlign = 'center';
    const timeStr = globals.shipTime.toFixed(1);
    ctx.fillText(`Time: ${timeStr}`, width / 2, padding);

    // Top Right: Fuel & Lives
    ctx.textAlign = 'right';
    ctx.fillText(`Fuel: ${globals.shipFuel}`, width - padding, padding);
    ctx.fillText(`Lives: ${globals.shipLife}`, width - padding, padding + fontSize * 1.5);

    // Fuel Warning (Red if low)
    if (globals.shipFuel < 500) { // Assuming 500 is low, adjust as needed
        ctx.fillStyle = '#ff0000';
        ctx.fillText(`Fuel: ${globals.shipFuel}`, width - padding, padding);
    }

    ctx.restore();
}
