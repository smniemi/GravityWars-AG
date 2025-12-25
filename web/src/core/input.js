const KEY_BINDINGS = {
    ArrowUp: 'thrust',
    ArrowLeft: 'rotate-left',
    ArrowRight: 'rotate-right',
    Space: 'fire',
    Equal: 'next-level',
    '+': 'next-level',
    Minus: 'prev-level',
    '-': 'prev-level',
    Digit0: 'toggle-debug',
    '0': 'toggle-debug',
    KeyD: 'toggle-cheat',
    'd': 'toggle-cheat'
};
export async function createKeyboardInput(touchElement, joystick, fireButton, thrustButton) {
    const state = {
        thrust: 0,
        fire: false,
        rotate: 0,
        nextLevel: false,
        prevLevel: false,
        toggleDebug: false, // Default: debug displays off
        toggleCheat: false
    };
    const downHandler = (event) => {
        const debugEl = document.getElementById('debug-log');
        if (debugEl) {
            debugEl.innerText = `Key: ${event.code}`;
        }
        const action = KEY_BINDINGS[event.code] ?? KEY_BINDINGS[event.key];
        if (!action)
            return;
        switch (action) {
            case 'thrust':
                state.thrust = 1;
                break;
            case 'fire':
                state.fire = true;
                break;
            case 'rotate-left':
                state.rotate = -1;
                break;
            case 'rotate-right':
                state.rotate = 1;
                break;
            case 'next-level':
                state.nextLevel = true;
                break;
            case 'prev-level':
                state.prevLevel = true;
                break;
            case 'toggle-debug':
                state.toggleDebug = !state.toggleDebug; // Toggle on press
                break;
            case 'toggle-cheat':
                state.toggleCheat = true;
                break;
        }
        event.preventDefault();
    };
    const upHandler = (event) => {
        const action = KEY_BINDINGS[event.code] ?? KEY_BINDINGS[event.key];
        if (!action)
            return;
        switch (action) {
            case 'thrust':
                state.thrust = 0;
                break;
            case 'fire':
                state.fire = false;
                break;
            case 'rotate-left':
                if (state.rotate === -1)
                    state.rotate = 0;
                break;
            case 'rotate-right':
                if (state.rotate === 1)
                    state.rotate = 0;
                break;
            case 'next-level':
                state.nextLevel = false;
                break;
            case 'prev-level':
                state.prevLevel = false;
                break;
        }
        event.preventDefault();
    };
    document.addEventListener('keydown', downHandler);
    document.addEventListener('keyup', upHandler);
    // Initialize touch input if element provided
    let touchDispose = null;
    if (touchElement) {
        const { createTouchInput } = await import('./touchInput.js');
        const touchInput = createTouchInput(touchElement, state, joystick, fireButton, thrustButton);
        touchDispose = touchInput.dispose;
    }
    return {
        state,
        dispose() {
            document.removeEventListener('keydown', downHandler);
            document.removeEventListener('keyup', upHandler);
            touchDispose?.();
        }
    };
}
