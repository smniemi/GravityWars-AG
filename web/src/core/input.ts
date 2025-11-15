export type KeyboardState = {
  thrust: boolean;
  fire: boolean;
  rotate: -1 | 0 | 1;
};

const KEY_BINDINGS: Record<string, keyof InputState | 'rotate-left' | 'rotate-right'> = {
  ArrowUp: 'thrust',
  ArrowLeft: 'rotate-left',
  ArrowRight: 'rotate-right',
  Space: 'fire'
};

export function createKeyboardInput() {
  const state: KeyboardState = {
    thrust: false,
    fire: false,
    rotate: 0
  };

  const downHandler = (event: KeyboardEvent) => {
    const action = KEY_BINDINGS[event.code] ?? KEY_BINDINGS[event.key];
    if (!action) return;
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
    }
    event.preventDefault();
  };

  const upHandler = (event: KeyboardEvent) => {
    const action = KEY_BINDINGS[event.code] ?? KEY_BINDINGS[event.key];
    if (!action) return;
    switch (action) {
      case 'thrust':
        state.thrust = false;
        break;
      case 'fire':
        state.fire = false;
        break;
      case 'rotate-left':
        if (state.rotate === -1) state.rotate = 0;
        break;
      case 'rotate-right':
        if (state.rotate === 1) state.rotate = 0;
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

