const KEY_BINDINGS = {
    ArrowUp: 'thrust',
    ArrowLeft: 'rotate-left',
    ArrowRight: 'rotate-right',
    Space: 'fire',
    Equal: 'next-level',
    '+': 'next-level',
    Minus: 'prev-level',
    '-': 'prev-level'
};
export function createKeyboardInput() {
    const state = {
        thrust: false,
        fire: false,
        rotate: 0,
        nextLevel: false,
        prevLevel: false
    };
    const downHandler = (event) => {
        const action = KEY_BINDINGS[event.code] ?? KEY_BINDINGS[event.key];
        if (!action)
            return;
        switch (action) {
            case 'thrust':
                state.thrust = true;
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
        }
        event.preventDefault();
    };
    const upHandler = (event) => {
        const action = KEY_BINDINGS[event.code] ?? KEY_BINDINGS[event.key];
        if (!action)
            return;
        switch (action) {
            case 'thrust':
                state.thrust = false;
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
    window.addEventListener('keydown', downHandler);
    window.addEventListener('keyup', upHandler);
    return {
        state,
        dispose() {
            window.removeEventListener('keydown', downHandler);
            window.removeEventListener('keyup', upHandler);
        }
    };
}
