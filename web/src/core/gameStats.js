/**
 * Game Statistics Tracking Module
 *
 * Tracks game events and sends them to Supabase for analytics.
 * Each event is stored as a new row for later SQL aggregation.
 */
import { supabase } from './supabase';
const STORAGE_KEY = 'gravitywars_player_id';
/**
 * Generate a UUID-like string that works in all browsers
 */
function generateUUID() {
    // Use crypto.randomUUID if available (secure context only)
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    // Fallback for older browsers or non-secure contexts
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
/**
 * Get or create a persistent player ID.
 * This generates a UUID-like ID stored in localStorage.
 */
export function getPlayerId() {
    let playerId = localStorage.getItem(STORAGE_KEY);
    if (!playerId) {
        // Generate a simple UUID-like ID
        playerId = 'gw-' + generateUUID();
        localStorage.setItem(STORAGE_KEY, playerId);
        console.log('[GameStats] New player ID created:', playerId);
    }
    return playerId;
}
/**
 * Track a game start event (when player starts from menu)
 */
export async function trackGameStart() {
    const playerId = getPlayerId();
    const { error } = await supabase.from('game_stats').insert({
        player_id: playerId,
        event_type: 'game_start',
    });
    if (error) {
        console.error('[GameStats] Failed to track game_start:', error);
    }
    else {
        console.log('[GameStats] Tracked: game_start');
    }
}
/**
 * Track when a level is started
 */
export async function trackLevelStart(levelId) {
    const playerId = getPlayerId();
    const { error } = await supabase.from('game_stats').insert({
        player_id: playerId,
        event_type: 'level_start',
        level_id: levelId,
    });
    if (error) {
        console.error('[GameStats] Failed to track level_start:', error);
    }
    else {
        console.log(`[GameStats] Tracked: level_start (level ${levelId})`);
    }
}
/**
 * Track when a level is completed
 */
export async function trackLevelComplete(levelId, score, timeRemaining, fuelRemaining, livesRemaining) {
    const playerId = getPlayerId();
    const { error } = await supabase.from('game_stats').insert({
        player_id: playerId,
        event_type: 'level_complete',
        level_id: levelId,
        score: score,
        time_remaining: Math.floor(timeRemaining),
        fuel_remaining: Math.floor(fuelRemaining),
        lives_remaining: livesRemaining,
    });
    if (error) {
        console.error('[GameStats] Failed to track level_complete:', error);
    }
    else {
        console.log(`[GameStats] Tracked: level_complete (level ${levelId}, score ${score})`);
    }
}
