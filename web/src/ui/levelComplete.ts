
import { supabase } from '../core/supabase.js';
import { trackLevelComplete } from '../core/gameStats.js';

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
                <!-- MISSION REPORT SECTION -->
                <div class="lc-panel stats-panel">
                    <div class="mobile-header">MISSION COMPLETE</div>
                    <h1 id="lc-level-name" class="galactic-text level-title">LEVEL X</h1>
                    
                    <div class="report-content">
                        <div class="total-score-box">
                            <div class="score-row main-score">
                                <div class="total-label">MISSION SCORE</div>
                                <div id="lc-score" class="total-value">0</div>
                            </div>
                            
                            <div class="divider"></div>
                            
                            <div class="score-row sub-score">
                                <div class="sub-label">PERSONAL BEST</div>
                                <div id="lc-pb" class="sub-value">0</div>
                            </div>
                            
                            <div class="score-row sub-score">
                                <div class="sub-label">GALACTIC HIGH SCORE</div>
                                <div id="lc-high" class="sub-value">0</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- LEADERBOARD SECTION -->
                <div class="lc-panel records-panel">
                    <h2 class="galactic-text section-title leaderboard-header">SECTOR RANKINGS</h2>
                    <div id="lc-leaderboard" class="leaderboard-list">
                        <!-- Top scores will be injected here -->
                    </div>

                    <div class="continue-hint">
                        TAP ANYWHERE TO CONTINUE
                    </div>
                </div>
            </div>
                    




            <style>
                * { box-sizing: border-box; }
                .lc-container {
                    animation: slideUp 0.4s ease-out;
                    display: flex;
                    flex-direction: row;
                    flex-wrap: wrap;
                    gap: 30px;
                    align-items: stretch;
                    justify-content: center;
                    width: 100%;
                    max-width: 1200px;
                    max-height: 90vh;
                    overflow-y: auto;
                    padding: 20px;
                }
                @keyframes slideUp { from { transform: translateY(50px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                
                .lc-panel {
                    background: rgba(10, 20, 30, 0.9);
                    border: 2px solid rgba(0, 255, 255, 0.3);
                    border-radius: 16px;
                    padding: 30px;
                    width: 420px;
                    max-width: 100%;
                    box-shadow: 0 0 30px rgba(0,0,0,0.7);
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
                
                .mobile-header { display: none; }

                .leaderboard-list {
                    flex: 1;
                    overflow-y: auto;
                    margin-top: 10px;
                    max-height: 250px;
                    scrollbar-width: thin;
                    scrollbar-color: #0af transparent;
                }

                .record-row {
                    display: grid;
                    grid-template-columns: 40px 1fr 100px;
                    padding: 12px 0;
                    border-bottom: 1px solid rgba(0, 255, 255, 0.1);
                    align-items: center;
                    font-family: monospace;
                    font-size: 14px;
                    color: #fff;
                    transition: background 0.2s;
                }
                .record-row.is-player {
                    color: #0f0;
                    background: rgba(0, 255, 0, 0.05);
                    font-weight: bold;
                }
                .record-rank { color: #0af; opacity: 0.6; }
                .record-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding-right: 10px; }
                .record-score { text-align: right; font-weight: bold; }

                .score-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    width: 100%;
                    padding: 8px 0;
                }
                .divider {
                    height: 2px;
                    background: linear-gradient(90deg, transparent, rgba(0, 255, 255, 0.3), transparent);
                    margin: 15px 0;
                }
                .sub-label {
                    color: #889;
                    font-size: 14px;
                    font-family: monospace;
                    letter-spacing: 1px;
                }
                .sub-value {
                    color: #fff;
                    font-size: 18px;
                    font-family: monospace;
                    font-weight: bold;
                }
                .main-score {
                    flex-direction: column;
                    padding-bottom: 20px;
                }
                
                /* Mobile layout adjustment */
                @media (max-width: 800px) {
                     .lc-container {
                          flex-direction: column !important;
                          align-items: center;
                          gap: 0;
                          padding: 0;
                          transform: none;
                          max-height: 100vh;
                          width: 100%;
                          margin: 0;
                          overflow-y: auto;
                          overflow-x: hidden;
                          background: #05060a;
                     }
                     .lc-panel {
                          width: 100%;
                          max-width: none;
                          padding: 30px 20px;
                          border-radius: 0;
                          border: none;
                          border-bottom: 2px solid rgba(0, 255, 255, 0.1);
                          box-shadow: none;
                          background: transparent;
                     }
                     .stats-panel {
                          background: linear-gradient(180deg, #0a1420 0%, #05060a 100%);
                          padding-top: 60px;
                     }
                     .records-panel {
                          background: #05060a;
                          padding-bottom: 150px; /* Space for the hint */
                     }
                     .mobile-header {
                          display: block;
                          color: #0ff;
                          font-size: 14px;
                          letter-spacing: 5px;
                          text-align: center;
                          margin-bottom: 10px;
                          font-family: 'Galactic', sans-serif;
                          opacity: 0.8;
                     }
                     .level-title {
                          font-size: 42px;
                          margin-bottom: 40px;
                          width: 100%;
                          text-align: center;
                          border-bottom: 2px solid #0ff;
                          padding-bottom: 15px;
                     }
                     .score-grid {
                          gap: 20px;
                          margin-bottom: 40px;
                     }
                     .score-label { font-size: 16px; }
                     .score-value { font-size: 24px; }
                     .total-score-box {
                          padding: 30px 20px;
                          border-width: 2px;
                          background: rgba(0, 255, 255, 0.05);
                     }
                     .total-label { font-size: 18px; }
                     .total-value { font-size: 64px; }
                     
                     .leaderboard-header {
                          font-size: 24px;
                          text-align: center;
                          margin-bottom: 20px;
                          color: #0ff;
                          border-bottom: 1px solid rgba(0, 255, 255, 0.2);
                          padding-bottom: 15px;
                     }
                     .leaderboard-list {
                          max-height: none;
                          overflow-y: visible;
                     }
                     .record-row {
                          font-size: 18px;
                          padding: 20px 0;
                          grid-template-columns: 50px 1fr 120px;
                     }
                     .continue-hint {
                          position: fixed;
                          bottom: 0;
                          left: 0;
                          width: 100%;
                          background: rgba(0, 10, 20, 0.9);
                          backdrop-filter: blur(10px);
                          border-top: 1px solid #0af;
                          padding: 25px;
                          font-size: 20px !important;
                          z-index: 100;
                          margin: 0;
                     }
                }

                @media (max-height: 500px) and (orientation: landscape) {
                    .lc-container { padding-top: 20px; }
                    .stats-panel { padding-top: 20px; }
                    .continue-hint { padding: 15px; font-size: 16px !important; }
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

        // Track level completion for analytics
        trackLevelComplete(
            stats.levelIndex,
            levelTotalScore,
            stats.time,
            stats.fuel,
            stats.lives
        );

        // Local Storage Handling
        const storageKey = `gw_pb_level_${stats.levelIndex}`;
        const storedPbStr = localStorage.getItem(storageKey);
        const storedPb = storedPbStr ? parseInt(storedPbStr, 10) : 0;

        const isNewRecord = levelTotalScore > storedPb;
        const previousBest = storedPb;




        // --- Fetch and Display Global Records ---
        const leaderboardEl = this.element.querySelector('#lc-leaderboard');
        if (leaderboardEl) {
            leaderboardEl.innerHTML = '<div style="color: #666; font-family: monospace; text-align: center; padding: 20px;">FETCHING SECTOR RECORDS...</div>';

            supabase.from('level_high_scores')
                .select('score, player_name, location')
                .eq('level_id', stats.levelIndex)
                .order('score', { ascending: false })
                .limit(10)
                .then(({ data, error }) => {
                    if (this.ignoreGlobalFetch) return;
                    if (leaderboardEl) {
                        if (error || !data || data.length === 0) {
                            leaderboardEl.innerHTML = '<div style="color: #666; font-family: monospace; text-align: center; padding: 20px;">NO RECORDS IN THIS SECTOR</div>';
                        } else {
                            leaderboardEl.innerHTML = '';
                            data.forEach((entry, idx) => {
                                const row = document.createElement('div');
                                const isPlayer = entry.player_name === localStorage.getItem('gw_player_name');
                                row.className = `record-row ${isPlayer ? 'is-player' : ''}`;

                                row.innerHTML = `
                                    <div class="record-rank">#${idx + 1}</div>
                                    <div class="record-name">${entry.player_name || 'UNKNOWN PILOT'}</div>
                                    <div class="record-score">${entry.score.toLocaleString()}</div>
                                `;
                                leaderboardEl.appendChild(row);
                            });

                            // Also update the single Sector Record box if we found a top score
                            if (data.length > 0) {
                                const topScore = data[0].score;
                                const highEl = this.element.querySelector('#lc-high');
                                if (highEl) {
                                    highEl.textContent = topScore > 0 ? topScore.toLocaleString() : '---';
                                }
                            }
                        }
                    }
                });
        }

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

                // On Mobile, skip the overlay and just submit as 'UNKNOWN' (or default name) to avoid keyboard issues
                const isMobile = window.innerWidth <= 800; // Matches CSS breakpoint

                if (isMobile) {
                    console.log('[LevelComplete] Mobile detected, skipping name entry overlay.');
                    if (!playerName) playerName = 'UNKNOWN';
                    this.submitScore(userId!, playerName, stats.levelIndex, levelTotalScore);
                } else {
                    // Show custom overlay for name entry on Desktop
                    this.showNameEntryOverlay(playerName, (name) => {
                        localStorage.setItem('gw_player_name', name);
                        this.submitScore(userId!, name, stats.levelIndex, levelTotalScore);
                    });
                }

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
        const storedHigh = previousBest;

        // Initial UI State (Before Animation)
        const pbEl = this.element.querySelector('#lc-pb');
        const highEl = this.element.querySelector('#lc-high');
        const scoreEl = this.element.querySelector('#lc-score');

        if (pbEl) pbEl.textContent = previousBest > 0 ? previousBest.toLocaleString() : '---';

        // Wait for global high score fetch, but start with PB as fallback
        if (highEl) highEl.textContent = storedHigh > 0 ? storedHigh.toLocaleString() : '---';

        if (scoreEl) scoreEl.textContent = displayedBaseScore.toLocaleString();

        console.log('[LevelComplete] Starting animation:', {
            currentScore: stats.currentScore,
            totalBonus,
            finalScore: levelTotalScore,
            previousBest,
            isNewRecord
        });

        const duration = 2000;
        let startTime: number | null = null;
        let pbAnimationTriggered = false;

        const animate = (now: number) => {
            if (!this.isVisible) return;

            if (startTime === null) startTime = now;
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1.0);

            const ease = 1 - Math.pow(1 - progress, 3);
            const currentAdd = Math.floor(totalBonus * ease);
            const currentDisplayedScore = displayedBaseScore + currentAdd;

            if (scoreEl) scoreEl.textContent = currentDisplayedScore.toLocaleString();

            if (progress >= 1.0 && !pbAnimationTriggered && isNewRecord) {
                pbAnimationTriggered = true;
                this.animateRecordUpdate(previousBest, levelTotalScore, pbEl, null);
                this.animateRecordUpdate(storedHigh, levelTotalScore, highEl, null);

                setTimeout(() => tryTriggerSubmission(), 1500);
            }

            if (progress < 1.0 || (isNewRecord && !pbAnimationDone)) {
                this.animationFrame = requestAnimationFrame(animate);
            }
        };

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
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.9)'; // Darker
        overlay.style.backdropFilter = 'blur(10px)';
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
                    background: rgba(10, 20, 30, 0.98);
                    border: 3px solid #0af;
                    border-radius: 20px;
                    padding: 40px 30px;
                    box-shadow: 0 0 50px rgba(0, 200, 255, 0.6), inset 0 0 30px rgba(0,0,0,0.8);
                    text-align: center;
                    width: min(500px, 95vw);
                    position: relative;
                    box-sizing: border-box;
                    animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }
                @keyframes popIn { 
                    0% { transform: scale(0.8); opacity: 0; } 
                    100% { transform: scale(1); opacity: 1; } 
                }
                .name-input-wrapper {
                    position: relative;
                    margin: 30px 0;
                    display: flex;
                    justify-content: center;
                }
                .char-input-field {
                    background: rgba(0, 40, 80, 0.5);
                    border: 2px solid #0ff;
                    border-radius: 8px;
                    color: #fff;
                    font-family: 'Courier New', monospace;
                    font-size: 42px;
                    width: 100%;
                    max-width: 380px;
                    height: 80px;
                    text-align: center;
                    text-transform: uppercase;
                    outline: none;
                    letter-spacing: 0.2em;
                    padding-left: 0.2em; /* Offset for letter spacing */
                    transition: all 0.3s;
                    box-shadow: inset 0 0 15px rgba(0, 255, 255, 0.2);
                }
                .char-input-field:focus {
                    border-color: #fff;
                    box-shadow: 0 0 30px rgba(0, 255, 255, 0.8), inset 0 0 15px rgba(0, 255, 255, 0.3);
                    background: rgba(0, 60, 120, 0.6);
                }
                .submit-btn {
                    background: linear-gradient(180deg, #008888, #004444);
                    border: 2px solid #0ff;
                    color: #fff;
                    padding: 20px 0;
                    width: 100%;
                    font-family: 'Galactic', monospace;
                    font-size: 28px;
                    cursor: pointer;
                    margin-top: 20px;
                    text-transform: uppercase;
                    transition: all 0.2s;
                    border-radius: 10px;
                    letter-spacing: 4px;
                    text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
                }
                .submit-btn:active {
                    transform: scale(0.98);
                    filter: brightness(1.2);
                }
            </style>
            <div class="name-box">
                <h2 style="color: #0ff; margin: 0; text-shadow: 0 0 15px #0ff; letter-spacing: 4px; font-size: 36px; font-family: 'Galactic', sans-serif;">NEW RECORD</h2>
                <div style="width: 100%; height: 2px; background: linear-gradient(90deg, transparent, #0af, transparent); margin: 20px 0;"></div>
                <p style="color: #0af; font-family: monospace; font-size: 16px; margin: 0; font-weight: bold; letter-spacing: 2px;">ENTER PILOT ID</p>
                
                <div class="name-input-wrapper">
                    <input type="text" maxlength="7" class="char-input-field" id="pilot-name-input" 
                           spellcheck="false" autocomplete="off" placeholder="_______">
                </div>

                <div class="submit-btn" id="submit-name-btn">REGISTER SCORE</div>
                <p style="color: #666; font-size: 12px; margin-top: 15px; font-family: monospace;">TAP INPUT TO OPEN KEYBOARD</p>
            </div>
        `;

        this.element.appendChild(overlay);

        const input = overlay.querySelector('#pilot-name-input') as HTMLInputElement;
        const submitBtn = overlay.querySelector('#submit-name-btn') as HTMLElement;

        if (defaultName) {
            input.value = defaultName.toUpperCase().substring(0, 7);
        }

        // Prevent click-through when tapping input
        input.addEventListener('click', (e) => e.stopPropagation());
        input.addEventListener('touchstart', (e) => e.stopPropagation());

        input.addEventListener('input', () => {
            input.value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        });

        // Focus and trigger keyboard
        setTimeout(() => {
            input.focus();
            input.click(); // Nudge for mobile
        }, 300);

        const submitFn = () => {
            const name = input.value.trim() || 'PILOT_X';

            // Animate out
            overlay.style.transition = 'opacity 0.3s';
            overlay.style.opacity = '0';
            setTimeout(() => overlay.remove(), 300);

            onSubmit(name);
        };

        submitBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            submitFn();
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                submitFn();
            }
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
