/* GravityWars 1.1,  (C) Sami Niemi -95 */

#include "GameDefines.h"
#include "GameFunctions.h"
#include "memory.h"

#include "blocks.h"
#include "hole.h"
#include "macros.h"
#include "moveship.h"

#ifdef __EMSCRIPTEN__
#include "sound_shim.h"
#else
#include "SoundEngine.h"
#endif

#include <math.h>
#include <unistd.h>

extern int frame_number;

void control() {

  static short n, m, angle;
  static long x, y, tmp;
  static uchar *bul_adr;
  static int bul_col;
  static int objadr;

  if ((shipIsFiring) && (bulletLoadtime == 0) &&
      (shipState.state == SHIP_STATE_LANDED ||
       shipState.state == SHIP_STATE_FLYING) &&
      (!shipFlagInWater)) {

    shipIsFiring = FALSE; // reset fire button

    SoundEngine_StartEffect(sounds[kSound_Shoot]);

    float bax, bay;
    if (levelnum == 0) {
      bax = angX[sa >> 9];
      bay = angY[sa >> 9];
    } else {
      float theta = ((float)sa / 16384.0f) * 6.283185307f;
      bax = (float)ACCEL * cosf(theta + 1.570796327f);
      bay = -(float)ACCEL * sinf(theta + 1.570796327f);
    }

    for (n = 0; n <= N_BULLETS; n++) { /* Shoots if there are free bullets */

      if (!bullet[n].active) {
        bullet[n].active = TRUE;
        bullet[n].ang = sa >> 9;
        bullet[n].dis = 16;
        bullet[n].xs = (int)(bax * 96.0f) + sVx;
        bullet[n].ys = (int)(bay * 96.0f) + sVy + sVg;
        bullet[n].x = sx + 16384 + (int)(bax * 384.0f);
        bullet[n].y = sy + 16384 + (int)(bay * 384.0f);

        bulletLoadtime = 16;
        break;
      }
    }
  }

  // if thust is on, and enough fuel
  if ((shipThrust > 0) && (ShipFuel > 0)) { /* Up */

    ShipFuel--;

    if (ShipFuel == 0) {
      displayMessage(SHIP_MESSAGE_OUT_OF_FUEL);
      play_sound(kSound_StopThrust);
    }

    float ax, ay;
    if (levelnum == 0) {
      ax = angX[sa >> 9];
      ay = angY[sa >> 9];
    } else {
      float theta = ((float)sa / 16384.0f) * 6.283185307f;
      ax = (float)ACCEL * cosf(theta + 1.570796327f);
      ay = -(float)ACCEL * sinf(theta + 1.570796327f);
    }

    sVx += (int)(ax * friction * shipThrust / 2048.0f);
    sVy += (int)(ay * friction * shipThrust / 2048.0f);

    shipThrustActivated = TRUE;

    thrust_len++;
  } else {
    thrust_len = 0;
    shipThrustActivated = FALSE;
  }

  sVx = (sVx * medium) >> 10; /* Trˆghetsmoment */
  sVy = (sVy * medium) >> 10;
  sVy += gravity * 8; /* Gravity */

  if (sVx > MaxNorm)
    sVx = MaxNorm;
  if (sVx < -MaxNorm)
    sVx = -MaxNorm;
  if (sVy > MaxNorm)
    sVy = MaxNorm;

  if ((bulletLoadtime--) < 0)
    bulletLoadtime = 0;

  double time = getCurrentTimeInMillis();
  if (lastTime < 0)
    lastTime = time;

  if (shipState.state == SHIP_STATE_LANDED ||
      shipState.state == SHIP_STATE_FLYING) {
    float diff = (time - lastTime) / 100.0f;
    if (diff > 1.0f)
      diff = 1.0f;
    ShipTime -= diff; // per 10ms
    lastTime = time;
  }

  if (ShipTime <= 0) {
    frame_number = 0; // resets frame caounter to case explotion effect
    displayMessage(SHIP_MESSAGE_OUT_OF_TIME);
    shipState.state = SHIP_STATE_EXPLOADING; // Explode
    shipState.animationPhase = 0;
  }

  if (shipState.state == SHIP_STATE_FLYING) {
    sx += sVx;
    sy += sVy;
  }

  moveShip();

  for (n = 0; n <= N_BULLETS; n++) {

    if (bullet[n].active) {

      x = bullet[n].x >> STEP;
      y = bullet[n].y >> STEP;

      objadr = (x >> 5) + (y >> 5) * 20;

      if (bullet[n].dis > 43)
        bullet[n].active = FALSE;

      bul_adr = bulletback[n];

      // Calculate bullet (OMZ)
      uchar bulletback[9];
      uchar c;
      int xxx, yyy, nbr = 0;
      for (yyy = 0; yyy < 3; yyy++) {
        for (xxx = 0; xxx < 3; xxx++) {
          uchar *b32x32 =
              block[level[((y - 1 + yyy) >> 5) * 20 + ((x - 1 + xxx) >> 5)]];
          c = b32x32[((y - 1 + yyy) & 31) * 32 + ((x - 1 + xxx) & 31)];
          bulletback[nbr++] = c;
        }
      }

      for (tmp = 0; tmp <= 8; tmp++) {
        bul_col = bulletback[tmp];
        if ((bul_col == DOOR1COLOR) || (bul_col == DOOR2COLOR) ||
            (bul_col == DOOR3COLOR) || (bul_col == WATERCOLOR)) {

          switch (objects[objadr]) {

          case L_RED_DOOR:
            play_sound(kSound_Wallhit);
            makehole(x, y, 0);
            for (m = 0; m <= N_ACTION; m++) {
              if (!action[m].state) {
                action[m].state = TRUE;
                action[m].x = x;
                action[m].y = y;
                action[m].start = 48;
                action[m].stop = 50;
                action[m].frame = 48;
                action[m].speed = 4;
                action[m].delay = 4;
                goto nomoreloop;
              }
            }
            break;

          case E_TOP_WATER:
            play_sound(kSound_Splash);
            for (m = 0; m <= N_ACTION; m++) {
              if (!action[m].state) {
                action[m].state = TRUE;
                action[m].x = x;
                action[m].y = y;
                action[m].start = 113; // 112 -> 113
                action[m].stop = 116;
                action[m].frame = 113;
                action[m].speed = 2;
                action[m].delay = 2;
                action[m].type = ACTION_SPLASH;
                goto nomoreloop;
              }
            }
            break;

          default:
            for (m = 0; m <= N_ACTION; m++) {
              if (!action[m].state) {
                action[m].state = TRUE;
                action[m].x = x;
                action[m].y = y;
                action[m].start = 48;
                action[m].stop = 50;
                action[m].frame = 48;
                action[m].speed = 4;
                action[m].delay = 4;
                action[m].type = ACTION_SPARK;
                goto nomoreloop;
              }
            }
            break;
          };

        nomoreloop:

          bullet[n].active = FALSE;
          break;
        } else if ((bul_col > 127) && (bul_col < 175)) {

          play_sound(kSound_Wallhit);
          for (m = 0; m <= N_ACTION; m++) {
            if (!action[m].state) {
              action[m].state = TRUE;
              action[m].x = x;
              action[m].y = y;
              action[m].start = 49;
              action[m].stop = 50;
              action[m].frame = 49;
              action[m].speed = 6;
              action[m].delay = 6;
              action[m].type = ACTION_SPARK;
              goto nomoreloop2;
            }
          }
        nomoreloop2:

          bullet[n].active = FALSE;
          break;
        }
      }

      if (bullet[n].active) {
        bullet[n].x += bullet[n].xs;
        bullet[n].y += bullet[n].ys;
        bullet[n].dis++;
      }
    }
  }
}
