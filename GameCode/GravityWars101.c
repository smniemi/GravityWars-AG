/* -------------------------------------------------------------------------
 Gravity Wars v1.1, (C) Sami Niemi 1995, 1996

 NOTES: [960824] [RELEASE NOTES 961101]

 The game started as a bunch of fun routines that made the ship fly.
 Later on I added collition control, and after P‰r got involved with
 the graphics I just couldn't stop... So, the structure of the game is
 just terrible, with lots of unecessary variables , flags that
 are used as variables etc.. I should've written the program in c++, and
 for X! Svgalib just contains too many bugs..

 I'd be fun to see this game ported to different operating systems, though
 the structure of the game might make it hard, especially since I used
 the SVGALIB.

 You're free to modify the code and the graphics as long as you write
 that the original code was written by Sami Niemi, and the original
 graphics were drawn by P‰r Johannesson (If you're using any parts of
 the original graphics)

 I'd love to hear from any changes that you've made to the game!

 / Sami

 e96sn@efd.lth.se
 sniemi@kuai.se
 http://www.kuai.se/~sniemi
 http://www.efd.lth.se/~e96sn


 REMEMBER:

 getbox(x,y,*ptr) Gets the original graphics based on the block[]&level[]
 getbox2(x,y,*ptr Gets the graphics directly from the screen



 BUGS (i.e. I don't have the time to fix'em):

 - consoleswitching takes away the splitscreen (real easy to fix)

 ------------------------------------------------------------------------- */
#include "GameDefines.h"

#include "includes.h"
#include "memory.h"
#include <unistd.h>

#include <stdio.h>
#include <string.h>

#include "blocks.h"
#include "control.h"
#include "init.h"
#include "moveship.h"

#include "GameDefines.h"
#include "GameFunctions.h"

/*--------------------------------------------------------------------- main */
int init_gw() {
  initParams();
  loadGfx();
  rotGfx();

  levelnum = 0;
  loaddata();
}

void main_init() {

  int y;

  short baselevel;

  char firstlevel[20] = "levels/level00";

  //	levelnum=4;
  baselevel = levelnum;

  strcpy(firstlevel, nextlevel);
  // LOOP HERE

  dynamicBlocksChanged = 1;
  loaddata();

  moveShip();

  anim_frame = 0;
  // ShipScore=0; // Removed to allow score to persist across levels
  ShipLife = 5;
  gameOver = FALSE;
}
void main_loop() {
  while (!gameOver) {
    control();
  }
}

void main_end() {

  int n;

  long tmp_long;

  short baselevel = 1; // SAMI
  char filename[128];

  char firstlevel[20] = "levels/level01";

  /*------ The End --------*/
  if (gameOver) {

    for (n = 0; n <= 4095; n++) {
      tmpscore[n] = score[n];
      score[n] = highscore[n];
    }

    if (ShipScore > HighScore) {
      HighScore = ShipScore;

      strcpy(filename, gamename);
      strcpy(&filename[gamenamelen], "data/hscore.gw");
      if ((fileptr = fopen(filename, "w")) != NULL) {
        fprintf(fileptr, "%d\n", ShipScore);
        fclose(fileptr);
      } else {
        printf("Can't write the HighScore!!!!");
        doPanic();
      }
    }

    for (n = 0; n <= 4095; n++) {
      score[n] = tmpscore[n];
    }

    /// INTRO / OUTRO

    strcpy(nextlevel, firstlevel);
    levelnum = baselevel;
    ShipLife = 5;
  }

  // Bye bye
  // return 0;
}

int main_gw(int n_args, char *arg[]) {
  main_init();
  main_loop();
  main_end();
}
