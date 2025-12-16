import { StartScreen } from './startScreen';
import { LevelCompleteScreen } from './levelComplete';
export class UIManager {
    onStartLevel;
    onNextLevel;
    container;
    startScreen;
    levelCompleteScreen;
    currentScreen = null;
    constructor(containerId, onStartLevel, onNextLevel) {
        this.onStartLevel = onStartLevel;
        this.onNextLevel = onNextLevel;
        const container = document.getElementById(containerId);
        if (!container)
            throw new Error(`Container ${containerId} not found`);
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
    showStartScreen() {
        this.hideAll();
        this.currentScreen = 'start';
        this.startScreen.show();
    }
    showLevelComplete(stats) {
        this.hideAll();
        this.currentScreen = 'levelComplete';
        this.levelCompleteScreen.show(stats);
    }
    hideAll() {
        this.startScreen.hide();
        this.levelCompleteScreen.hide();
        this.currentScreen = null;
    }
    isUIActive() {
        return this.currentScreen !== 'game' && this.currentScreen !== null;
    }
}
