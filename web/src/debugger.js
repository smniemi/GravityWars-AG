let lastSent = 0;
const MIN_INTERVAL = 250;
export function sendDebugSnapshot(snapshot) {
    if (!import.meta.env.DEV) {
        return;
    }
    const now = performance.now();
    if (now - lastSent < MIN_INTERVAL) {
        return;
    }
    lastSent = now;
    const payload = JSON.stringify({
        timestamp: now,
        ...snapshot
    });
    if (navigator.sendBeacon) {
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon('/__debug', blob);
        return;
    }
    fetch('/__debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true
    }).catch(() => { });
}
