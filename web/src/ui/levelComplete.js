import { supabase } from '../core/supabase.js';
import { trackLevelComplete } from '../core/gameStats.js';
export class LevelCompleteScreen {
    element;
    isVisible = false;
    animationFrame = null;
    onContinue = () => { };
    pendingSubmissionAction = null;
    ignoreGlobalFetch = false;
    globalRecordScore = Number.MAX_SAFE_INTEGER;
    constructor(container, onContinueCallback) {
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
                                <div id="lc-high" class="sub-value">---</div>
                            </div>
                        </div>
                    </div>

                    <div class="continue-hint">
                        TAP ANYWHERE TO CONTINUE
                    </div>
                </div>

                <!-- CELEBRATION OVERLAYS -->
                <div id="pb-anim" class="celebration-text">NEW PERSONAL BEST!</div>
                <div id="galactic-anim" class="celebration-text galactic">GALACTIC RECORD!</div>
                
                <div id="lc-high-holder" class="score-holder"></div>
            </div>
                    




            <style>
                * { box-sizing: border-box; }
                .lc-container {
                    animation: slideUp 0.4s ease-out;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    width: 100%;
                    height: 100%;
                    overflow: hidden;
                    position: relative;
                }
                @keyframes slideUp { from { transform: translateY(50px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                
                .lc-panel {
                    background: rgba(10, 20, 30, 0.9);
                    border: 2px solid rgba(0, 255, 255, 0.3);
                    border-radius: 16px;
                    padding: 30px;
                    width: 420px;
                    max-width: 90%;
                    box-shadow: 0 0 30px rgba(0,0,0,0.7);
                    display: flex;
                    flex-direction: column;
                    position: relative;
                    z-index: 2; /* Below celebrations */
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
                    text-align: center;
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

                /* Celebration Stlyes */
                .celebration-text {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%) scale(0.1);
                    font-family: 'Galactic', sans-serif;
                    font-size: 3rem;
                    color: #0f0;
                    text-shadow: 0 0 20px #0f0;
                    pointer-events: none;
                    opacity: 0;
                    white-space: nowrap;
                    z-index: 100;
                    width: 100%;
                    text-align: center;
                }
                
                .celebration-text.galactic {
                    color: #0ff;
                    text-shadow: 0 0 30px #0ff;
                    font-size: 4rem;
                }

                @keyframes zoomOutEnter {
                    0% { transform: translate(-50%, -50%) scale(5); opacity: 0; }
                    20% { opacity: 1; }
                    100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                }

                .celebration-enter {
                    animation: zoomOutEnter 0.8s cubic-bezier(0.19, 1, 0.22, 1) forwards;
                }
                
                .score-holder {
                    position: absolute;
                    bottom: 85px; /* Above continue hint */
                    width: 100%;
                    text-align: center;
                    color: #889;
                    font-size: 12px;
                    font-family: monospace;
                    opacity: 0.8;
                    letter-spacing: 1px;
                }
                
                
                /* Mobile layout adjustment */
                @media (max-width: 800px) {
                     .lc-container {
                          padding: 0;
                          background: rgba(0,0,0,0.8);
                     }
                     .lc-panel {
                          width: 100%;
                          height: 100%;
                          max-width: none;
                          padding: 30px 20px;
                          border-radius: 0;
                          border: none;
                          background: transparent;
                          justify-content: center;
                     }
                     .stats-panel {
                          padding-top: 60px;
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
                          pointer-events: none;
                     }
                     .celebration-text {
                        font-size: 2.5rem;
                     }
                     .celebration-text.galactic {
                        font-size: 3rem;
                     }
                }

                @media (max-height: 500px) and (orientation: landscape) {
                    .lc-container { padding-top: 0; }
                    .stats-panel { padding-top: 10px; justify-content: flex-start; overflow-y: auto; }
                    .level-title { font-size: 24px; margin-bottom: 10px; }
                    .total-value { font-size: 40px; }
                    .celebration-text { font-size: 2rem; }
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
    setOnContinue(callback) {
        this.onContinue = callback;
    }
    handleInput() {
        console.log('[LevelComplete] handleInput called, isVisible:', this.isVisible);
        if (this.isVisible) {
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
    handleKey = (e) => {
        if (!this.isVisible)
            return;
        if (e.code === 'Space' || e.code === 'Enter' || e.key === ' ' || e.key === 'Enter') {
            this.handleInput();
        }
    };
    show(stats) {
        this.isVisible = true;
        this.ignoreGlobalFetch = false; // Reset on each show
        this.element.style.display = 'flex';
        // Trigger reflow
        void this.element.offsetWidth;
        this.element.style.opacity = '1';
        window.addEventListener('keydown', this.handleKey);
        const nameEl = this.element.querySelector('#lc-level-name');
        if (nameEl)
            nameEl.textContent = stats.levelName;
        const livesBonus = Math.floor(stats.lives * 1000);
        const timeBonus = Math.floor(stats.time * 5);
        const fuelBonus = Math.floor(stats.fuel * 2);
        const displayedBaseScore = Math.floor(stats.currentScore * 10);
        const totalBonus = livesBonus + timeBonus + fuelBonus;
        // Level Score = (Points collected * 10) + Lives Bonus + Time Bonus + Fuel Bonus
        const levelTotalScore = displayedBaseScore + totalBonus;
        // Track level completion for analytics
        trackLevelComplete(stats.levelIndex, levelTotalScore, stats.time, stats.fuel, stats.lives);
        // Local Storage Handling
        const storageKey = `gw_pb_level_${stats.levelIndex}`;
        const storedPbStr = localStorage.getItem(storageKey);
        const storedPb = storedPbStr ? parseInt(storedPbStr, 10) : 0;
        const isNewRecord = levelTotalScore > storedPb;
        const previousBest = storedPb;
        // --- Fetch and Display Global Records ---
        // We still fetch to check for Galactic High Score
        this.globalRecordScore = Number.MAX_SAFE_INTEGER;
        const highEl = this.element.querySelector('#lc-high');
        supabase.from('level_high_scores')
            .select('score, player_name')
            .eq('level_id', stats.levelIndex)
            .order('score', { ascending: false })
            .limit(1)
            .then(({ data, error }) => {
            if (this.ignoreGlobalFetch)
                return;
            if (!error && data && data.length > 0) {
                this.globalRecordScore = data[0].score;
                if (highEl) {
                    highEl.textContent = this.globalRecordScore.toLocaleString();
                }
            }
            else if (!error && data && data.length === 0) {
                // No records yet means 0 is the record to beat
                this.globalRecordScore = 0;
                if (highEl)
                    highEl.textContent = "0";
                const holderEl = this.element.querySelector('#lc-high-holder');
                if (holderEl)
                    holderEl.textContent = "No Record Yet";
            }
            // --- Self-Healing Sync ---
            // If we have a local PB that is HIGHER than the global record (and we didn't just set a new record),
            // it means our previous record submission failed. We should re-submit it now.
            // We only do this if !isNewRecord, because if it IS a new record, the submit logic loop will handle it (with the higher score).
            if (!isNewRecord && storedPb > this.globalRecordScore) {
                console.log(`[LevelComplete] Local PB (${storedPb}) > Global (${this.globalRecordScore}). Resyncing missing score...`);
                // Helper to get identity
                let u = localStorage.getItem('gw_anon_user_id');
                if (!u) {
                    u = `anon_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
                    localStorage.setItem('gw_anon_user_id', u);
                }
                let p = localStorage.getItem('gw_player_name');
                if (!p) {
                    p = `PILOT_${Math.floor(Math.random() * 9000) + 1000}`;
                    localStorage.setItem('gw_player_name', p);
                }
                this.submitScore(u, p, stats.levelIndex, storedPb);
            }
        });
        // Update stored record logic
        console.log(`[LevelComplete] Check New Record: Score ${levelTotalScore} > Old PB ${storedPb} ? ${isNewRecord}`);
        // --- Submit Logic (Wait for Animation) ---
        // We delay the submission prompt until the score counting animation finishes
        let submissionTriggered = false;
        const tryTriggerSubmission = () => {
            if (submissionTriggered)
                return;
            if (!isNewRecord)
                return;
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
                // 2. Default Name Submission (No overlay)
                let playerName = localStorage.getItem('gw_player_name');
                if (!playerName) {
                    playerName = `PILOT_${Math.floor(Math.random() * 9000) + 1000}`; // Default Random ID
                    localStorage.setItem('gw_player_name', playerName);
                }
                console.log('[LevelComplete] Auto-submitting score with name:', playerName);
                this.submitScore(userId, playerName, stats.levelIndex, levelTotalScore);
            })();
        };
        if (isNewRecord) {
            this.element.dataset.isNewRecord = 'true';
            localStorage.setItem(storageKey, levelTotalScore.toString());
            // Register this action so handleInput can trigger it if user clicks early
            // Always trigger submission flow on new record, enabling name entry even if name exists
            this.pendingSubmissionAction = tryTriggerSubmission;
        }
        else {
            this.element.dataset.isNewRecord = 'false';
            this.pendingSubmissionAction = null;
        }
        // --- Mock High Score Logic ---
        // Initial UI State (Before Animation)
        const pbEl = this.element.querySelector('#lc-pb');
        const scoreEl = this.element.querySelector('#lc-score');
        // Hide celebration texts initially
        const pbAnim = this.element.querySelector('#pb-anim');
        const galAnim = this.element.querySelector('#galactic-anim');
        if (pbAnim)
            pbAnim.classList.remove('celebration-enter');
        if (galAnim)
            galAnim.classList.remove('celebration-enter');
        if (pbEl)
            pbEl.textContent = previousBest > 0 ? previousBest.toLocaleString() : '---';
        if (highEl)
            highEl.textContent = 'FETCHING...';
        const highHolderEl = this.element.querySelector('#lc-high-holder');
        if (highHolderEl)
            highHolderEl.textContent = '';
        if (scoreEl)
            scoreEl.textContent = displayedBaseScore.toLocaleString();
        console.log('[LevelComplete] Starting animation:', {
            currentScore: stats.currentScore,
            totalBonus,
            finalScore: levelTotalScore,
            previousBest,
            isNewRecord
        });
        const duration = 2000;
        let startTime = null;
        let pbAnimationTriggered = false;
        const animate = (now) => {
            if (!this.isVisible)
                return;
            if (startTime === null)
                startTime = now;
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1.0);
            const ease = 1 - Math.pow(1 - progress, 3);
            const currentAdd = Math.floor(totalBonus * ease);
            const currentDisplayedScore = displayedBaseScore + currentAdd;
            if (scoreEl)
                scoreEl.textContent = currentDisplayedScore.toLocaleString();
            if (progress >= 1.0 && !pbAnimationTriggered && isNewRecord) {
                pbAnimationTriggered = true;
                this.animateRecordUpdate(previousBest, levelTotalScore, pbEl, null);
                // Only update High Score UI if we know we beat it (optimistic or fetched)
                // Note: The celebration animation also triggers here
                if (levelTotalScore > this.globalRecordScore) {
                    // Galactic Record!
                    if (galAnim) {
                        const sound = new Audio('assets/sfx/powerup.mp3'); // Reuse existing sfx if available, otherwise silent
                        sound.volume = 0.5;
                        sound.play().catch(() => { });
                        galAnim.classList.add('celebration-enter');
                    }
                }
                else {
                    // Just PB
                    if (pbAnim)
                        pbAnim.classList.add('celebration-enter');
                }
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
                let playerName = localStorage.getItem('gw_player_name');
                if (!playerName) {
                    playerName = `PILOT_${Math.floor(Math.random() * 9000) + 1000}`;
                    localStorage.setItem('gw_player_name', playerName);
                }
                const uid = localStorage.getItem('gw_anon_user_id') || `anon_${Date.now()}`;
                if (!localStorage.getItem('gw_anon_user_id'))
                    localStorage.setItem('gw_anon_user_id', uid);
                this.submitScore(uid, playerName, stats.levelIndex, levelTotalScore);
            });
        }
        // Reset animation frame
        if (this.animationFrame)
            cancelAnimationFrame(this.animationFrame);
        this.animationFrame = requestAnimationFrame(animate);
    }
    animateRecordUpdate(startValue, endValue, element, labelElement) {
        if (!element)
            return;
        // Delay slightly for effect
        setTimeout(() => {
            if (!this.isVisible)
                return;
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
            const animatePb = (now) => {
                if (!this.isVisible)
                    return;
                const elapsed = now - startTime;
                const progress = Math.min(elapsed / duration, 1.0);
                const ease = 1 - Math.pow(1 - progress, 3);
                const val = Math.floor(startValue + (endValue - startValue) * ease);
                element.textContent = val.toLocaleString();
                if (progress < 1.0) {
                    requestAnimationFrame(animatePb);
                }
                else {
                    element.textContent = endValue.toLocaleString();
                }
            };
            requestAnimationFrame(animatePb);
        }, 500); // 0.5s delay after main score finishes
    }
    async submitScore(uid, name, lvl, score) {
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
            }
            catch (e) {
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
            if (error)
                console.error('[Supabase] Sync failed:', error);
            else {
                console.log('[Supabase] Sync success!');
                // Visual feedback
                const btn = this.element.querySelector('#lc-force-submit');
                if (btn) {
                    btn.textContent = "SCORE REGISTERED";
                    btn.style.color = '#0f0';
                    btn.style.borderColor = '#0f0';
                }
                // Update High Score Display if we beat it
                const highEl = this.element.querySelector('#lc-high');
                const highHolderEl = this.element.querySelector('#lc-high-holder');
                if (highEl && highHolderEl) {
                    const currentHigh = parseInt(highEl.textContent?.replace(/,/g, '') || '0');
                    if (score >= currentHigh) {
                        highEl.textContent = score.toLocaleString();
                        highEl.classList.add('record-pulse');
                    }
                }
            }
        });
    }
    hide() {
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
