/* GravityWars 1.1,  (C) Sami Niemi -95 */

#include "memory.h"
#include "blocks.h"


/*------------------------------------------------------------------ animate */
void animate() {
	
	static short obj,n,m,fr,x,y,num_anim;
		
	/* Statical Animations */
	num_anim=n_anim-1;
	if (n_anim>0) {
		obj=anim_frame & ANIMSPEED; 
		for(n=obj; n<=num_anim; n+=ANIMSTEP) {
			fr=anim[n].frame;
			if ( ( (anim[n].start ^ anim[n].frame) & 7)==0) {
				level[anim[n].x + anim[n].y*20]=fr>>3; /// SAMI
			}
			fr+=anim[n].speed*4;
			if (fr>anim[n].stop) fr=anim[n].start; 
			anim[n].frame=fr; 
		}
		anim_frame++;
	}
	
	/* Action Animations */
	for(n=0; n<=N_ACTION; n++) {
		if (action[n].state) {
			
			x=action[n].x-16;
			y=action[n].y-16;
			if(action[n].frame==action[n].start) {				
				action[n].frame++;
			}
			else
				if (action[n].frame==action[n].stop) {  
					if (action[n].delay>0)
						action[n].delay--;
					else {
						action[n].state=FALSE;
					} 
				}
				else {
					if (action[n].delay>0)
						action[n].delay--;
					else {
						action[n].frame++;
						action[n].delay=action[n].speed;
					}
				}
		}
	}
}
