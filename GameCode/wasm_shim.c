#include <emscripten/emscripten.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>

#include "memory.h"
#include "GameFunctions.h"
#include "config.h"

__attribute__((constructor)) static void wasm_init_defaults(void) {
  gamename[0] = '\0';
  gamenamelen = 0;
}

int frame_number = 0;

double getCurrentTimeInMillis(void) {
  return emscripten_get_now();
}

void play_sound(int sound) {
  (void)sound;
}

void displayMessage(const char* message) {
  (void)message;
}

FILE* iphone_fopen(const char* file, const char* type) {
  (void)type;
  char path[256];
  snprintf(path, sizeof(path), "/res/%s", file);
  return fopen(path, "rb");
}

void doPanic(void) {}

static int wasm_scans_buffer[64];

int* get_scans_buffer(void) {
  return wasm_scans_buffer;
}

struct shipStateType* get_ship_state(void) {
  return &shipState;
}

unsigned char* get_level_buffer(void) {
  return level;
}

unsigned char* get_objects_buffer(void) {
  return objects;
}

unsigned char* get_block_buffer(void) {
  return &block[0][0];
}

unsigned char* get_palette_buffer(void) {
  return pal;
}

unsigned char* get_ship_buffer(void) {
  return &ship[0][0][0];
}

struct bullettype* get_bullets_buffer(void) {
  return bullet;
}

typedef struct {
  int32_t shipState;
  int32_t shipActive;
  int32_t shipThrust;
  int32_t sx;
  int32_t sy;
  int32_t shipFuel;
  float shipTime;
  int32_t shipLife;
  int32_t shipScore;
  int32_t numKeys;
  int32_t levelnum;
  int32_t sa;
  int32_t dynamicBlocksChangedFlag;
} WasmGlobalState;

static WasmGlobalState wasmGlobals;

void* get_global_state(void) {
  wasmGlobals.shipState = shipState.state;
  wasmGlobals.shipActive = shipState.active;
  wasmGlobals.shipThrust = shipThrust;
  wasmGlobals.sx = sx >> STEP;
  wasmGlobals.sy = sy >> STEP;
  wasmGlobals.shipFuel = ShipFuel;
  wasmGlobals.shipTime = ShipTime;
  wasmGlobals.shipLife = ShipLife;
  wasmGlobals.shipScore = ShipScore;
  wasmGlobals.numKeys = NumKeys;
  wasmGlobals.levelnum = levelnum;
  wasmGlobals.sa = sa;
  wasmGlobals.dynamicBlocksChangedFlag = dynamicBlocksChanged;
  return &wasmGlobals;
}

void wasm_set_thrust(int value) {
  shipThrust = value;
}

void wasm_set_fire(int value) {
  shipIsFiring = value != 0;
}

void wasm_adjust_sa(int delta) {
  sa += delta;
  if (sa > 16383) {
    sa -= 16383;
  } else if (sa < 0) {
    sa += 16383;
  }
}

void wasm_clear_dynamic_blocks(void) {
  dynamicBlocksChanged = 0;
}

extern void main_end(void);
extern void main_init(void);

void wasm_advance_level(void) {
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

