export type KeyboardState = {
  thrust: boolean;
  fire: boolean;
  rotate: -1 | 0 | 1;
  nextLevel: boolean;
  prevLevel: boolean;
};

const KEY_BINDINGS: Record<string, keyof KeyboardState | 'rotate-left' | 'rotate-right' | 'next-level' | 'prev-level'> = {
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
  const state: KeyboardState = {
    thrust: false,
    fire: false,
    rotate: 0,
    nextLevel: false,
    prevLevel: false
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
      case 'next-level':
        state.nextLevel = true;
        break;
      case 'prev-level':
        state.prevLevel = true;
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

