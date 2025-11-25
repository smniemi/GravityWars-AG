import type { GlobalState } from './globalState.js';
import type { ActionState } from './actions.js';

export class SoundManager {
    private context: AudioContext | null = null;
    private buffers: Map<string, AudioBuffer> = new Map();
    private enabled = false;
    private lastState: GlobalState | null = null;
    private thrustSource: AudioBufferSourceNode | null = null;
    private musicSource: AudioBufferSourceNode | null = null;
    private musicGain: GainNode | null = null;
    private activeActionIds = new Set<number>();
    private wasInWater = false;

    private readonly SOUNDS = {
        key: '/sounds/key2.wav',
        cling: '/sounds/cling.wav',
        splash: '/sounds/splash2.wav',
        happy: '/sounds/finish.wav',
        whoosh: '/sounds/whoosh2.wav',
        explode: '/sounds/explode2.wav',
        wallhit: '/sounds/wallhit.wav',
        thrust: '/sounds/aircraft008.wav',
        punch: '/sounds/punch.wav'
    };

    private readonly MUSIC = [
        '/music/Gw1.m4r',
        '/music/Gw2.m4r',
        '/music/Gw3.m4r',
        '/music/Gw4.m4r',
        '/music/Gw5.m4r'
    ];

    constructor() {
        // AudioContext must be initialized after user interaction
        // iOS requires touch events specifically
        window.addEventListener('click', () => this.init(), { once: true });
        window.addEventListener('keydown', () => this.init(), { once: true });
        window.addEventListener('touchstart', () => this.init(), { once: true });
    }

    private async init() {
        if (this.context) return;

        try {
            this.context = new AudioContext();
            this.musicGain = this.context.createGain();
            this.musicGain.gain.value = 0.4; // Lower music volume
            this.musicGain.connect(this.context.destination);

            this.enabled = true;

            // Resume context if suspended (iOS requirement)
            if (this.context.state === 'suspended') {
                await this.context.resume();
            }

            await this.loadSounds();
            this.playMusic();
            console.log('[SoundManager] Audio initialized');
        } catch (e) {
            console.error('[SoundManager] Failed to init audio', e);
        }
    }

    private async loadSounds() {
        if (!this.context) return;

        for (const [name, url] of Object.entries(this.SOUNDS)) {
            try {
                const response = await fetch(url);
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
                this.buffers.set(name, audioBuffer);
            } catch (e) {
                console.warn(`[SoundManager] Failed to load sound ${name} from ${url}`, e);
            }
        }
    }

    private async playMusic(levelNum: number = 1) {
        if (!this.context || !this.musicGain) return;

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
        } catch (e) {
            console.warn(`[SoundManager] Failed to play music ${track}`, e);
        }
    }

    public play(name: keyof typeof this.SOUNDS, loop = false): AudioBufferSourceNode | null {
        if (!this.enabled || !this.context) return null;

        // Resume context if suspended (iOS can suspend it)
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
        } else if (currentState.shipThrust === 0 && this.thrustSource) {
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
        const currentActiveIds = new Set<number>();

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
