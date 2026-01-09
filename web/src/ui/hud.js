export function drawHUD(ctx, globals, scoreFlashIntensity = 0) {
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
    // Align labels left, values left at a fixed column for vertical alignment
    const leftLabelX = padding;
    const leftValueX = padding + ctx.measureText('Score: ').width; // Use longer label for column
    // Score Flash Logic
    const flashIntensity = Math.max(0, Math.min(1, scoreFlashIntensity));
    // Interpolate between White (#ffffff) and Yellow (#ffff00)
    // White: 255, 255, 255
    // Yellow: 255, 255, 0
    // The only difference is Blue channel: 255 -> 0 based on intensity
    const blueChannel = Math.round(255 * (1 - flashIntensity));
    const scoreColor = `rgb(255, 255, ${blueChannel})`;
    // Scale font size up to 25% larger
    // Scale font size up to 2x larger (100% increase)
    const currentFontSize = fontSize * (1 + (flashIntensity * 1.0));
    ctx.textAlign = 'left';
    ctx.fillText('Level:', leftLabelX, padding);
    ctx.fillText(`${globals.levelnum}`, leftValueX, padding);
    ctx.fillText('Score:', leftLabelX, padding + fontSize * 1.5);
    ctx.save();
    // Calculate center based on NORMAL font size
    ctx.font = `${fontSize}px 'Galactic', monospace`;
    const scoreStr = `${globals.shipScore}`;
    const scoreWidth = ctx.measureText(scoreStr).width;
    const centerX = leftValueX + (scoreWidth / 2);
    // Vertical center: Start Y + Half Height
    // Start Y is (padding + fontSize * 1.5)
    // Height is roughly fontSize
    const centerY = (padding + fontSize * 1.5) + (fontSize / 2);
    ctx.font = `${currentFontSize}px 'Galactic', monospace`;
    ctx.fillStyle = scoreColor;
    // Add bright yellow glow during flash
    if (flashIntensity > 0) {
        ctx.shadowColor = '#ffff00';
        ctx.shadowBlur = 20 * flashIntensity; // Dynamic blur based on intensity
    }
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(scoreStr, centerX, centerY);
    ctx.restore();
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
    // Align labels left (so F and L are vertically aligned), values right-aligned
    // Measure the widest possible value (4 digits like "9999")
    const valueColumnWidth = ctx.measureText('9999').width;
    // The right edge of the value text (matching left margin)
    const valueRightEdge = width - padding;
    // Measure the longer label for consistent positioning
    const rightLabelWidth = ctx.measureText('Lives:').width;
    // The left edge where labels start (left-aligned)
    const rightLabelX = valueRightEdge - valueColumnWidth - 10 - rightLabelWidth;
    // Fuel
    if (globals.shipFuel < 500) {
        ctx.fillStyle = '#ff0000';
    }
    else {
        ctx.fillStyle = '#ffffff';
    }
    ctx.textAlign = 'left';
    ctx.fillText('Fuel:', rightLabelX, padding);
    ctx.textAlign = 'right';
    ctx.fillText(`${globals.shipFuel}`, valueRightEdge, padding);
    // Lives
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText('Lives:', rightLabelX, padding + fontSize * 1.5);
    ctx.textAlign = 'right';
    const displayedLives = Math.max(0, globals.shipLife - 1);
    ctx.fillText(`${displayedLives}`, valueRightEdge, padding + fontSize * 1.5);
    ctx.restore();
}
