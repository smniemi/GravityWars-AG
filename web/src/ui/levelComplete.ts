
import { supabase } from '../core/supabase.js';

export class LevelCompleteScreen {
    private element: HTMLElement;
    private isVisible: boolean = false;
    private animationFrame: number | null = null;
    private onContinue: () => void = () => { };
    private pendingSubmissionAction: (() => void) | null = null;
    private ignoreGlobalFetch: boolean = false;


    constructor(container: HTMLElement, onContinueCallback: () => void) {
        this.onContinue = onContinueCallback;
        this.element = document.createElement('div');
        this.element.className = 'level-complete-screen';
        this.element.style.position = 'absolute';
        this.element.style.top = '0';
        this.element.style.left = '0';
        this.element.style.width = '100%';
        this.element.style.height = '100%';
        this.element.style.display = 'none';
        this.element.style.flexDirection = 'column';
        this.element.style.alignItems = 'center';
        this.element.style.justifyContent = 'center';
        this.element.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
        this.element.style.backdropFilter = 'blur(5px)';
        this.element.style.zIndex = '90';
        this.element.style.opacity = '0';
        this.element.style.transition = 'opacity 0.3s ease-out';
        this.element.style.cursor = 'pointer';

        this.element.innerHTML = `
            <div class="lc-container">
                <!-- Left Panel: Stats -->
                <div class="lc-panel stats-panel">
                    <h2 class="galactic-text section-title">MISSION REPORT</h2>
                    <h1 id="lc-level-name" class="galactic-text level-title">LEVEL X</h1>
                    
                    <div class="score-grid">
                        <div class="score-label">BASE SCORE</div>
                        <div id="lc-base-score" class="score-value">0</div>
                        
                        <div class="score-label">LIVES BONUS</div>
                        <div id="lc-lives-bonus" class="score-value">0</div>
                        
                        <div class="score-label">TIME BONUS</div>
                        <div id="lc-time-bonus" class="score-value">0</div>
                        
                        <div class="score-label">FUEL BONUS</div>
                        <div id="lc-fuel-bonus" class="score-value">0</div>
                    </div>

                    <div class="total-score-box">
                        <div class="total-label">MISSION SCORE</div>
                        <div id="lc-score" class="total-value">0</div>
                    </div>
                </div>

                <!-- Right Panel: Records -->
                <div class="lc-panel records-panel">
                    <h2 class="galactic-text section-title">LEADERBOARD</h2>
                    
                    <div class="record-box personal-box">
                        <div style="opacity: 0" id="lc-new-pb-label" class="new-record-badge">NEW RECORD!</div>
                        <div class="record-label">PERSONAL BEST</div>
                        <div id="lc-pb" class="record-value">0</div>
                    </div>

                    <div class="record-box global-box">
                        <div style="opacity: 0" id="lc-new-high-label" class="new-record-badge">NEW RECORD!</div>
                        <div class="record-label">GALACTIC RECORD</div>
                        <div id="lc-high" class="record-value">0</div>
                        <div id="lc-high-holder" class="record-holder">Fetching data...</div>
                    </div>
                    
                    <div class="continue-hint">
                        TAP TO CONTINUE
                    </div>
                    




            <style>
                .lc-container {
                    animation: slideUp 0.4s ease-out;
                    display: flex;
                    flex-direction: row;
                    flex-wrap: wrap;
                    gap: 30px;
                    align-items: stretch;
                    justify-content: center;
                    max-width: 95vw;
                    max-height: 90vh;
                    overflow-y: auto;
                    padding: 20px;
                    box-sizing: border-box;
                }
                @keyframes slideUp { from { transform: translateY(50px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                
                .lc-panel {
                    background: rgba(10, 20, 30, 0.85);
                    border: 1px solid rgba(0, 255, 255, 0.3);
                    border-radius: 12px;
                    padding: 30px;
                    width: 380px;
                    max-width: 100%;
                    box-shadow: 0 0 20px rgba(0,0,0,0.5);
                    display: flex;
                    flex-direction: column;
                }
                .section-title {
                    color: #0af; 
                    font-size: 16px; 
                    margin: 0 0 10px 0; 
                    letter-spacing: 3px;
                    opacity: 0.8;
                }
                .level-title {
                    color: #fff; 
                    font-size: 36px; 
                    margin: 0 0 30px 0; 
                    text-shadow: 0 0 15px #0af;
                    border-bottom: 1px solid rgba(0, 255, 255, 0.2);
                    padding-bottom: 20px;
                }
                .score-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 15px;
                    margin-bottom: 30px;
                }
                .score-label {
                    text-align: left;
                    color: #889;
                    font-family: monospace;
                    font-size: 14px;
                }
                .score-value {
                    text-align: right;
                    color: #fff;
                    font-family: monospace;
                    font-size: 16px;
                }
                .total-score-box {
                    background: rgba(0, 0, 0, 0.3);
                    padding: 20px;
                    border-radius: 8px;
                    text-align: center;
                    margin-top: auto;
                    border: 1px solid rgba(255, 255, 0, 0.3);
                }
                .total-label {
                    color: #ff0;
                    font-size: 14px;
                    letter-spacing: 2px;
                    margin-bottom: 5px;
                }
                .total-value {
                    color: #fff;
                    font-size: 32px;
                    font-weight: bold;
                    font-family: monospace;
                    text-shadow: 0 0 10px rgba(255, 255, 0, 0.5);
                }

                .record-box {
                    background: rgba(255, 255, 255, 0.05);
                    padding: 20px;
                    border-radius: 8px;
                    margin-bottom: 20px;
                    text-align: center;
                    position: relative;
                }
                .record-box.global-box {
                    background: linear-gradient(180deg, rgba(0, 40, 60, 0.5), rgba(0, 20, 30, 0.5));
                    border: 1px solid rgba(0, 255, 255, 0.1);
                    flex-grow: 1;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                }
                .record-label {
                    color: #889;
                    font-size: 12px;
                    letter-spacing: 1px;
                    margin-bottom: 5px;
                }
                .record-value {
                    font-size: 28px;
                    color: #fff;
                    font-family: monospace;
                    margin-bottom: 5px;
                }
                .record-holder {
                    color: #0af;
                    font-size: 12px;
                    font-family: monospace;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    max-width: 100%;
                    opacity: 0.8;
                }
                .new-record-badge {
                    position: absolute;
                    top: -10px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: #0f0;
                    color: #000;
                    font-size: 10px;
                    padding: 2px 8px;
                    border-radius: 10px;
                    font-weight: bold;
                    box-shadow: 0 0 10px #0f0;
                }
                
                .continue-hint {
                    margin-top: 20px; 
                    color: #0af; 
                    animation: pulse 1.5s infinite; 
                    font-size: 12px; 
                    letter-spacing: 2px;
                    text-align: center;
                }

                @keyframes pulse {
                    0% { opacity: 0.5; }
                    50% { opacity: 1; }
                    100% { opacity: 0.5; }
                }
                @keyframes rainbow { 
                    0%{color: orange;} 	
                    10%{color: purple;} 	
                    20%{color: red;} 
                    30%{color: CadetBlue;} 
                    40%{color: yellow;} 
                    50%{color: coral;} 
                    60%{color: green;} 
                    70%{color: cyan;} 
                    80%{color: DeepPink;} 
                    90%{color: DodgerBlue;} 
                    100%{color: orange;} 
                }
                .record-pulse {
                    animation: pulse 0.5s infinite alternate;
                    color: yellow !important;
                    font-weight: bold;
                    text-shadow: 0 0 10px yellow;
                }
                
                /* Mobile layout adjustment */
                @media (max-height: 500px) {
                     .lc-container {
                         flex-direction: row;
                         gap: 20px;
                         transform: scale(0.8);
                     }
                }
            </style>
        `;
        container.appendChild(this.element);

        // Click for desktop
        this.element.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('[LevelComplete] Click detected');
            this.handleInput();
        });

        // Touchend for mobile (more reliable than click on touch devices)
        this.element.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('[LevelComplete] Touch detected');
            this.handleInput();
        });



    }

    public setOnContinue(callback: () => void) {
        this.onContinue = callback;
    }

    private handleInput() {
        console.log('[LevelComplete] handleInput called, isVisible:', this.isVisible);
        if (this.isVisible) {
            // If overlay is open, ignore clicks on the background (the overlay handles its own clicks)
            if (this.element.querySelector('.name-box')) {
                console.log('[LevelComplete] Ignoring background click while Name Entry is active');
                return;
            }

            // If we have a pending high score submission (user clicked before animation finished),
            // trigger it now instead of closing the screen!
            if (this.pendingSubmissionAction) {
                console.log('[LevelComplete] Accelerating High Score Entry...');
                this.pendingSubmissionAction();
                return;
            }

            console.log('[LevelComplete] Calling hide and onContinue');
            this.hide();
            this.onContinue();
        }
    }

    private handleKey = (e: KeyboardEvent) => {
        if (!this.isVisible) return;
        if (e.code === 'Space' || e.code === 'Enter' || e.key === ' ' || e.key === 'Enter') {
            this.handleInput();
        }
    }

    public show(stats: {
        levelName: string,
        time: number,
        fuel: number,
        lives: number,
        currentScore: number,
        levelIndex: number,
        levelStartScore: number
    }) {
        this.isVisible = true;
        this.ignoreGlobalFetch = false; // Reset on each show
        this.element.style.display = 'flex';
        // Trigger reflow
        void this.element.offsetWidth;
        this.element.style.opacity = '1';
        window.addEventListener('keydown', this.handleKey);

        const nameEl = this.element.querySelector('#lc-level-name');
        if (nameEl) nameEl.textContent = stats.levelName;

        const livesBonus = Math.floor(stats.lives * 1000);
        const timeBonus = Math.floor(stats.time * 5);
        const fuelBonus = Math.floor(stats.fuel * 2);
        const displayedBaseScore = Math.floor(stats.currentScore * 10);
        const totalBonus = livesBonus + timeBonus + fuelBonus;

        // Level Score = (Points collected * 10) + Lives Bonus + Time Bonus + Fuel Bonus
        const levelTotalScore = displayedBaseScore + totalBonus;

        // Local Storage Handling
        const storageKey = `gw_pb_level_${stats.levelIndex}`;
        const storedPbStr = localStorage.getItem(storageKey);
        const storedPb = storedPbStr ? parseInt(storedPbStr, 10) : 0;

        const isNewRecord = levelTotalScore > storedPb;
        const previousBest = storedPb;




        // --- Fetch and Display Global High Score ---
        const highHolderEl = this.element.querySelector('#lc-high-holder') as HTMLElement;
        if (highHolderEl) highHolderEl.textContent = 'Fetching...';

        supabase.from('level_high_scores')
            .select('score, player_name, location')
            .eq('level_id', stats.levelIndex)
            .order('score', { ascending: false })
            .limit(1)
            .then(({ data, error }) => {
                if (this.ignoreGlobalFetch) return; // Don't overwrite if user just submitted!
                if (!error && data && data.length > 0) {
                    const top = data[0];
                    let holderText = `Held by: ${top.player_name || 'Unknown'}`;
                    if (top.location && top.location !== 'Unknown Sector' && top.location !== 'Unknown') {
                        holderText += ` (${top.location})`;
                    }

                    // Simple logic: Always show the global high score here
                    const globalHigh = top.score;
                    const highEl = this.element.querySelector('#lc-high');

                    // Update display if global is better than local knowlege (or just always trust global for this field)
                    if (highEl) highEl.textContent = globalHigh.toLocaleString();
                    if (highHolderEl) {
                        highHolderEl.textContent = holderText;
                        highHolderEl.style.color = '#0af';
                    }
                } else {
                    if (highHolderEl) highHolderEl.textContent = 'No records yet';
                }
            });

        // Update stored record
        console.log(`[LevelComplete] Check New Record: Score ${levelTotalScore} > Old PB ${storedPb} ? ${isNewRecord}`);


        // --- Submit Logic (Wait for Animation) ---
        // We delay the submission prompt until the score counting animation finishes
        let submissionTriggered = false;

        const tryTriggerSubmission = () => {
            if (submissionTriggered) return;
            if (!isNewRecord) return;

            submissionTriggered = true;
            this.pendingSubmissionAction = null; // Clear pending action since we are running it

            // --- Async High Score Submission ---
            (async () => {
                // 1. Get User ID
                let userId = localStorage.getItem('gw_anon_user_id');
                if (!userId) {
                    userId = `anon_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
                    localStorage.setItem('gw_anon_user_id', userId);
                }

                // 2. Always Prompt for Name on New Record (allows friends to play) - Pre-fill with last known name
                let playerName = localStorage.getItem('gw_player_name') || '';

                // Show custom overlay for name entry
                this.showNameEntryOverlay(playerName, (name) => {
                    localStorage.setItem('gw_player_name', name);
                    this.submitScore(userId!, name, stats.levelIndex, levelTotalScore);
                });

            })();
        };

        if (isNewRecord) {
            this.element.dataset.isNewRecord = 'true';
            localStorage.setItem(storageKey, levelTotalScore.toString());
            // Register this action so handleInput can trigger it if user clicks early
            // Always trigger submission flow on new record, enabling name entry even if name exists
            this.pendingSubmissionAction = tryTriggerSubmission;
        } else {

            this.element.dataset.isNewRecord = 'false';
            this.pendingSubmissionAction = null;
        }

        // --- Mock High Score Logic ---
        // For simplicity, High Score = Personal Best in this local-only version.
        const storedHigh = previousBest;
        // const isNewHigh = isNewRecord;

        // Initial UI State (Before Animation)
        const pbEl = this.element.querySelector('#lc-pb');
        const highEl = this.element.querySelector('#lc-high');
        const pbLabelEl = this.element.querySelector('#lc-new-pb-label') as HTMLElement;
        const highLabelEl = this.element.querySelector('#lc-new-high-label') as HTMLElement;

        if (pbEl) pbEl.textContent = previousBest.toLocaleString();
        if (highEl) highEl.textContent = storedHigh.toLocaleString();

        if (pbLabelEl) pbLabelEl.style.opacity = '0';
        if (highLabelEl) highLabelEl.style.opacity = '0';
        if (pbEl) pbEl.classList.remove('record-pulse');
        if (highEl) highEl.classList.remove('record-pulse');

        // Main Animation Setup
        const baseScoreEl = this.element.querySelector('#lc-base-score');
        const livesBonusEl = this.element.querySelector('#lc-lives-bonus');
        const timeBonusEl = this.element.querySelector('#lc-time-bonus');
        const fuelBonusEl = this.element.querySelector('#lc-fuel-bonus');
        const scoreEl = this.element.querySelector('#lc-score');

        if (baseScoreEl) baseScoreEl.textContent = displayedBaseScore.toLocaleString();
        if (livesBonusEl) livesBonusEl.textContent = `+${livesBonus}`;
        if (timeBonusEl) timeBonusEl.textContent = `+${timeBonus}`;
        if (fuelBonusEl) fuelBonusEl.textContent = `+${fuelBonus}`;
        if (scoreEl) scoreEl.textContent = displayedBaseScore.toLocaleString(); // Start at base score

        console.log('[LevelComplete] Starting animation:', {
            currentScore: stats.currentScore,
            totalBonus,
            finalScore: levelTotalScore,
            previousBest,
            isNewRecord
        });

        const duration = 2000; // 2 seconds to count up total score
        let startTime: number | null = null;
        let pbAnimationTriggered = false;

        const animate = (now: number) => {
            if (!this.isVisible) return;

            if (startTime === null) startTime = now;
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1.0);

            // Ease out cubic
            const ease = 1 - Math.pow(1 - progress, 3);
            const currentAdd = Math.floor(totalBonus * ease);
            const currentDisplayedScore = displayedBaseScore + currentAdd;

            if (scoreEl) scoreEl.textContent = currentDisplayedScore.toLocaleString();

            // Trigger "New Record" animations once the main score has finished counting up
            // Or maybe animate them in parallel? Let's do it after main counter finishes for drama.
            if (progress >= 1.0 && !pbAnimationTriggered && isNewRecord) {
                pbAnimationTriggered = true;
                this.animateRecordUpdate(previousBest, levelTotalScore, pbEl, pbLabelEl);
                this.animateRecordUpdate(storedHigh, levelTotalScore, highEl, highLabelEl);

                // Trigger Name Entry AFTER animation
                setTimeout(() => tryTriggerSubmission(), 1500);
            }

            if (progress < 1.0 || (isNewRecord && !pbAnimationDone)) {
                // Keep loop running if main animation not done OR record animation running
                this.animationFrame = requestAnimationFrame(animate);
            } else {
                if (!isNewRecord) {
                    console.log('[LevelComplete] Animation complete (No new record)');
                }
            }
        };

        // Track record animation state separately if needed, but a simple fire-and-forget 
        // secondary animation loop is easier.
        let pbAnimationDone = !isNewRecord;

        // Re-bind manual submit button to capture current stats
        const forceBtn = this.element.querySelector('#lc-force-submit');
        if (forceBtn) {
            // Clone to strip old listeners
            const newBtn = forceBtn.cloneNode(true);
            forceBtn.parentNode?.replaceChild(newBtn, forceBtn);

            // Prevent background touch/click propagation
            newBtn.addEventListener('touchend', (e) => { e.stopPropagation(); });
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                let playerName = localStorage.getItem('gw_player_name') || '';
                this.showNameEntryOverlay(playerName, (name) => {
                    localStorage.setItem('gw_player_name', name);

                    const uid = localStorage.getItem('gw_anon_user_id') || `anon_${Date.now()}`;
                    if (!localStorage.getItem('gw_anon_user_id')) localStorage.setItem('gw_anon_user_id', uid);

                    this.submitScore(uid, name, stats.levelIndex, levelTotalScore);
                });
            });
        }

        // Reset animation frame
        if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
        this.animationFrame = requestAnimationFrame(animate);

    }

    private animateRecordUpdate(startValue: number, endValue: number, element: Element | null, labelElement: HTMLElement | null) {
        if (!element) return;

        // Delay slightly for effect
        setTimeout(() => {
            if (!this.isVisible) return;

            // Show "NEW RECORD!" label
            if (labelElement) {
                labelElement.style.opacity = '1';
                labelElement.style.animation = 'rainbow 0.5s infinite'; // Flashy
            }

            // Pulse the number
            element.classList.add('record-pulse');

            // Count up
            const duration = 1000;
            const startTime = performance.now();

            const animatePb = (now: number) => {
                if (!this.isVisible) return;
                const elapsed = now - startTime;
                const progress = Math.min(elapsed / duration, 1.0);
                const ease = 1 - Math.pow(1 - progress, 3);

                const val = Math.floor(startValue + (endValue - startValue) * ease);
                element.textContent = val.toLocaleString();

                if (progress < 1.0) {
                    requestAnimationFrame(animatePb);
                } else {
                    element.textContent = endValue.toLocaleString();
                }
            };
            requestAnimationFrame(animatePb);

        }, 500); // 0.5s delay after main score finishes
    }

    private async submitScore(uid: string, name: string, lvl: number, score: number) {
        // 3. Get Location (Best effort)
        let location = localStorage.getItem('gw_player_location') || 'Unknown Sector';
        if (location === 'Unknown Sector' || !location) {
            try {
                const res = await fetch('https://ipapi.co/json/');
                if (res.ok) {
                    const data = await res.json();
                    location = `${data.city}, ${data.country_name}`;
                    localStorage.setItem('gw_player_location', location);
                }
            } catch (e) {
                console.warn('Location fetch failed', e);
            }
        }

        console.log(`[High Score] Submitting: ${name} (${score}) from ${location}`);
        this.ignoreGlobalFetch = true; // Lock the UI record display

        // OPTIMISTIC UI UPDATE: Immediately show new high score if we beat what's on screen
        const highEl = this.element.querySelector('#lc-high');
        const highHolderEl = this.element.querySelector('#lc-high-holder');
        if (highEl && highHolderEl) {
            const currentHighText = highEl.textContent?.replace(/,/g, '') || '0';
            const currentHigh = parseInt(currentHighText) || 0;

            if (score >= currentHigh) {
                console.log('[LevelComplete] Optimistically updating High Score UI');
                highEl.textContent = score.toLocaleString();
                let holderText = `Held by: ${name}`;
                if (location && location !== 'Unknown Sector') holderText += ` (${location})`;
                highHolderEl.textContent = holderText;
                (highHolderEl as HTMLElement).style.color = '#0f0';
                highEl.classList.add('record-pulse');
            }
        }

        supabase.from('level_high_scores').upsert({
            user_id: uid,
            level_id: lvl,
            score: score,
            player_name: name,
            location: location
        }, { onConflict: 'user_id, level_id' })
            .then(({ error }) => {
                if (error) console.error('[Supabase] Sync failed:', error);
                else {
                    console.log('[Supabase] Sync success!');
                    // Visual feedback
                    const btn = this.element.querySelector('#lc-force-submit');
                    if (btn) {
                        btn.textContent = "SCORE REGISTERED";
                        (btn as HTMLElement).style.color = '#0f0';
                        (btn as HTMLElement).style.borderColor = '#0f0';
                    }

                    // Update High Score Display if we beat it
                    const highEl = this.element.querySelector('#lc-high');
                    const highHolderEl = this.element.querySelector('#lc-high-holder');
                    if (highEl && highHolderEl) {
                        const currentHigh = parseInt(highEl.textContent?.replace(/,/g, '') || '0');
                        if (score >= currentHigh) {
                            highEl.textContent = score.toLocaleString();
                            let holderText = `Held by: ${name}`;
                            if (location && location !== 'Unknown Sector') holderText += ` (${location})`;
                            highHolderEl.textContent = holderText;
                            (highHolderEl as HTMLElement).style.color = '#0f0';
                            highEl.classList.add('record-pulse');
                        }
                    }
                }
            });
    }

    private showNameEntryOverlay(defaultName: string, onSubmit: (name: string) => void) {
        const overlay = document.createElement('div');
        overlay.style.position = 'absolute';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.85)'; // Darker
        overlay.style.backdropFilter = 'blur(8px)';
        overlay.style.display = 'flex';
        overlay.style.flexDirection = 'column';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.zIndex = '100'; // Above level complete screen
        overlay.style.animation = 'fadeIn 0.3s ease-out';
        overlay.innerHTML = `
            <style>
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                .name-box {
                    background: rgba(10, 20, 30, 0.95);
                    border: 2px solid #0af;
                    border-radius: 12px;
                    padding: 30px 15px;
                    box-shadow: 0 0 30px rgba(0, 200, 255, 0.4), inset 0 0 20px rgba(0,0,0,0.5);
                    text-align: center;
                    width: 440px;
                    max-width: 95vw;
                    position: relative;
                    box-sizing: border-box;
                }
                .name-input-group {
                    display: flex;
                    justify-content: center;
                    gap: 6px;
                    margin: 20px 0;
                }
                .char-input {
                    background: rgba(0, 20, 40, 0.8);
                    border: 1px solid #00aaaa;
                    border-radius: 6px;
                    color: #fff;
                    font-family: 'Courier New', monospace;
                    font-size: 24px;
                    width: min(42px, 11vw);
                    height: 52px;
                    text-align: center;
                    text-transform: uppercase;
                    outline: none;
                    transition: all 0.2s;
                    box-shadow: inset 0 0 5px rgba(0, 255, 255, 0.1);
                }
                .char-input:focus {
                    border-color: #fff;
                    box-shadow: 0 0 15px rgba(0, 255, 255, 0.5), inset 0 0 5px rgba(0, 255, 255, 0.2);
                    transform: scale(1.1);
                    z-index: 10;
                }
                .submit-btn {
                    background: linear-gradient(180deg, #004444, #002222);
                    border: 1px solid #0ff;
                    color: #0ff;
                    padding: 12px 30px;
                    font-family: monospace;
                    font-size: 18px;
                    cursor: pointer;
                    margin-top: 15px;
                    text-transform: uppercase;
                    transition: all 0.2s;
                    border-radius: 4px;
                    letter-spacing: 2px;
                }
                .submit-btn:hover {
                    background: #006666;
                    box-shadow: 0 0 20px #0ff;
                    color: #fff;
                    transform: translateY(-2px);
                }
            </style>
            <div class="name-box">
                <h2 style="color: #0ff; font-family: monospace; margin: 0; text-shadow: 0 0 15px #0ff; letter-spacing: 2px; font-size: 28px;">NEW RECORD</h2>
                <div style="width: 100%; height: 1px; background: linear-gradient(90deg, transparent, #0af, transparent); margin: 15px 0;"></div>
                <p style="color: #ccc; font-family: monospace; font-size: 14px; margin: 0;">ENTER PILOT ID</p>
                
                <div class="name-input-group" id="char-inputs">
                    <!-- 7 inputs generated via JS -->
                </div>

                <div class="submit-btn" id="submit-name-btn">SUBMIT</div>
            </div>
        `;

        this.element.appendChild(overlay);

        // Generate input fields dynamically
        const container = overlay.querySelector('#char-inputs')!;
        const safeName = (defaultName || '').toUpperCase().substring(0, 7);

        for (let i = 0; i < 7; i++) {
            const input = document.createElement('input');
            input.type = 'text';
            input.maxLength = 1;
            input.className = 'char-input';
            input.dataset.index = i.toString();

            if (i < safeName.length) {
                input.value = safeName[i];
            }

            container.appendChild(input);

            // Auto-focus next logic
            input.addEventListener('input', (e) => {
                const val = (e.target as HTMLInputElement).value.toUpperCase();
                (e.target as HTMLInputElement).value = val;
                if (val && i < 6) {
                    const next = container.querySelector(`input[data-index="${i + 1}"]`) as HTMLInputElement;
                    next?.focus();
                }
            });

            // Backspace handling
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !(e.target as HTMLInputElement).value && i > 0) {
                    const prev = container.querySelector(`input[data-index="${i - 1}"]`) as HTMLInputElement;
                    prev?.focus();
                }
            });
        }

        // Focus first input
        setTimeout(() => {
            (container.querySelector('input') as HTMLInputElement).focus();
        }, 100);

        const submitFn = () => {
            let name = '';
            container.querySelectorAll('input').forEach(inp => name += inp.value);
            name = name.trim() || 'NONAME'; // Fallback

            // Animate out
            overlay.style.transition = 'opacity 0.3s';
            overlay.style.opacity = '0';
            setTimeout(() => overlay.remove(), 300);

            onSubmit(name);
        };

        const btn = overlay.querySelector('#submit-name-btn')!;
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent level complete click-through
            submitFn();
        });

        // Also submit on Enter key from last input
        overlay.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') submitFn();
        });
    }

    public hide() {
        this.isVisible = false;
        window.removeEventListener('keydown', this.handleKey);
        this.element.style.opacity = '0';
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        setTimeout(() => {
            this.element.style.display = 'none';
        }, 300);
    }
}
