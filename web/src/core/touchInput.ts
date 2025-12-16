import type { KeyboardState } from './input.js';
import type { Joystick } from '../ui/joystick.js';
import type { Button } from '../ui/button.js';

interface TouchInfo {
    id: number;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    zone: 'left' | 'right';
}

export function createTouchInput(
    element: HTMLElement,
    state: KeyboardState,
    joystick?: Joystick,
    fireButton?: Button,
    thrustButton?: Button
) {
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
        state.thrust = 0;
        state.rotate = 0;
        state.targetAngle = undefined;

        // Check buttons
        if (fireButton && fireButton.active) {
            state.fire = true;
        }

        if (thrustButton && thrustButton.active) {
            state.thrust = 1;
        }

        // Joystick only handles rotation now
        if (joystick && joystick.active) {
            // state.thrust = joystick.magnitude; // Removed thrust from joystick
            state.targetAngle = joystick.angle;
        }
    }

    function handleTouchStart(e: TouchEvent) {
        e.preventDefault();

        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            const rect = element.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;

            let handled = false;

            // Try buttons first
            if (fireButton && fireButton.handleTouchStart(x, y, touch.identifier)) {
                handled = true;
            } else if (thrustButton && thrustButton.handleTouchStart(x, y, touch.identifier)) {
                handled = true;
            }
            // Then joystick
            else if (joystick) {
                handled = joystick.handleTouchStart(x, y, touch.identifier);
            }

            if (!handled) {
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
        }

        updateState();
    }

    function handleTouchMove(e: TouchEvent) {
        e.preventDefault();

        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            const rect = element.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;

            if (joystick && joystick.touchId === touch.identifier) {
                joystick.handleTouchMove(x, y, touch.identifier);
            } else {
                const info = activeTouches.get(touch.identifier);
                if (info) {
                    info.currentX = touch.clientX;
                    info.currentY = touch.clientY;
                }
            }
        }

        updateState();
    }

    function handleTouchEnd(e: TouchEvent) {
        e.preventDefault();

        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];

            if (fireButton && fireButton.touchId === touch.identifier) {
                fireButton.handleTouchEnd(touch.identifier);
            } else if (thrustButton && thrustButton.touchId === touch.identifier) {
                thrustButton.handleTouchEnd(touch.identifier);
            } else if (joystick && joystick.touchId === touch.identifier) {
                joystick.handleTouchEnd(touch.identifier);
            } else {
                activeTouches.delete(touch.identifier);
            }
        }

        updateState();
    }

    function handleTouchCancel(e: TouchEvent) {
        e.preventDefault();

        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];

            if (fireButton && fireButton.touchId === touch.identifier) {
                fireButton.handleTouchEnd(touch.identifier);
            } else if (thrustButton && thrustButton.touchId === touch.identifier) {
                thrustButton.handleTouchEnd(touch.identifier);
            } else if (joystick && joystick.touchId === touch.identifier) {
                joystick.handleTouchEnd(touch.identifier);
            } else {
                activeTouches.delete(touch.identifier);
            }
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
