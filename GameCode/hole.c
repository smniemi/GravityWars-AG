/* GravityWars 1.1,  (C) Sami Niemi -95 */

#include "memory.h"
#include "blocks.h"

/*-----------------------------------------------------------------setbullet */
void makehole(int x, int y, int type) {
	
	static short xx,yy,s,d;
	static uchar *holemask;
	static uchar *gfx;
	static uchar c;
	static uchar tmpmix[34*34];
	
	x-=15;
	y-=15;
	
	int num=(x>>5)+20*(y>>5);	
	if (objects[num]!=L_RED_DOOR && objects[num+1]!=L_RED_DOOR && objects[num+20]!=L_RED_DOOR && objects[num+21]!=L_RED_DOOR)
		return;
	
	gfx=&backgnd[((y&31)<<6)+(x&31)];
	//gfx = block['%'];
	
	holemask=hole[type];

	getbox(x,y,tmpmix+33);
	
	s=0; d=33;
	for(yy=0; yy<=31; yy++) {
		for(xx=0; xx<=31; xx++) {
			// Should add code here to preserve walls, and to remove small door colors			
			tmpmix[d]=(holemask[d] /*&& ( tmpmix[d-1]==DOOR1COLOR || tmpmix[d+1]==DOOR1COLOR || tmpmix[d-32]==DOOR1COLOR || tmpmix[d+32]==DOOR1COLOR || tmpmix[d]==DOOR1COLOR)*/) ? gfx[s] : tmpmix[d]; // added constraint for only making holes in grid
			s++;
			d++;
		}
		s+=32;
	}
	
	changeblocks(x,y,tmpmix+33);
	dynamicBlocksChanged = 1;
	
}



