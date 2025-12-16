export type KeyboardState = {
  thrust: number; // 0 to 1
  fire: boolean;
  rotate: -1 | 0 | 1;
  nextLevel: boolean;
  prevLevel: boolean;
  toggleDebug: boolean;
  targetAngle?: number; // Optional target angle in radians for analog steering
};

const KEY_BINDINGS: Record<string, keyof KeyboardState | 'rotate-left' | 'rotate-right' | 'next-level' | 'prev-level' | 'toggle-debug'> = {
  ArrowUp: 'thrust',
  ArrowLeft: 'rotate-left',
  ArrowRight: 'rotate-right',
  Space: 'fire',
  Equal: 'next-level',
  '+': 'next-level',
  Minus: 'prev-level',
  '-': 'prev-level',
  Digit0: 'toggle-debug',
  '0': 'toggle-debug'
};

import type { Joystick } from '../ui/joystick.js';

import type { Button } from '../ui/button.js';

export async function createKeyboardInput(
  touchElement?: HTMLElement,
  joystick?: Joystick,
  fireButton?: Button,
  thrustButton?: Button
) {
  const state: KeyboardState = {
    thrust: 0,
    fire: false,
    rotate: 0,
    nextLevel: false,
    prevLevel: false,
    toggleDebug: false // Default: debug displays off
  };

  const downHandler = (event: KeyboardEvent) => {
    const debugEl = document.getElementById('debug-log');
    if (debugEl) {
      debugEl.innerText = `Key: ${event.code}`;
    }
    const action = KEY_BINDINGS[event.code] ?? KEY_BINDINGS[event.key];
    if (!action) return;
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
    }
    event.preventDefault();
  };

  const upHandler = (event: KeyboardEvent) => {
    const action = KEY_BINDINGS[event.code] ?? KEY_BINDINGS[event.key];
    if (!action) return;
    switch (action) {
      case 'thrust':
        state.thrust = 0;
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

  document.addEventListener('keydown', downHandler);
  document.addEventListener('keyup', upHandler);

  // Initialize touch input if element provided
  let touchDispose: (() => void) | null = null;
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



