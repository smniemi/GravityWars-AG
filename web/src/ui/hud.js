export function drawHUD(ctx, globals) {
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
    // Align labels and values to the left, but positioned relative to the right edge
    // This ensures 'F' in Fuel and 'L' in Lives are vertically aligned.
    // Reserve space for values (e.g. 4 digits)
    const valueMaxWidth = 100;
    // Reserve space for labels (Lives: is approx 5-6 chars)
    const labelMaxWidth = 110;
    // Position where the value number starts (left-aligned)
    const valueX = width - padding - valueMaxWidth;
    // Position where the label starts (left-aligned)
    const labelX = valueX - labelMaxWidth;
    // Fuel
    if (globals.shipFuel < 500) {
        ctx.fillStyle = '#ff0000';
    }
    else {
        ctx.fillStyle = '#ffffff';
    }
    ctx.textAlign = 'left';
    ctx.fillText('Fuel:', labelX, padding);
    ctx.fillText(`${globals.shipFuel}`, valueX, padding);
    // Lives
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Lives:', labelX, padding + fontSize * 1.5);
    ctx.fillText(`${globals.shipLife}`, valueX, padding + fontSize * 1.5);
    ctx.restore();
}
