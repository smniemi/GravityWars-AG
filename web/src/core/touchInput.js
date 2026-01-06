// Use a special ID for mouse events
const MOUSE_ID = -1;
export function createTouchInput(element, state, joystick, fireButton, thrustButton) {
    const activeTouches = new Map();
    let mouseDown = false;
    function getTouchZone(x) {
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
    function handleTouchStart(e) {
        // Allow default behavior for buttons and UI elements (screens)
        const target = e.target;
        if (target.closest('button') || target.closest('.ui-screen')) {
            return;
        }
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            const rect = element.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            let handled = false;
            // Try buttons first
            if (fireButton && fireButton.active) { // Handle multitouch on buttons?
                // Actually we should check hit test again here? 
                // fireButton.handleTouchStart checks magnitude.
            }
            if (fireButton && fireButton.handleTouchStart(x, y, touch.identifier)) {
                handled = true;
            }
            else if (thrustButton && thrustButton.handleTouchStart(x, y, touch.identifier)) {
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
    function handleTouchMove(e) {
        // Allow default behavior for buttons and UI elements (screens)
        const target = e.target;
        if (target.closest('button') || target.closest('.ui-screen')) {
            return;
        }
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            const rect = element.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            if (joystick && joystick.touchId === touch.identifier) {
                joystick.handleTouchMove(x, y, touch.identifier);
            }
            else if (fireButton && fireButton.touchId === touch.identifier) {
                // Check if swiped to thrust button
                if (thrustButton && thrustButton.handleTouchStart(x, y, touch.identifier)) {
                    fireButton.handleTouchEnd(touch.identifier);
                }
            }
            else if (thrustButton && thrustButton.touchId === touch.identifier) {
                // Check if swiped to fire button
                if (fireButton && fireButton.handleTouchStart(x, y, touch.identifier)) {
                    thrustButton.handleTouchEnd(touch.identifier);
                }
            }
            else {
                const info = activeTouches.get(touch.identifier);
                if (info) {
                    info.currentX = touch.clientX;
                    info.currentY = touch.clientY;
                }
            }
        }
        updateState();
    }
    function handleTouchEnd(e) {
        // Allow default behavior for buttons and UI elements (screens)
        const target = e.target;
        if (target.closest('button') || target.closest('.ui-screen')) {
            return;
        }
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            if (fireButton && fireButton.touchId === touch.identifier) {
                fireButton.handleTouchEnd(touch.identifier);
            }
            else if (thrustButton && thrustButton.touchId === touch.identifier) {
                thrustButton.handleTouchEnd(touch.identifier);
            }
            else if (joystick && joystick.touchId === touch.identifier) {
                joystick.handleTouchEnd(touch.identifier);
            }
            else {
                activeTouches.delete(touch.identifier);
            }
        }
        updateState();
    }
    function handleTouchCancel(e) {
        // Allow default behavior for buttons and UI elements (screens)
        const target = e.target;
        if (target.closest('button') || target.closest('.ui-screen')) {
            return;
        }
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            if (fireButton && fireButton.touchId === touch.identifier) {
                fireButton.handleTouchEnd(touch.identifier);
            }
            else if (thrustButton && thrustButton.touchId === touch.identifier) {
                thrustButton.handleTouchEnd(touch.identifier);
            }
            else if (joystick && joystick.touchId === touch.identifier) {
                joystick.handleTouchEnd(touch.identifier);
            }
            else {
                activeTouches.delete(touch.identifier);
            }
        }
        updateState();
    }
    // Mouse event handlers for desktop testing
    function handleMouseDown(e) {
        // Allow default behavior for buttons and UI elements (screens)
        const target = e.target;
        if (target.closest('button') || target.closest('.ui-screen')) {
            return;
        }
        // Only handle left mouse button
        if (e.button !== 0)
            return;
        const rect = element.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        let handled = false;
        // Try buttons first
        if (fireButton && fireButton.handleTouchStart(x, y, MOUSE_ID)) {
            handled = true;
            mouseDown = true;
        }
        else if (thrustButton && thrustButton.handleTouchStart(x, y, MOUSE_ID)) {
            handled = true;
            mouseDown = true;
        }
        // Then joystick
        else if (joystick && joystick.handleTouchStart(x, y, MOUSE_ID)) {
            handled = true;
            mouseDown = true;
        }
        if (handled) {
            e.preventDefault();
        }
        updateState();
    }
    function handleMouseMove(e) {
        if (!mouseDown)
            return;
        const rect = element.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        if (joystick && joystick.touchId === MOUSE_ID) {
            joystick.handleTouchMove(x, y, MOUSE_ID);
        }
        else if (fireButton && fireButton.touchId === MOUSE_ID) {
            // Check if moved to thrust button
            if (thrustButton && thrustButton.handleTouchStart(x, y, MOUSE_ID)) {
                fireButton.handleTouchEnd(MOUSE_ID);
            }
        }
        else if (thrustButton && thrustButton.touchId === MOUSE_ID) {
            // Check if moved to fire button
            if (fireButton && fireButton.handleTouchStart(x, y, MOUSE_ID)) {
                thrustButton.handleTouchEnd(MOUSE_ID);
            }
        }
        updateState();
    }
    function handleMouseUp(_e) {
        if (!mouseDown)
            return;
        mouseDown = false;
        if (fireButton && fireButton.touchId === MOUSE_ID) {
            fireButton.handleTouchEnd(MOUSE_ID);
        }
        if (thrustButton && thrustButton.touchId === MOUSE_ID) {
            thrustButton.handleTouchEnd(MOUSE_ID);
        }
        if (joystick && joystick.touchId === MOUSE_ID) {
            joystick.handleTouchEnd(MOUSE_ID);
        }
        updateState();
    }
    function handleMouseLeave(e) {
        // Treat leaving the element as mouse up
        handleMouseUp(e);
    }
    // Attach touch listeners
    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: false });
    element.addEventListener('touchcancel', handleTouchCancel, { passive: false });
    // Attach mouse listeners for desktop
    element.addEventListener('mousedown', handleMouseDown);
    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('mouseup', handleMouseUp);
    element.addEventListener('mouseleave', handleMouseLeave);
    return {
        dispose() {
            element.removeEventListener('touchstart', handleTouchStart);
            element.removeEventListener('touchmove', handleTouchMove);
            element.removeEventListener('touchend', handleTouchEnd);
            element.removeEventListener('touchcancel', handleTouchCancel);
            element.removeEventListener('mousedown', handleMouseDown);
            element.removeEventListener('mousemove', handleMouseMove);
            element.removeEventListener('mouseup', handleMouseUp);
            element.removeEventListener('mouseleave', handleMouseLeave);
            activeTouches.clear();
        }
    };
}
