import type { GlobalState } from './globalState.js';
import type { ActionState } from './actions.js';

export class SoundManager {
    private context: AudioContext | null = null;
    private buffers: Map<string, AudioBuffer> = new Map();
    private musicBuffers: Map<string, AudioBuffer> = new Map();
    private enabled = false;
    private lastState: GlobalState | null = null;
    private thrustSource: AudioBufferSourceNode | null = null;
    private musicSource: AudioBufferSourceNode | null = null;
    private musicGain: GainNode | null = null;
    private currentTrack: string | null = null;
    private activeActionIds = new Set<number>();
    private wasInWater = false;
    private lastWallHitTime = 0;

    private readonly SOUNDS = {
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

    private readonly MUSIC = [
        'music/Gw1.m4r',
        'music/Gw2.m4r',
        'music/Gw3.m4r',
        'music/Gw4.m4r',
        'music/Gw5.m4r'
    ];

    constructor() {
        // Start initialization immediately
        this.init();

        // Resume on first interaction
        const resume = () => {
            if (this.context?.state === 'suspended') {
                this.context.resume();
                console.log('[SoundManager] AudioContext resumed');
            }
        };

        window.addEventListener('click', resume, { once: true });
        window.addEventListener('keydown', resume, { once: true });
        window.addEventListener('touchstart', resume, { once: true });
    }

    private async init() {
        if (this.context) return;

        try {
            this.context = new AudioContext();
            this.musicGain = this.context.createGain();
            this.musicGain.gain.value = 0.4;
            this.musicGain.connect(this.context.destination);

            // Parallel loading of sounds and music
            await Promise.all([
                this.loadSounds(),
                this.loadMusic()
            ]);

            this.enabled = true;
            console.log('[SoundManager] Audio initialized and pre-loaded');

            // If update was already called, start music now
            if (this.lastState) {
                this.playMusic(this.lastState.levelnum);
            }
        } catch (e) {
            console.error('[SoundManager] Failed to init audio', e);
        }
    }

    private async loadSounds() {
        if (!this.context) return;
        const tasks = Object.entries(this.SOUNDS).map(async ([name, url]) => {
            try {
                const buffer = await this.fetchAndDecode(url);
                this.buffers.set(name, buffer);
            } catch (e) {
                console.warn(`[SoundManager] Failed to load sound ${name}: ${url}`, e);
            }
        });
        await Promise.all(tasks);
    }

    private async loadMusic() {
        if (!this.context) return;
        const tasks = this.MUSIC.map(async (url) => {
            try {
                const buffer = await this.fetchAndDecode(url);
                this.musicBuffers.set(url, buffer);
            } catch (e) {
                console.warn(`[SoundManager] Failed to load music: ${url}`, e);
            }
        });
        await Promise.all(tasks);
    }

    private async fetchAndDecode(url: string): Promise<AudioBuffer> {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        return await this.context!.decodeAudioData(arrayBuffer);
    }

    /**
     * Internal async dispatcher for fire-and-forget sound effects.
     * Prevents the main game loop from stalling on buffer source creation.
     */
    private playEffect(name: keyof typeof this.SOUNDS) {
        if (!this.enabled || !this.context) return;

        // Dispatched to microtask to avoid stalling the current execution frame
        Promise.resolve().then(() => {
            // Throttle wall hits to avoid machine-gun effect stalling
            if (name === 'wallhit') {
                const now = performance.now();
                if (now - this.lastWallHitTime < 50) return;
                this.lastWallHitTime = now;
            }
            this.play(name);
        });
    }

    private playMusic(levelNum: number = 1) {
        if (!this.enabled || !this.context || !this.musicGain) return;

        const trackIndex = (levelNum - 1) % this.MUSIC.length;
        const track = this.MUSIC[trackIndex];

        // Prevent restarting the same track
        if (track === this.currentTrack) return;

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
        } catch (e) {
            console.warn(`[SoundManager] Failed to play music ${track}`, e);
        }
    }

    public play(name: keyof typeof this.SOUNDS, loop = false): AudioBufferSourceNode | null {
        if (!this.enabled || !this.context) return null;

        if (this.context.state === 'suspended') {
            this.context.resume();
        }

        const buffer = this.buffers.get(name);
        if (!buffer) return null;

        const source = this.context.createBufferSource();
        source.buffer = buffer;
        source.loop = loop;
        source.connect(this.context.destination);
        source.start();
        return source;
    }

    public update(currentState: GlobalState, actions: ActionState[], levelMap: { width: number; objects: Uint8Array } | null) {
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
        } else if (currentState.shipThrust === 0 && this.thrustSource) {
            try {
                this.thrustSource.stop();
            } catch (e) { }
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
        const currentActiveIds = new Set<number>();
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
