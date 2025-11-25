import type { KeyboardState } from './input.js';

interface TouchInfo {
    id: number;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    zone: 'left' | 'right';
}

export function createTouchInput(element: HTMLElement, state: KeyboardState) {
    const activeTouches = new Map<number, TouchInfo>();

    function getTouchZone(x: number): 'left' | 'right' {
        const rect = element.getBoundingClientRect();
        const relativeX = x - rect.left;
        const width = rect.width;
        return relativeX < width / 2 ? 'left' : 'right';
    }

    function updateState() {
        // Reset state first
        state.fire = false;
        state.thrust = false;
        state.rotate = 0;

        let thrustActive = false;
        let rotateLeft = false;
        let rotateRight = false;

        for (const touch of activeTouches.values()) {
            if (touch.zone === 'left') {
                // Left zone: fire
                state.fire = true;
            } else {
                // Right zone: thrust + analog steering
                thrustActive = true;

                const deltaX = touch.currentX - touch.startX;
                const deltaY = touch.currentY - touch.startY;

                // Calculate angle from start point to current point
                const dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

                if (dist > 10) {
                    // Calculate angle in radians
                    state.targetAngle = Math.atan2(deltaY, deltaX);
                } else {
                    state.targetAngle = undefined;
                }
            }
        }

        state.thrust = thrustActive;

        // Handle rotation (legacy)
        if (rotateLeft && !rotateRight) {
            state.rotate = -1;
        } else if (rotateRight && !rotateLeft) {
            state.rotate = 1;
        } else {
            state.rotate = 0;
        }
    }

    function handleTouchStart(e: TouchEvent) {
        e.preventDefault();

        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            const zone = getTouchZone(touch.clientX);

            activeTouches.set(touch.identifier, {
                id: touch.identifier,
                startX: touch.clientX,
                startY: touch.clientY,
                currentX: touch.clientX,
                currentY: touch.clientY,
                zone
            });
        }

        updateState();
    }

    function handleTouchMove(e: TouchEvent) {
        e.preventDefault();

        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            const info = activeTouches.get(touch.identifier);

            if (info) {
                info.currentX = touch.clientX;
                info.currentY = touch.clientY;
            }
        }

        updateState();
    }

    function handleTouchEnd(e: TouchEvent) {
        e.preventDefault();

        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            activeTouches.delete(touch.identifier);
        }

        updateState();
    }

    function handleTouchCancel(e: TouchEvent) {
        e.preventDefault();

        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            activeTouches.delete(touch.identifier);
        }

        updateState();
    }

    // Attach listeners
    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: false });
    element.addEventListener('touchcancel', handleTouchCancel, { passive: false });

    return {
        dispose() {
            element.removeEventListener('touchstart', handleTouchStart);
            element.removeEventListener('touchmove', handleTouchMove);
            element.removeEventListener('touchend', handleTouchEnd);
            element.removeEventListener('touchcancel', handleTouchCancel);
            activeTouches.clear();
        }
    };
}
