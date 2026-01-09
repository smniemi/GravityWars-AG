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
function generateUUID(): string {
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
export function getPlayerId(): string {
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
 * Get player's location (Country/City) via IP API.
 * Caches result in localStorage to minimize API calls.
 */
export async function getPlayerLocation(): Promise<string | null> {
    let location = localStorage.getItem('gw_player_location');

    // If we have a valid cached location, return it
    if (location && location !== 'Unknown Sector') {
        return location;
    }

    try {
        const res = await fetch('https://ipapi.co/json/');
        if (res.ok) {
            const data = await res.json();
            // Format: "London, United Kingdom"
            location = `${data.city}, ${data.country_name}`;
            localStorage.setItem('gw_player_location', location);
            return location;
        }
    } catch (e) {
        console.warn('[GameStats] Location fetch failed', e);
    }

    return null;
}

/**
 * Event types that can be tracked
 */
export type GameEventType = 'game_start' | 'level_start' | 'level_complete';

/**
 * Track a game start event (when player starts from menu)
 */
export async function trackGameStart(): Promise<void> {
    const playerId = getPlayerId();
    const location = await getPlayerLocation();

    const { error } = await supabase.from('game_stats').insert({
        player_id: playerId,
        event_type: 'game_start' as GameEventType,
        location: location
    });

    if (error) {
        console.error('[GameStats] Failed to track game_start:', error);
    } else {
        console.log(`[GameStats] Tracked: game_start (Location: ${location || 'Unknown'})`);
    }
}

/**
 * Track when a level is started
 */
export async function trackLevelStart(levelId: number): Promise<void> {
    const playerId = getPlayerId();
    // We don't necessarily need location for every level start to save bandwidth, 
    // but it can be added if needed. For now keeping it lightweight.

    const { error } = await supabase.from('game_stats').insert({
        player_id: playerId,
        event_type: 'level_start' as GameEventType,
        level_id: levelId,
    });

    if (error) {
        console.error('[GameStats] Failed to track level_start:', error);
    } else {
        console.log(`[GameStats] Tracked: level_start (level ${levelId})`);
    }
}

/**
 * Track when a level is completed
 */
export async function trackLevelComplete(
    levelId: number,
    score: number,
    timeRemaining: number,
    fuelRemaining: number,
    livesRemaining: number
): Promise<void> {
    const playerId = getPlayerId();
    // Ideally we track location here too since it's a major event
    const location = await getPlayerLocation();

    const { error } = await supabase.from('game_stats').insert({
        player_id: playerId,
        event_type: 'level_complete' as GameEventType,
        level_id: levelId,
        score: score,
        time_remaining: Math.floor(timeRemaining),
        fuel_remaining: Math.floor(fuelRemaining),
        lives_remaining: livesRemaining,
        location: location
    });

    if (error) {
        console.error('[GameStats] Failed to track level_complete:', error);
    } else {
        console.log(`[GameStats] Tracked: level_complete (level ${levelId}, score ${score})`);
    }
}
