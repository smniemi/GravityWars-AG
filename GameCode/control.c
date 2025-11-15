/* GravityWars 1.1,  (C) Sami Niemi -95 */

#include "memory.h"
#include "GameDefines.h"
#include "GameFunctions.h"

#include "blocks.h"
#include "macros.h"
#include "moveship.h"
#include "hole.h"

#ifdef __EMSCRIPTEN__
#include "sound_shim.h"
#else
#include "SoundEngine.h"
#endif

#include <unistd.h>

extern int frame_number;


void control() {
	
	static short n,m,angle;
	static long x,y,tmp;
	static uchar *bul_adr;
	static int bul_col;
	static int objadr;
	
	if ( (shipIsFiring)	&& (bulletLoadtime==0) && 
		 (shipState.state == SHIP_STATE_LANDED || shipState.state == SHIP_STATE_FLYING) && 
		 (!shipFlagInWater) ) {    

		shipIsFiring=FALSE; // reset fire button
	
		SoundEngine_StartEffect( sounds[kSound_Shoot]);
		
		for(n=0; n<=N_BULLETS; n++) {   /* Shoots if there are free bullets */
			
			if (!bullet[n].active) {
				bullet[n].active=TRUE;
				bullet[n].ang=angle=sa >> 9;
				bullet[n].dis=16;
				bullet[n].xs=((angX[angle] << 6)+(angX[angle]<<5)+sVx);
				bullet[n].ys=((angY[angle] << 6)+(angY[angle]<<5)+sVy+sVg);
				bullet[n].x=sx+16384+(angX[angle] << 8)+(angX[angle] << 7);
				bullet[n].y=sy+16384+(angY[angle] << 8)+(angY[angle] << 7);
				
				bulletLoadtime=16;
				break;
				
			}
		}
	}
	
	// if thust is on, and enough fuel 
	if ( (shipThrust>0) && (ShipFuel>0) ) {    /* Up */
		
		ShipFuel--;
		
		if (ShipFuel==0) {
			displayMessage(SHIP_MESSAGE_OUT_OF_FUEL);
			play_sound(kSound_StopThrust);
		}
		
		sVx+=((angX[sa >> 9]*friction*shipThrust/2)>>10);
		tmp=(angY[sa >> 9]*friction*shipThrust/2);
		sVy+=(tmp)>>10;
		
		shipThrustActivated=TRUE;
		
		thrust_len++;
	} 
	else {
		thrust_len=0;
		shipThrustActivated=FALSE;
	}
	
	sVx=(sVx*medium) >> 10;      /* Trˆghetsmoment */
	sVy=(sVy*medium) >> 10;
	sVy+=gravity*8; /* Gravity */
	
	if (sVx>MaxNorm) sVx=MaxNorm;
	if (sVx<-MaxNorm) sVx=-MaxNorm;
	if (sVy>MaxNorm) sVy=MaxNorm;
	
	if ((bulletLoadtime--) < 0) bulletLoadtime=0;
	
	double time = getCurrentTimeInMillis();
	if (lastTime < 0) lastTime = time;

	if (shipState.state == SHIP_STATE_LANDED || shipState.state == SHIP_STATE_FLYING) {
		float diff = (time-lastTime)/100.0f;
		if (diff>1.0f)
			diff = 1.0f;
		ShipTime-=diff; // per 10ms
		lastTime = time;
	}
	
	if (ShipTime<=0) {
		frame_number = 0; // resets frame caounter to case explotion effect		
		displayMessage(SHIP_MESSAGE_OUT_OF_TIME);
		shipState.state=SHIP_STATE_EXPLOADING; // Explode
		shipState.animationPhase = 0; 		
	}
	
	if (shipState.state == SHIP_STATE_FLYING) {
		sx+=sVx;
		sy+=sVy;
	}
	
	moveShip();	
	
	for(n=0; n<=N_BULLETS; n++) {
		
		if (bullet[n].active) {
			
			x=bullet[n].x>>STEP;
			y=bullet[n].y>>STEP;
			
			objadr=(x>>5)+(y>>5)*20;
						
			if (bullet[n].dis>43) 
				bullet[n].active=FALSE;
			
			bul_adr=bulletback[n];
			
			// Calculate bullet (OMZ)
			uchar bulletback[9];
			uchar c;
			int xxx,yyy, nbr=0;
			for(yyy=0; yyy<3; yyy++) {
				for(xxx=0; xxx<3; xxx++) {
					uchar* b32x32 = block[level[((y-1+yyy)>>5)*20+((x-1+xxx)>>5)]];
					c=b32x32[((y-1+yyy)&31)*32+((x-1+xxx)&31)];
					bulletback[nbr++]=c;
				}
			}
			
			for(tmp=0; tmp<=8; tmp++) {
				bul_col=bulletback[tmp];
				if (
					(bul_col==DOOR1COLOR) ||
					(bul_col==DOOR2COLOR) ||
					(bul_col==DOOR3COLOR) ||
					(bul_col==WATERCOLOR)
					){
					
					switch(objects[objadr]) {
							
						case L_RED_DOOR:
							play_sound(kSound_Wallhit);
							makehole(x,y,0);
							for(m=0; m<=N_ACTION; m++) {
								if (!action[m].state) {
									action[m].state=TRUE;
									action[m].x=x;
									action[m].y=y;
									action[m].start=48;
									action[m].stop=51;
									action[m].frame=48;
									action[m].speed=4;
									action[m].delay=4;
									goto nomoreloop;
								}
							}
							break;
							
						case E_TOP_WATER:
							play_sound(kSound_Splash);
							for(m=0; m<=N_ACTION; m++) {
								if (!action[m].state) {
									action[m].state=TRUE;
									action[m].x=x;
									action[m].y=y;
									action[m].start=113; // 112 -> 113
									action[m].stop=117;
									action[m].frame=113;
									action[m].speed=2;
									action[m].delay=2;
									goto nomoreloop;
								}
							}
							break;
							
						default:
							for(m=0; m<=N_ACTION; m++) {
								if (!action[m].state) {
									action[m].state=TRUE;
									action[m].x=x;
									action[m].y=y;
									action[m].start=48;
									action[m].stop=51;
									action[m].frame=48;
									action[m].speed=4;
									action[m].delay=4;
									goto nomoreloop;
								}
							}
							break;
					};
					
				nomoreloop:
					
					bullet[n].active=FALSE;
					break;
				}
				else 
					if (
						(bul_col>127) &&
						(bul_col<175)
						) {

						play_sound(kSound_Wallhit);
						for(m=0; m<=N_ACTION; m++) {
							if (!action[m].state) {
								action[m].state=TRUE;
								action[m].x=x;
								action[m].y=y;
								action[m].start=49;
								action[m].stop=51;
								action[m].frame=49;
								action[m].speed=6;
								action[m].delay=6;
								goto nomoreloop2;
							}
						}
					nomoreloop2:
						
						bullet[n].active=FALSE;
						break;
					}
			}
			
			if (bullet[n].active) {
				bullet[n].x+=bullet[n].xs;
				bullet[n].y+=bullet[n].ys;
				bullet[n].dis++;
				
			}
		}
	}
}

