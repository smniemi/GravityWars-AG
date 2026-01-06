#include <emscripten/emscripten.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>

#include "GameFunctions.h"
#include "config.h"
#include "memory.h"
#include "tutorial.h"

__attribute__((constructor)) static void wasm_init_defaults(void) {
  gamename[0] = '\0';
  gamenamelen = 0;
}

int *get_demo_buffer(void) { return (int *)demo; }

int get_demo_count(void) { return sizeof(demo) / (10 * sizeof(int)); }

void wasm_set_sa(int value) { sa = value; }

int frame_number = 0;

double getCurrentTimeInMillis(void) { return emscripten_get_now(); }

void play_sound(int sound) { (void)sound; }

void displayMessage(const char *message) { (void)message; }

FILE *iphone_fopen(const char *file, const char *type) {
  (void)type;
  char path[256];
  snprintf(path, sizeof(path), "/res/%s", file);
  return fopen(path, "rb");
}

void doPanic(void) {}

static int wasm_scans_buffer[64];

int *get_scans_buffer(void) { return wasm_scans_buffer; }

struct shipStateType *get_ship_state(void) { return &shipState; }

unsigned char *get_level_buffer(void) { return level; }

unsigned char *get_objects_buffer(void) { return objects; }

unsigned char *get_block_buffer(void) { return &block[0][0]; }

unsigned char *get_palette_buffer(void) { return pal; }

unsigned char *get_ship_buffer(void) { return &ship[0][0][0]; }

struct bullettype *get_bullets_buffer(void) { return bullet; }

struct actiontype *get_action_buffer(void) { return action; }

typedef struct {
  int32_t shipState;
  int32_t shipActive;
  int32_t shipThrust;
  float sx;
  float sy;
  int32_t shipFuel;
  float shipTime;
  int32_t shipLife;
  int32_t shipScore;
  int32_t numKeys;
  int32_t levelnum;
  int32_t sa;
  int32_t dynamicBlocksChangedFlag;
  int32_t gameOver;
} WasmGlobalState;

static WasmGlobalState wasmGlobals;

void *get_global_state(void) {
  wasmGlobals.shipState = shipState.state;
  wasmGlobals.shipActive = shipState.active;
  wasmGlobals.shipThrust = shipThrust;
  if (levelnum == 0) {
    wasmGlobals.sx = (float)(sx >> STEP);
    wasmGlobals.sy = (float)(sy >> STEP);
  } else {
    wasmGlobals.sx = (float)sx / (float)(1 << STEP);
    wasmGlobals.sy = (float)sy / (float)(1 << STEP);
  }
  wasmGlobals.shipFuel = ShipFuel;
  wasmGlobals.shipTime = ShipTime;
  wasmGlobals.shipLife = ShipLife;
  wasmGlobals.shipScore = ShipScore;
  wasmGlobals.numKeys = NumKeys;
  wasmGlobals.levelnum = levelnum;
  wasmGlobals.sa = sa;
  wasmGlobals.dynamicBlocksChangedFlag = dynamicBlocksChanged;
  wasmGlobals.gameOver = gameOver;
  return &wasmGlobals;
}

const char *get_current_level_name(void) {
  if (levelnum >= 0 && levelnum < 100) {
    return level_name[levelnum];
  }
  return "Unknown";
}

void wasm_set_thrust(int value) { shipThrust = value; }

void wasm_set_fire(int value) { shipIsFiring = value != 0; }

void wasm_add_score(int value) { ShipScore += value; }

void wasm_adjust_sa(int delta) {
  if (shipState.state == SHIP_STATE_LANDED) {
    return;
  }
  sa += delta;
  if (sa > 16383) {
    sa -= 16383;
  } else if (sa < 0) {
    sa += 16383;
  }
}

void wasm_clear_dynamic_blocks(void) { dynamicBlocksChanged = 0; }

extern void main_end(void);
extern void main_init(void);

// Score checkpoint for retries
static int lastLevelScore = 0;

void wasm_advance_level(void) {
  lastLevelScore = 0; // Checkpoint score is 0 for per-level scoring
  main_end();
  levelnum++;
  if (levelnum >= TOTAL_NUMBER_OF_LEVELS) {
    levelnum = 0;
  }
  gameOver = FALSE;
  shipThrust = 0;
  shipIsFiring = 0;
  main_init();
  shipState.state = SHIP_STATE_APPEARING;
  shipState.animationPhase = 5 << 2;
  dynamicBlocksChanged = 1;
}

void wasm_next_level(void) {
  lastLevelScore = 0; // Checkpoint score is 0 for per-level scoring
  main_end();
  levelnum++;
  if (levelnum >= TOTAL_NUMBER_OF_LEVELS) {
    levelnum = 0;
  }
  gameOver = FALSE;
  shipThrust = 0;
  shipIsFiring = 0;
  main_init();
  shipState.state = SHIP_STATE_APPEARING;
  shipState.animationPhase = 5 << 2;
  dynamicBlocksChanged = 1;
}

void wasm_prev_level(void) {
  main_end();
  levelnum--;
  if (levelnum < 0) {
    levelnum = TOTAL_NUMBER_OF_LEVELS - 1;
  }
  gameOver = FALSE;
  shipThrust = 0;
  shipIsFiring = 0;
  main_init();
  ShipScore = 0; // Reset score when manually skipping? Or confusing? Let's
                 // reset for now or keep 0.
  // Actually, prev/next level are cheats/debug. Resetting score is safer to
  // avoid confusion.
  lastLevelScore = 0;

  shipState.state = SHIP_STATE_APPEARING;
  shipState.animationPhase = 5 << 2;
  dynamicBlocksChanged = 1;
}

void wasm_restart_level(void) {
  int current_level = levelnum;
  main_end();
  levelnum = current_level;
  // Levelnum stays same
  gameOver = FALSE;
  shipThrust = 0;
  shipIsFiring = 0;

  // Reset physics-related state that initParams() would reset
  // These are NOT reset by main_init() but affect physics
  thrust_len = 0;
  waterMovementCount = 0;
  bulletLoadtime = 0;
  for (int n = 0; n <= N_BULLETS; n++) {
    bullet[n].active = FALSE;
  }

  main_init();

  // Restore score to what it was at start of level
  ShipScore = lastLevelScore;

  shipState.state = SHIP_STATE_APPEARING;
  shipState.animationPhase = 5 << 2;
  dynamicBlocksChanged = 1;
}

// Cheat mode (debug) - toggle with 'd' key
// Enables: no wall collisions, high fuel, high time
void wasm_toggle_cheat_mode(void) {
  trainer = !trainer;
  if (trainer) {
    // Set high fuel and time when enabling cheat mode
    ShipFuel = 999 << 4; // Max fuel (same as level 00 format)
    ShipTime = 999.0f;   // Max time
    BaseFuel = 999 << 4; // Prevent fuel from capping low
    BaseTime = 999.0f;   // Prevent time from capping low
  }
}

int wasm_get_cheat_mode(void) { return trainer; }
