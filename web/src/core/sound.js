export class SoundManager {
    context = null;
    buffers = new Map();
    musicBuffers = new Map();
    enabled = false;
    lastState = null;
    thrustSource = null;
    musicSource = null;
    musicGain = null;
    currentTrack = null;
    activeActionIds = new Set();
    wasInWater = false;
    lastWallHitTime = 0;
    SOUNDS = {
        key: 'sounds/key2.wav',
        cling: 'sounds/cling.wav',
        splash: 'sounds/splash2.wav',
        happy: 'sounds/finish.wav',
        whoosh: 'sounds/whoosh2.wav',
        explode: 'sounds/explode2.wav',
        wallhit: 'sounds/wallhit.wav',
        thrust: 'sounds/aircraft008.wav',
        punch: 'sounds/punch.wav'
    };
    MUSIC = [
        'music/Gw1.m4r',
        'music/Gw2.m4r',
        'music/Gw3.m4r',
        'music/Gw4.m4r',
        'music/Gw5.m4r'
    ];
    sfxGain = null;
    initPromise = null;
    unlocked = false;
    constructor() {
        // Do NOT init here - wait for user gesture
        this.bindResumeEvents();
    }
    /**
     * Call this from a user gesture (click/touch handler) to unlock audio on mobile.
     * This creates the AudioContext during the gesture, which is required on iOS.
     */
    async unlock() {
        if (this.unlocked && this.context?.state === 'running') {
            return; // Already unlocked
        }
        console.log('[SoundManager] unlock() called');
        // Create context if needed
        if (!this.context) {
            try {
                const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                this.context = new AudioContextClass();
                console.log('[SoundManager] AudioContext created in unlock(), state:', this.context.state);
            }
            catch (e) {
                console.error('[SoundManager] Failed to create AudioContext:', e);
                return;
            }
        }
        // Resume if suspended
        if (this.context.state === 'suspended') {
            try {
                await this.context.resume();
                console.log('[SoundManager] AudioContext resumed, state:', this.context.state);
            }
            catch (e) {
                console.error('[SoundManager] Failed to resume AudioContext:', e);
            }
        }
        // Play a silent buffer to fully unlock on iOS
        if (!this.unlocked && this.context.state === 'running') {
            try {
                const silentBuffer = this.context.createBuffer(1, 1, 22050);
                const source = this.context.createBufferSource();
                source.buffer = silentBuffer;
                source.connect(this.context.destination);
                source.start(0);
                source.stop(0.001);
                this.unlocked = true;
                console.log('[SoundManager] Audio unlocked with silent buffer');
            }
            catch (e) {
                console.warn('[SoundManager] Silent buffer unlock failed:', e);
            }
        }
        // Now initialize if not already done
        if (!this.initPromise) {
            this.initPromise = this.init();
        }
        await this.initPromise;
    }
    bindResumeEvents() {
        const tryUnlock = () => {
            // Try to unlock on any user interaction
            this.unlock().catch(() => { });
        };
        // Bind to all possible interaction events
        ['click', 'keydown', 'touchstart', 'touchend', 'mousedown', 'pointerdown'].forEach(event => {
            window.addEventListener(event, tryUnlock, { passive: true });
        });
    }
    async init() {
        if (this.enabled)
            return;
        if (!this.context) {
            console.warn('[SoundManager] init() called but no context - call unlock() first');
            return;
        }
        try {
            console.log('[SoundManager] Initializing audio system...');
            this.musicGain = this.context.createGain();
            this.musicGain.gain.value = 0.4;
            this.musicGain.connect(this.context.destination);
            this.sfxGain = this.context.createGain();
            this.sfxGain.gain.value = 1.0;
            this.sfxGain.connect(this.context.destination);
            // Parallel loading of sounds and music
            await Promise.all([
                this.loadSounds(),
                this.loadMusic()
            ]);
            this.enabled = true;
            console.log('[SoundManager] Audio initialized. Buffers:', this.buffers.size, 'sounds,', this.musicBuffers.size, 'music');
            // If update was already called, start music now
            if (this.lastState) {
                this.playMusic(this.lastState.levelnum);
            }
        }
        catch (e) {
            console.error('[SoundManager] Failed to init audio', e);
        }
    }
    async loadSounds() {
        if (!this.context)
            return;
        const tasks = Object.entries(this.SOUNDS).map(async ([name, url]) => {
            try {
                const buffer = await this.fetchAndDecode(url);
                this.buffers.set(name, buffer);
            }
            catch (e) {
                console.warn(`[SoundManager] Failed to load sound ${name}: ${url}`, e);
            }
        });
        await Promise.all(tasks);
    }
    async loadMusic() {
        if (!this.context)
            return;
        const tasks = this.MUSIC.map(async (url) => {
            try {
                const buffer = await this.fetchAndDecode(url);
                this.musicBuffers.set(url, buffer);
            }
            catch (e) {
                console.warn(`[SoundManager] Failed to load music: ${url}`, e);
            }
        });
        await Promise.all(tasks);
    }
    setSfxVolume(volume) {
        if (this.sfxGain) {
            this.sfxGain.gain.setTargetAtTime(volume, this.context.currentTime, 0.1);
        }
    }
    async fetchAndDecode(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        return await this.context.decodeAudioData(arrayBuffer);
    }
    /**
     * Internal async dispatcher for fire-and-forget sound effects.
     * Prevents the main game loop from stalling on buffer source creation.
     */
    playEffect(name) {
        if (!this.enabled || !this.context)
            return;
        // Dispatched to microtask to avoid stalling the current execution frame
        Promise.resolve().then(() => {
            // Throttle wall hits to avoid machine-gun effect stalling
            if (name === 'wallhit') {
                const now = performance.now();
                if (now - this.lastWallHitTime < 50)
                    return;
                this.lastWallHitTime = now;
            }
            this.play(name);
        });
    }
    playMusic(levelNum = 1) {
        if (!this.enabled || !this.context || !this.musicGain)
            return;
        // Auto-resume if needed (browser policy permitting)
        if (this.context.state === 'suspended') {
            this.context.resume().catch(() => { });
        }
        // Map Level 0 (Intro) to Level 10 music (Gw5), or handle wrapping
        const effectiveLevel = levelNum <= 0 ? 10 : levelNum;
        const trackIndex = (effectiveLevel - 1) % this.MUSIC.length;
        const track = this.MUSIC[trackIndex];
        console.log(`[SoundManager] playMusic requested for level: ${levelNum}. Effective: ${effectiveLevel}. Track: ${track}`);
        // Prevent restarting the same track
        if (track === this.currentTrack)
            return;
        const buffer = this.musicBuffers.get(track);
        if (!buffer) {
            console.warn(`[SoundManager] Music buffer not ready for: ${track}`);
            return;
        }
        try {
            if (this.musicSource) {
                this.musicSource.stop();
            }
            this.musicSource = this.context.createBufferSource();
            this.musicSource.buffer = buffer;
            this.musicSource.loop = true;
            this.musicSource.connect(this.musicGain);
            this.musicSource.start();
            this.currentTrack = track;
            console.log(`[SoundManager] Playing music: ${track}`);
        }
        catch (e) {
            console.warn(`[SoundManager] Failed to play music ${track}`, e);
        }
    }
    play(name, loop = false) {
        if (!this.enabled || !this.context)
            return null;
        if (this.context.state === 'suspended') {
            this.context.resume();
        }
        const buffer = this.buffers.get(name);
        if (!buffer)
            return null;
        const source = this.context.createBufferSource();
        source.buffer = buffer;
        source.loop = loop;
        source.connect(this.sfxGain || this.context.destination);
        source.start();
        return source;
    }
    update(currentState, actions, levelMap) {
        if (!this.lastState) {
            this.lastState = { ...currentState };
            this.playMusic(currentState.levelnum);
            return;
        }
        // Key collected
        if (currentState.numKeys < this.lastState.numKeys) {
            this.playEffect('key');
        }
        // Score increased (Bonus/Fuel)
        if (currentState.shipScore > this.lastState.shipScore || currentState.shipFuel > this.lastState.shipFuel) {
            if (currentState.shipScore !== this.lastState.shipScore) {
                this.playEffect('cling');
            }
        }
        // Explosion
        if (currentState.shipState === 2 && this.lastState.shipState !== 2) {
            this.playEffect('explode');
        }
        // Level Complete
        if (currentState.levelnum !== this.lastState.levelnum) {
            this.playEffect('happy');
            this.playMusic(currentState.levelnum);
        }
        // Thrust Loop (triggered once per state change)
        if (currentState.shipThrust > 0 && !this.thrustSource) {
            this.thrustSource = this.play('thrust', true);
        }
        else if (currentState.shipThrust === 0 && this.thrustSource) {
            try {
                this.thrustSource.stop();
            }
            catch (e) { }
            this.thrustSource = null;
        }
        // Ship Water Splash
        if (levelMap) {
            const tileX = Math.floor(((currentState.sx >> 10) + 16) / 32);
            const tileY = Math.floor(((currentState.sy >> 10) + 16) / 32);
            if (tileX >= 0 && tileX < levelMap.width) {
                const idx = tileY * levelMap.width + tileX;
                if (idx < levelMap.objects.length) {
                    const obj = levelMap.objects[idx];
                    const isWater = obj === 119 || obj === 118;
                    if (isWater && !this.wasInWater) {
                        this.playEffect('splash');
                    }
                    this.wasInWater = isWater;
                }
            }
        }
        // Bullet Actions (Spark/Splash)
        const currentActiveIds = new Set();
        for (const action of actions) {
            if (action.active) {
                currentActiveIds.add(action.id);
                if (!this.activeActionIds.has(action.id)) {
                    // Spark (Bullet hit wall) - Frame 48
                    if (action.start === 48) {
                        this.playEffect('wallhit');
                    }
                    // Splash (Bullet hit water) - Frame 113
                    else if (action.start === 113) {
                        this.playEffect('splash');
                    }
                }
            }
        }
        this.activeActionIds = currentActiveIds;
        this.lastState = { ...currentState };
    }
}
