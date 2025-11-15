/* GravityWars 1.1,  (C) Sami Niemi -95 */

#include "config.h"
#include <stdio.h>

extern int thrustSoundIsActive;

extern double lastTime;
int trainer;

extern int highScore[TOTAL_NUMBER_OF_LEVELS];
extern float bestTime[TOTAL_NUMBER_OF_LEVELS];
extern double startLevelTime;
extern double endLevelTime;
extern int firstTimeLaunched;

extern int completedNumberOfLevels;

extern int renderNewScore;

extern char level_name[100][100];
extern char level_author[100][100];
extern char level_comment[100][100];

extern char gamename[128];
extern int gamenamelen;

extern FILE *fileptr;
extern char buffer[320*33];
extern uchar ship[4][32][32*32];
extern uchar shipremo[2][32*32]; 
extern uchar shipback[2][32*32]; 
extern uchar shipbackM[32*32];
extern uchar shipmix[32*32];
extern uchar block[216+N_DESTROYEABLE][32*32];
extern uchar level[20*45];
extern uchar objects[20*45+80];
extern uchar backgnd[32*32*4];
extern uchar actionback[N_ACTION][32*32];
extern uchar actionmix[32*32];
extern uchar tmpmix[32*32];
extern uchar bulletback[N_BULLETS+1][9];
extern uchar score[256*16];
extern uchar scoreback[256*16];
extern uchar digits[88*6];
extern uchar numbers[880]; /* old was 800 ?? */
extern uchar highscore[4096];
extern uchar levelcode[4096];
extern uchar tmpscore[4096];
extern uchar fonts[1820];
extern uchar nextlevel[128];
extern short numLandingBlocks,n_anim;  
extern long bigsin[256];	       

extern struct excepttype {
  uchar type;
  short x,y;
} landingBlock[NUM_LANDING_BLOCKS];

extern struct animtype {
  short x,y,start,stop,frame,speed;
} anim[N_ANIM+1];

extern struct actiontype {
  short x,y,start,stop,frame,state,speed,delay;
} action[N_ACTION+1];

extern uchar pal[768],palB[768],realpal[768],realpal2[768];

extern struct bullettype {
  long x,y,ang,xs,ys,dis,type;
  unsigned char active;
} bullet[N_BULLETS+1];


extern int shipFlagInWater;


extern int shipThrust;
extern int shipIsFiring;

extern long Lsx,Lsy;
extern long sx,sy,osx,osy,sa,sVx,sVy,sVg,sA;
extern long gravity,lift_thrust,medium,friction;
//extern uchar *vga_ptr; 
extern short angX[32],angY[32];
extern short bulletLoadtime;
extern short anim_frame;
extern uchar shipThrustActivated;
extern uchar ScoreChange;
extern short thrust_len;
extern short waterMovementCount;
extern short num_of_collisions;
extern short MaxNorm;

extern long  ShipScore;
extern long  HighScore;
extern short ShipFuel; 
extern float ShipTime; 
extern short ShipLife;
extern short NumKeys;
extern short stop_x,stop_y;
extern short levelnum;

extern short BaseFuel,BaseLife;
extern float BaseTime;

extern long  delay_len;

extern uchar gameOver,escape;

extern uchar p0[768],p1[768],p2[768],p3[768];
extern uchar p2B[768];

extern uchar hole[2][1024];
extern long SIN[32];
extern uchar bulletgfx[9];

extern char codes[100][6];

extern float shipRotation;

extern struct shipStateType { 
	int active;
	int x;
	int y;
	unsigned char *gfx;
	int thrust;
	int image;
	int state;
	int animationPhase;
} shipState;

#define SHIP_IMAGE_NO_THRUST 0
#define SHIP_IMAGE_THRUST	1
#define SHIP_IMAGE_EXPLODE_1of5 2
#define SHIP_IMAGE_EXPLODE_2of5 3
#define SHIP_IMAGE_EXPLODE_3of5 4
#define SHIP_IMAGE_EXPLODE_4of5 5
#define SHIP_IMAGE_EXPLODE_5of5 6
#define SHIP_IMAGE_APPEAR_1of5 7
#define SHIP_IMAGE_APPEAR_2of5 8
#define SHIP_IMAGE_APPEAR_3of5 9
#define SHIP_IMAGE_APPEAR_4of5 10
#define SHIP_IMAGE_APPEAR_5of5 11

extern int dynamicBlocksChanged;
extern int scoreUpdated;



