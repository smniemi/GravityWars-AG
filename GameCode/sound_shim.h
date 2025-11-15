#ifndef SOUND_SHIM_H
#define SOUND_SHIM_H

#include <stdint.h>

static inline void SoundEngine_StartEffect(uint32_t effectId) {
  (void)effectId;
}

static inline void SoundEngine_StopEffect(uint32_t effectId, int doDecay) {
  (void)effectId;
  (void)doDecay;
}

static inline void SoundEngine_LoadBackgroundMusicTrack(const char* path, int addToQueue, int loadAtOnce) {
  (void)path;
  (void)addToQueue;
  (void)loadAtOnce;
}

static inline void SoundEngine_UnloadBackgroundMusicTrack(void) {}
static inline void SoundEngine_StartBackgroundMusic(void) {}

static inline void SoundEngine_StopBackgroundMusic(int stopAtEnd) {
  (void)stopAtEnd;
}

static inline void SoundEngine_SetBackgroundMusicVolume(float volume) {
  (void)volume;
}

static inline void SoundEngine_SetEffectsVolume(float volume) {
  (void)volume;
}

static inline void SoundEngine_SetListenerGain(float gain) {
  (void)gain;
}

#endif /* SOUND_SHIM_H */

