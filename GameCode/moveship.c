/* GravityWars 1.1,  (C) Sami Niemi -95 */

#include "memory.h"
#include "macros.h"

#include "blocks.h"
#include "animate.h"

#include "init.h"
#include "hole.h"

#include "GameFunctions.h"

#include <stdlib.h>


void setDefaultWaterValues(void) {
	// Default water values
	gravity=12;
	lift_thrust=15;
	medium=700;
	friction=600;
	shipFlagInWater = 1;
	MaxNorm=4000;
}

void setDefaultAirValues(void) {
	
	// Default Air Values
	gravity=20;
	lift_thrust=10;
	medium=900;
	friction=700;
	shipFlagInWater = 0;
	MaxNorm=6000;
	
}

extern int frame_number;

void moveShip(void) {
	
	static short n,xx,yy,level_adr;
	static short e_num,lx,ly;
	
	int blocktype;
	
	// SHIP_STATE_FLYING -------------------------------------------------------------------------	
	if (shipState.state == SHIP_STATE_FLYING) {
		
		endLevelTime =  getCurrentTimeInMillis(); // record time
		
		lx=((sx>>STEP)+16) >> 5;
		ly=((sy>>STEP)+16) >> 5;
		
		level_adr=ly*20+lx;  /* ly*20+lx */
		blocktype=objects[level_adr];
		
		switch(blocktype) {
				
			case E_NULL:
				break;
				
			case E_WIND_Q:
				sVx-=50*4;
				sVy-=50*4;
				break;
				
			case E_WIND_W:
				sVy-=50*4;
				break;
				
			case E_WIND_E:
				sVx+=50*4;
				sVy-=50*4;
				break;
				
			case E_WIND_D:
				sVx+=50*4;
				break;
				
			case E_WIND_C:
				sVx+=50*4;
				sVy+=50*4;
				break;
				
			case E_WIND_X:
				sVy+=50*4;
				break;
				
			case E_WIND_Z:
				sVx-=50*4;
				sVy+=50*4;
				break;
				
			case E_WIND_A:
				sVx-=50*4;
				break;
				
			case E_AIR: // Air == blocks just above half water
				
				if (shipFlagInWater) { /* Lifting! (Pintaj‰nnite) */
					sVy=sVy >> 5;
					sVg=sVg << 5;
				}
				setDefaultAirValues();
				break;
				
			case E_WKEY:
				play_sound(kSound_Key);
				NumKeys--;
				blocktype=E_WBONUS;
				goto h2o;
				
			case E_WFUEL:
				play_sound(kSound_Cling);
				ShipFuel+=80; /* 5 */
				if (ShipFuel>BaseFuel) ShipFuel=BaseFuel;
				blocktype=E_WBONUS;
				goto h2o;
				
			case E_WBONUS1:
			case E_WBONUS2:
			case E_WBONUS3:
			case E_WBONUS4:
				play_sound(kSound_Cling);
				ShipScore+=2;
				blocktype=E_WBONUS;												
				goto h2o;
			case E_TOP_WATER: 
			case E_WATER:
			h2o:

				/* Water */
				if (!shipFlagInWater) { /* Splash! */
					play_sound(kSound_Splash);
					sVx=sVx >> 2;
					sVy=sVy >> 2;
					sVg=sVg >> 2;
					setDefaultWaterValues();
				}
				waterMovementCount++;
				
				sVy+=((-SIN[waterMovementCount & 31]*4*sVx) >> 15);
				sVx+=((SIN[waterMovementCount & 31]*4*(sVy+sVg)) >> 15);
				
				break;
				
			case E_BONUS1:
			case E_BONUS2:
			case E_BONUS3:
			case E_BONUS4:
			case E_BONUS5:
			case E_BONUS6:
			case E_BONUS8:
				play_sound(kSound_Cling);
				ShipScore+=1;
				blocktype=E_BONUS;
				break;
				
			case E_KEY:
				play_sound(kSound_Key);
				NumKeys--;
//				NumKeys = 0; // FOR DEBUGING
				blocktype=E_BONUS;
				break;
				
			case E_XLIFE:
				play_sound(kSound_Cling);
				ShipLife++;
				if (ShipLife>9) ShipLife=9;
				blocktype=E_BONUS;
				break;
				
			case E_XFUEL:
				play_sound(kSound_Cling);
				ShipFuel+=80; /* 5 */
				if (ShipFuel>BaseFuel) ShipFuel=BaseFuel;
				blocktype=E_BONUS;
				break;
				
			case E_XTIME:
				play_sound(kSound_Cling);
				ShipTime+=50; /* 5 */
				if (ShipTime>BaseTime) ShipTime=BaseTime;
				blocktype=E_BONUS;
				break;
				
			case E_STOP:
				
				displayMessage(SHIP_MESSAGE_CONGRATULATIONS);
				play_sound(kSound_Happy);
				shipState.state = SHIP_STATE_DISAPPEARING;
				shipState.animationPhase = 5<<2;
				shipState.image = SHIP_IMAGE_APPEAR_1of5;
				break;
				
		}
		
		// Clear old bonus blocks
		if (blocktype==E_BONUS) {
			level[lx+ly*20]=37+(rand()&1);
			objects[lx+ly*20]=E_NULL;
			
		}
		else if (blocktype==E_WBONUS)  {						
			level[lx+ly*20]=204;
			objects[lx+ly*20]=E_WATER;
		}
		
		// When all keys are consumed, then put in startgate
		if (NumKeys==0) {          /* == should be enough... */
			NumKeys--;
			level[stop_x+stop_y*20]=41;
			objects[stop_x+stop_y*20]='x';
			play_sound(kSound_Whoosh);
		}
		
		
		
		// Get data for collision detection
		uchar* shipptr;
		uchar backptr[1024];
		getbox((sx>>STEP), (sy>>STEP), backptr);
		shipptr=ship[0][sa >> 9]; /* & 254 to mask out thrust */
		
		// Check for collision
		int num_of_collisions=0;
		n=0;
		for(yy=(sy>>STEP); yy<=(sy>>STEP)+31; yy++) {
			for(xx=(sx>>STEP); xx<=(sx>>STEP)+31; xx++) {
				n++;
				
				if (
					(shipptr[n]!=0) &&
					(
					 (
					  (backptr[n]>127)
					  &&
					  (backptr[n]<175)
					  ) 
					 ||
					 (backptr[n]==DOOR1COLOR)			// Disable door collitions
					 )
					) {
					
					num_of_collisions++;
				}
			}
		}
		
		// Check if the collision was towards the landing block
		if (num_of_collisions>0) {
			// Check if colliding with landing blocks
			lx=((sx>>STEP)+16) >> 5; 
			ly=((sy>>STEP)+16) >> 5;
			for(e_num=0; e_num<=numLandingBlocks; e_num++) {
				
				if ((ly==landingBlock[e_num].y) && (lx==landingBlock[e_num].x)) {
					
					switch(landingBlock[e_num].type) {
							
						case E_FUEL:
						case E_START:
														
							if (
								((sa<=(56*16)) ||
								 (sa>=(968*16))) &&
								((sVy+sVg)<1500)) {
								
								/* Landed succesfully here */
								shipState.state = SHIP_STATE_LANDED;
								sa=0;
								sVy=0;

								Lsx=sx;  // set next start position here when landed on fuel / start
								Lsy=sy;

							}
							break;
					}														
				}
			}
		}				
		
		if (num_of_collisions>5 && shipState.state!=SHIP_STATE_LANDED && (trainer == FALSE)) { // SHIP IS EXPLOADING
			
			num_of_collisions=0;
			play_sound(kSound_Explode);
			frame_number = 0; // resets frame caounter to case explotion effect
			displayMessage(SHIP_MESSAGE_CRASHED);
			shipState.state = SHIP_STATE_EXPLOADING;
			shipState.animationPhase = 5<<2; 
			
		}

		if (shipState.state == SHIP_STATE_FLYING && ShipFuel>0) {
			shipState.image =  (shipThrust==0 ? SHIP_IMAGE_NO_THRUST : SHIP_IMAGE_THRUST);
		}
		else {
			shipState.image = SHIP_IMAGE_NO_THRUST;
		}
		
	}
	
	// SHIP_STATE_LANDED -------------------------------------------------------------------------	
	else if (shipState.state == SHIP_STATE_LANDED) {
		
		endLevelTime =  getCurrentTimeInMillis(); // record time

		// Continue fueling 
		ShipFuel+=16;
		if (ShipFuel>BaseFuel) ShipFuel=BaseFuel;
		
		// With enough thrust, lift off.
		if (thrust_len>lift_thrust) {
			sVy-=128;
			shipState.state = SHIP_STATE_FLYING;
		}			
		shipState.image = SHIP_IMAGE_NO_THRUST;

		
	}
	
	// SHIP_STATE_EXPLOADING -------------------------------------------------------------------------	
	else if (shipState.state == SHIP_STATE_EXPLOADING) {
		
		endLevelTime =  getCurrentTimeInMillis(); // record time
		
		shipState.animationPhase--;
		if (shipState.animationPhase<0) shipState.animationPhase=0;

		switch (shipState.animationPhase>>2) {
			case 5:
				shipState.image = SHIP_IMAGE_EXPLODE_1of5;
				break;
			case 4:
				shipState.image = SHIP_IMAGE_EXPLODE_2of5;
				break;
			case 3:
				shipState.image = SHIP_IMAGE_EXPLODE_3of5;
				break;
			case 2:
				shipState.image = SHIP_IMAGE_EXPLODE_4of5;
				break;
			case 1:
				shipState.image = SHIP_IMAGE_EXPLODE_5of5;
				break;
			case 0:
				
				sa=0;
				sVx=sVy=sVg=1;  // Shouldn't ever be Zero ??
				sA=0;
				
				setDefaultAirValues();
				
				ShipLife--;
				if (ShipLife<=0) 
					gameOver = TRUE;
				else {
					
					// Put ship into start position
					sx=Lsx;
					sy=Lsy;
					
					// Fill him up
					ShipTime=BaseTime;
					ShipFuel=BaseFuel;
					
				}
				
				shipState.image = SHIP_IMAGE_APPEAR_1of5;
				shipState.state = SHIP_STATE_APPEARING;
				shipState.animationPhase = 5<<2; 
				break;
		}
	}

	// SHIP_STATE_DISAPPEARING -------------------------------------------------------------------------		
	else if (shipState.state == SHIP_STATE_DISAPPEARING) {

		endLevelTime =  getCurrentTimeInMillis(); // record time

		shipState.animationPhase--;
		if (shipState.animationPhase<0) shipState.animationPhase=0;

		switch (shipState.animationPhase>>2) {
			case 5:
				shipState.image = SHIP_IMAGE_APPEAR_5of5;
				break;
			case 4:
				shipState.image = SHIP_IMAGE_APPEAR_4of5;
				break;
			case 3:
				shipState.image = SHIP_IMAGE_APPEAR_3of5;
				break;
			case 2:
				shipState.image = SHIP_IMAGE_APPEAR_2of5;
				break;
			case 1:
				shipState.image = SHIP_IMAGE_APPEAR_1of5;
				break;
			case 0:
				// GamePlay will release the state after viewing of score
				break;
		}
	}

	// SHIP_STATE_APPEARING -------------------------------------------------------------------------	
	else if (shipState.state == SHIP_STATE_APPEARING) {
		shipState.animationPhase--; 
		if (shipState.animationPhase<0) shipState.animationPhase=0;

		switch (shipState.animationPhase>>2) {
			case 5:
				shipState.image = SHIP_IMAGE_APPEAR_1of5;
				break;
			case 4:
				shipState.image = SHIP_IMAGE_APPEAR_2of5;
				break;
			case 3:
				shipState.image = SHIP_IMAGE_APPEAR_3of5;
				break;
			case 2:
				shipState.image = SHIP_IMAGE_APPEAR_4of5;
				break;
			case 1:
				shipState.image = SHIP_IMAGE_APPEAR_5of5;
				break;
			case 0:
				shipState.image = SHIP_IMAGE_NO_THRUST;
				shipState.state = SHIP_STATE_LANDED;
				break;
		}
	}
	
	animate();	
	
	putship(sx>>STEP, sy>>STEP);
	
}


