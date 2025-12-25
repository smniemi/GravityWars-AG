import { StartScreen } from './startScreen';
import { LevelCompleteScreen } from './levelComplete';

export class UIManager {
    private container: HTMLElement;
    private startScreen: StartScreen;
    private levelCompleteScreen: LevelCompleteScreen;
    private currentScreen: 'start' | 'game' | 'levelComplete' | null = null;

    constructor(containerId: string,
        private onStartLevel: (level: number) => void,
        private onNextLevel: () => void) {
        const container = document.getElementById(containerId);
        if (!container) throw new Error(`Container ${containerId} not found`);
        this.container = container;

        this.startScreen = new StartScreen(this.container, (level) => {
            this.hideAll();
            this.currentScreen = 'game';
            this.onStartLevel(level);
        });

        this.levelCompleteScreen = new LevelCompleteScreen(this.container, () => {
            this.hideAll();
            this.currentScreen = 'game'; // Or transition to next level directly
            this.onNextLevel();
        });
    }

    public showStartScreen() {
        this.hideAll();
        this.currentScreen = 'start';
        this.startScreen.show();
    }

    public showLevelComplete(stats: {
        levelName: string,
        time: number,
        fuel: number,
        currentScore: number,
        levelIndex: number,
        levelStartScore: number
    }) {
        this.hideAll();
        this.currentScreen = 'levelComplete';
        this.levelCompleteScreen.show(stats);
    }

    public hideAll() {
        this.startScreen.hide();
        this.levelCompleteScreen.hide();
        this.currentScreen = null;
    }

    public isUIActive(): boolean {
        return this.currentScreen !== 'game' && this.currentScreen !== null;
    }
}
