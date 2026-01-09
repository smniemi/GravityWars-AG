// Object types that should render as overlays (on top of ship)
// Based on original GamePlay.m rendering order
export const OVERLAY_OBJECTS = new Set([
    'w'.charCodeAt(0), // E_WATER
    'v'.charCodeAt(0), // E_TOP_WATER
    '?'.charCodeAt(0), // E_WKEY
    '%'.charCodeAt(0), // E_WFUEL
    'q'.charCodeAt(0), // E_WBONUS
    ']'.charCodeAt(0), // E_WBONUS1
    '('.charCodeAt(0), // E_WBONUS2
    ')'.charCodeAt(0), // E_WBONUS3
    '['.charCodeAt(0), // E_WBONUS4
    'x'.charCodeAt(0), // E_STOP
]);
export function isOverlayObject(objectType) {
    return OVERLAY_OBJECTS.has(objectType);
}
