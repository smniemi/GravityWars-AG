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

    const isMobile = width < 768;
    // Mobile: up 1 font size (from 1.5 -> 2.5)
    // Desktop: up another font size (from 1.5 -> 3.5 [or mobile + 1])
    const timeBottomOffset = isMobile ? fontSize * 2.5 : fontSize * 3.5;

    // Bottom Center: Time
    const { height } = ctx.canvas;
    const timeStr = Math.floor(globals.shipTime).toFixed(0);

    // Draw "Time: " fixed relative to center
    ctx.textAlign = 'right';
    ctx.fillText('Time: ', width / 2, height - padding - timeBottomOffset);

    ctx.textAlign = 'left';
    ctx.fillText(timeStr, width / 2, height - padding - timeBottomOffset);

    // Top Right: Fuel & Lives
    // Right-align values so the rightmost digit is at (width - padding),
    // mirroring the left margin of Level text.
    // Account for shadow offset (2px) to match visual alignment.

    // Measure the widest possible value (4 digits like "9999")
    const valueColumnWidth = ctx.measureText('9999').width;
    // The right edge of the value text (adjusted to match left margin visually)
    const valueRightEdge = width - padding + fontSize * 1.5;
    // The left edge of the value column (where labels end)
    const valueSeparator = valueRightEdge - valueColumnWidth - 10; // 10px gap

    // Fuel
    if (globals.shipFuel < 500) {
        ctx.fillStyle = '#ff0000';
    } else {
        ctx.fillStyle = '#ffffff';
    }

    ctx.textAlign = 'right';
    ctx.fillText('Fuel:', valueSeparator, padding);
    ctx.fillText(`${globals.shipFuel}`, valueRightEdge, padding);

    // Lives
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Lives:', valueSeparator, padding + fontSize * 1.5);
    ctx.fillText(`${globals.shipLife}`, valueRightEdge, padding + fontSize * 1.5);

    ctx.restore();
}
