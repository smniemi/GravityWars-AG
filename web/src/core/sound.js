export class SoundManager {
    context = null;
    buffers = new Map();
    enabled = false;
    lastState = null;
    thrustSource = null;
    musicSource = null;
    musicGain = null;
    activeActionIds = new Set();
    wasInWater = false;
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
    constructor() {
        // Initialize immediately
        this.init();
        // Resume on first interaction
        const resume = () => {
            if (this.context?.state === 'suspended') {
                this.context.resume();
                console.log('[SoundManager] AudioContext resumed by user interaction');
            }
        };
        window.addEventListener('click', resume, { once: true });
        window.addEventListener('keydown', resume, { once: true });
        window.addEventListener('touchstart', resume, { once: true });
    }
    async init() {
        if (this.context)
            return;
        try {
            // Create context immediately (likely suspended state)
            this.context = new AudioContext();
            this.musicGain = this.context.createGain();
            this.musicGain.gain.value = 0.4;
            this.musicGain.connect(this.context.destination);
            this.enabled = true;
            await this.loadSounds();
            this.playMusic();
            console.log('[SoundManager] Audio initialized immediately');
        }
        catch (e) {
            console.error('[SoundManager] Failed to init audio', e);
        }
    }
    async loadSounds() {
        if (!this.context)
            return;
        for (const [name, url] of Object.entries(this.SOUNDS)) {
            try {
                const response = await fetch(url);
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
                this.buffers.set(name, audioBuffer);
            }
            catch (e) {
                console.warn(`[SoundManager] Failed to load sound ${name} from ${url}`, e);
            }
        }
    }
    async playMusic(levelNum = 1) {
        if (!this.context || !this.musicGain)
            return;
        // Map level 1..N to 0..4
        const trackIndex = (levelNum - 1) % this.MUSIC.length;
        const track = this.MUSIC[trackIndex];
        try {
            const response = await fetch(track);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
            if (this.musicSource) {
                this.musicSource.stop();
            }
            this.musicSource = this.context.createBufferSource();
            this.musicSource.buffer = audioBuffer;
            this.musicSource.loop = true;
            this.musicSource.connect(this.musicGain);
            this.musicSource.start();
            console.log(`[SoundManager] Playing music: ${track} for level ${levelNum}`);
        }
        catch (e) {
            console.warn(`[SoundManager] Failed to play music ${track}`, e);
        }
    }
    play(name, loop = false) {
        if (!this.enabled || !this.context)
            return null;
        // Resume context if suspended (iOS can suspend it)
        if (this.context.state === 'suspended') {
            this.context.resume();
        }
        const buffer = this.buffers.get(name);
        if (!buffer)
            return null;
        const source = this.context.createBufferSource();
        source.buffer = buffer;
        source.loop = loop;
        source.connect(this.context.destination);
        source.start();
        return source;
    }
    update(currentState, actions, levelMap) {
        if (!this.lastState) {
            this.lastState = { ...currentState };
            if (this.enabled) {
                this.playMusic(currentState.levelnum);
            }
            return;
        }
        // Key collected
        if (currentState.numKeys < this.lastState.numKeys) {
            this.play('key');
        }
        // Score increased (Bonus/Fuel)
        if (currentState.shipScore > this.lastState.shipScore || currentState.shipFuel > this.lastState.shipFuel) {
            if (currentState.shipScore !== this.lastState.shipScore) {
                this.play('cling');
            }
        }
        // Explosion
        if (currentState.shipState === 2 && this.lastState.shipState !== 2) {
            this.play('explode');
        }
        // Level Complete
        if (currentState.levelnum !== this.lastState.levelnum) {
            this.play('happy');
            this.playMusic(currentState.levelnum);
        }
        // Thrust Loop
        if (currentState.shipThrust > 0 && !this.thrustSource) {
            this.thrustSource = this.play('thrust', true);
        }
        else if (currentState.shipThrust === 0 && this.thrustSource) {
            this.thrustSource.stop();
            this.thrustSource = null;
        }
        // Ship Water Splash
        if (levelMap) {
            // Convert ship coordinates (fixed point 10.5) to tile coordinates
            // sx is >> 10 (pixel) + 16 (center) >> 5 (tile)
            const tileX = Math.floor(((currentState.sx >> 10) + 16) / 32);
            const tileY = Math.floor(((currentState.sy >> 10) + 16) / 32);
            if (tileX >= 0 && tileX < levelMap.width) {
                const idx = tileY * levelMap.width + tileX;
                if (idx < levelMap.objects.length) {
                    const obj = levelMap.objects[idx];
                    // 'w' (119) or 'v' (118)
                    const isWater = obj === 119 || obj === 118;
                    if (isWater && !this.wasInWater) {
                        this.play('splash');
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
                        this.play('wallhit');
                    }
                    // Splash (Bullet hit water) - Frame 113
                    else if (action.start === 113) {
                        this.play('splash');
                    }
                }
            }
        }
        this.activeActionIds = currentActiveIds;
        this.lastState = { ...currentState };
    }
}
