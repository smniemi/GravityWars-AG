/* GravityWars 1.1,  (C) Sami Niemi -95 */

#include "includes.h"
#include "config.h"

#define SIZE 1.5  /* Sinus Table Size */

int completedNumberOfLevels = 0;
int highScore[TOTAL_NUMBER_OF_LEVELS];
float bestTime[TOTAL_NUMBER_OF_LEVELS];
double startLevelTime;
double endLevelTime;
int firstTimeLaunched;


char level_name[100][100];
char level_author[100][100];
char level_comment[100][100];

FILE *fileptr;

int thrustSoundIsActive = 0;

int renderNewScore;

char gamename[128];
int gamenamelen;

char buffer[320*33]; /* The Gfx is save on a 320*x screen, with lines
 between the objects.. -> only 9 objects per line */


/* The Buffer for the Ships and The Backgrounds (2 ships supported!) */

uchar ship[4][32][32*32];  /* 32 frames of ships 32*32 */
/*    ship[0][..][..]=Ship#1
 [1]        =Ship#2
 [2]        =Thrust#1
 [3]        =Thrust#2
 */

uchar shipremo[2][32*32]; /* Not only ships */
uchar shipback[2][32*32]; /* Not only ships */
uchar shipbackM[32*32];
uchar shipmix[32*32];

uchar block[216+N_DESTROYEABLE][32*32]; /* Allocate Mem for the Gfx blocks */
uchar level[20*45];                     /* Level Gfx Map */
uchar objects[20*45+80];                /* Level Object Map */ 
/* +80 to avoid too long lines */
uchar backgnd[32*32*4];

uchar actionback[N_ACTION][32*32];
uchar actionmix[32*32];

uchar tmpmix[32*32];

uchar bulletback[N_BULLETS+1][9];

uchar bulletgfx[]= { 
12,13,12, 0,
13,14,13, 0,
12,13,12, 0,
0,0,0,0
};

uchar score[256*16];
uchar scoreback[256*16];
uchar digits[88*6];
uchar numbers[880]; /* old was 800 ?? */
uchar highscore[4096];
uchar levelcode[4096];
uchar tmpscore[4096];
uchar fonts[1820];

/*uchar LEVEL[128],AUTHOR[128],COMMENT[128],*/
uchar nextlevel[128];

int displayStart;
//int needToUpdateScreen;

short numLandingBlocks,n_anim; /* Number of these.. */

long SIN[32]={  399*SIZE,  783*SIZE, 1137*SIZE, 1448*SIZE,
1702*SIZE, 1892*SIZE, 2008*SIZE, 2048*SIZE,  
2008*SIZE, 1892*SIZE, 1702*SIZE, 1448*SIZE,
1137*SIZE,  783*SIZE,  399*SIZE, 0*SIZE,           
-399*SIZE, -783*SIZE,-1137*SIZE,-1448*SIZE,
-1702*SIZE,-1892*SIZE,-2008*SIZE,-2048*SIZE,        
-2008*SIZE,-1892*SIZE,-1702*SIZE,-1448*SIZE,
-1137*SIZE, -783*SIZE, -399*SIZE, 0*SIZE};

long bigsin[256];	       

uchar hole[2][1024]={
{
0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,1,1,1,0,0,1,0,0,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,1,0,0,0,1,1,1,0,0,1,1,1,0,1,1,0,0,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,
0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,
0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,1,1,1,0,1,1,1,0,1,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,0,1,1,0,1,1,1,0,1,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,0,1,0,0,0,1,1,1,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0

},
{
0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,1,1,0,0,0,1,1,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,0,1,1,0,1,1,1,0,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,0,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,0,1,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,0,1,1,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,0,0,1,1,0,0,1,1,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0

}
};

struct excepttype {
	uchar type;
	short x,y;
} landingBlock[NUM_LANDING_BLOCKS];

struct animtype {
	short x,y,start,stop,frame,speed;
} anim[N_ANIM+1];

struct actiontype {
	short x,y,start,stop,frame,state,speed,delay;
	short type;
} action[N_ACTION+1];

uchar pal[768],palB[768],realpal[768],realpal2[768];

struct bullettype {
	long x,y,ang,xs,ys,dis,type;
	unsigned char active;
} bullet[N_BULLETS+1];


/* sx/sy=coord, sa=angle
 sV=Velocity(x,y, gravity),
 sA=Acceleration
 sf=Flags 
 
 */

/* Original Ship Coordinates for the level */
long Lsx,Lsy;

/* s=  Ship X/Y
 os= Old Ship X/Y
 a=  Angle
 V=  Velocity
 A=  Acceleration
 */
long sx,sy,osx,osy,sa,sVx,sVy,sVg,sA;

double lastTime = -1;

int trainer = FALSE;

int shipThrust;
int shipIsFiring;

long gravity,lift_thrust,medium,friction;

short angX[32],angY[32];
short bulletLoadtime=0;
short anim_frame;

int shipFlagInWater;

uchar shipThrustActivated=FALSE;

uchar ScoreChange=0;

short thrust_len=0;
short waterMovementCount=0;
short num_of_collisions=0;
short MaxNorm;            /* Max speeds */

long  ShipScore=0;
long  HighScore=0;
short ShipFuel; 
float ShipTime = 999; 
short ShipLife=5;
short NumKeys;
short stop_x,stop_y;
short levelnum;

short BaseFuel,BaseLife;
float BaseTime;

long  delay_len=0;

uchar gameOver,escape=FALSE;

uchar p0[768],p1[768],p2[768],p3[768];
uchar p2B[768];

struct shipStateType { 
	int active;
	int x;
	int y;
	unsigned char *gfx;
	int thrust;
	int image;
	int state;
	int animationPhase;
} shipState;

float shipRotation;

int dynamicBlocksChanged;
int scoreUpdated;