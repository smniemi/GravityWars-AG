import { supabase } from './supabase';
export async function runSupabaseTest() {
    console.log('%c--- Starting Supabase Connectivity Test ---', 'color: #00ff00; font-weight: bold;');
    // 1. Check connection by reading ANY data from the table
    // This verifies URL, Key, and Table existence
    const { data: readData, error: readError } = await supabase
        .from('level_high_scores')
        .select('*')
        .limit(1);
    if (readError) {
        console.error('%cTest Step 1 Failed: API Error', 'color: red', readError);
        console.warn('Check: 1. Did you run the SQL script? 2. Are .env keys correct?');
        return;
    }
    console.log('%cTest Step 1 Passed: Read connection successful', 'color: #00ff00', readData);
    // 2. Try to write (Upsert) a score
    // We use a fake user ID just for this test
    const testUserId = 'test-user-debug-001';
    const testLevel = 99;
    const testScore = Math.floor(Math.random() * 5000) + 1000;
    console.log(`Attempting to Upsert: Level ${testLevel}, Score ${testScore}`);
    const { data: insertData, error: insertError } = await supabase
        .from('level_high_scores')
        .upsert({
        user_id: testUserId, // In real game, this will be uuid
        level_id: testLevel,
        score: testScore
    }, { onConflict: 'user_id, level_id' })
        .select();
    if (insertError) {
        console.error('%cTest Step 2 Failed: Write Error', 'color: red', insertError);
        console.warn('Check: Row Level Security (RLS) policies or Table Schema');
    }
    else {
        console.log('%cTest Step 2 Passed: Upsert successful', 'color: #00ff00', insertData);
        console.log('%c--- Test Complete: Database is ready ---', 'color: #00ff00; font-weight: bold;');
    }
}
