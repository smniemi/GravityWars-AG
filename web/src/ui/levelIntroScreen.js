export class LevelIntroScreen {
    element;
    nameElement;
    subTextElement;
    isPlaying = false;
    constructor(container) {
        this.element = document.createElement('div');
        this.element.className = 'level-intro-screen';
        this.element.style.position = 'absolute';
        this.element.style.top = '0';
        this.element.style.left = '0';
        this.element.style.width = '100%';
        this.element.style.height = '100%';
        this.element.style.display = 'none';
        this.element.style.flexDirection = 'column';
        this.element.style.alignItems = 'center';
        this.element.style.justifyContent = 'center';
        this.element.style.pointerEvents = 'none'; // Click through
        this.element.style.zIndex = '100'; // Top
        // Content container for animation
        const content = document.createElement('div');
        content.style.textAlign = 'center';
        this.nameElement = document.createElement('h1');
        this.nameElement.className = 'galactic-text';
        this.nameElement.style.fontSize = '48px';
        this.nameElement.style.color = '#0ff';
        this.nameElement.style.textShadow = '0 0 20px rgba(0, 255, 255, 0.8)';
        this.nameElement.style.margin = '0';
        this.nameElement.style.letterSpacing = '4px';
        this.nameElement.style.textTransform = 'uppercase';
        this.subTextElement = document.createElement('div');
        this.subTextElement.textContent = 'MISSION START';
        this.subTextElement.style.fontSize = '14px';
        this.subTextElement.style.color = 'rgba(255, 255, 255, 0.7)';
        this.subTextElement.style.marginTop = '10px';
        this.subTextElement.style.letterSpacing = '8px';
        this.subTextElement.style.fontFamily = 'monospace';
        this.subTextElement.style.whiteSpace = 'pre-line'; // Allow newlines
        content.appendChild(this.nameElement);
        content.appendChild(this.subTextElement);
        this.element.appendChild(content);
        container.appendChild(this.element);
    }
    show(levelName, onComplete) {
        if (this.isPlaying)
            return;
        this.isPlaying = true;
        this.nameElement.textContent = levelName || 'UNKNOWN SECTOR';
        this.subTextElement.textContent = 'MISSION START';
        // Level intro uses cyan styling
        this.nameElement.style.color = '#0ff';
        this.nameElement.style.textShadow = '0 0 20px rgba(0, 255, 255, 0.8)';
        // Reset styles
        this.element.style.display = 'flex';
        this.element.style.opacity = '0';
        this.element.style.transform = 'scale(0.9)';
        this.element.style.transition = 'opacity 0.5s ease-out, transform 2.5s ease-out';
        // Force reflow
        void this.element.offsetWidth;
        // Animate In
        requestAnimationFrame(() => {
            this.element.style.opacity = '1';
            this.element.style.transform = 'scale(1.05)'; // Slow grow
        });
        // Hold then fade out
        setTimeout(() => {
            this.element.style.opacity = '0';
            // Continue growing slightly while fading out
            // this.element.style.transform = 'scale(1.1)'; 
        }, 2000);
        // Cleanup
        setTimeout(() => {
            this.element.style.display = 'none';
            this.isPlaying = false;
            onComplete();
        }, 2500);
    }
    /**
     * Show a custom message with the same animation as level intro.
     * Used for events like "PORTAL ACTIVATED" when all keys are collected.
     */
    showMessage(message, subtitle = '', duration = 2000, onComplete) {
        if (this.isPlaying)
            return;
        this.isPlaying = true;
        this.nameElement.textContent = message;
        this.subTextElement.textContent = subtitle;
        // Custom messages use green styling for portal activation
        this.nameElement.style.color = '#0f0';
        this.nameElement.style.textShadow = '0 0 20px rgba(0, 255, 0, 0.8)';
        // Reset styles
        this.element.style.display = 'flex';
        this.element.style.opacity = '0';
        this.element.style.transform = 'scale(0.9)';
        this.element.style.transition = 'opacity 0.5s ease-out, transform 2.5s ease-out';
        // Force reflow
        void this.element.offsetWidth;
        // Animate In
        requestAnimationFrame(() => {
            this.element.style.opacity = '1';
            this.element.style.transform = 'scale(1.05)'; // Slow grow
        });
        // Hold then fade out
        setTimeout(() => {
            this.element.style.opacity = '0';
        }, duration);
        // Cleanup
        setTimeout(() => {
            this.element.style.display = 'none';
            this.isPlaying = false;
            onComplete?.();
        }, duration + 500);
    }
}
