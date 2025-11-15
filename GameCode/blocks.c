/* GravityWars 1.1,  (C) Sami Niemi -95 */

#include "memory.h"
#include "GameDefines.h"

void putship(int x, int y) {
	shipState.active = TRUE;
	shipState.x = x;
	shipState.y = y;
}

void removeship(void) {
	shipState.active = FALSE;
}

/*--------------------------------------------------------------------------*/
/* Get a 32*32 linear box from the blockmap/blockgfx address space          */
/*--------------------------------------------------------------------------*/
void getbox(int orx, int ory, uchar *out) {
	
	static int rx,ry,cx,cy,ix,iy,ox,oy,n;
	
	static char *from;
	static char *to;
	static int  num;
	
	rx=orx;
	ry=ory;
	
	ox=rx&31;
	oy=ry&31;
	
	/* Left Up */
	n=(ry>>5);
	num=(rx>>5)+(n<<4)+(n<<2);
	
	ix=ox;
	iy=oy;
	from=block[level[num]]+ix+(iy<<5);
	to=&out[0];
	for(cy=iy; cy<=31; cy++) {
		for(cx=ix; cx<=31; cx++) {
			*(to++)=*(from++);
		}
		to+=ix;
		from+=ix;
	}
	
	/* Right Up */
	if (ox>0) {
		rx=orx+31;
		ix=31-rx&31;
		iy=oy;
		from=block[level[num+1]]+(iy<<5);
		to=&out[ix];
		for(cy=iy; cy<=31; cy++) {
			for(cx=ix; cx<=31; cx++) {
				*(to++)=*(from++);
			}
			to+=ix;
			from+=ix;
		}
		
		
		
		
		/* Right Down */
		if (oy>0) {
			rx=orx+31;
			ry=ory+31;
			iy=ry&31;
			ix=31-rx&31;
			from=block[level[num+21]];
			to=&out[ix+((31-iy)<<5)];
			for(cy=0; cy<=iy; cy++) {
				for(cx=ix; cx<=31; cx++)
					*(to++)=*(from++);
				to+=ix;
				from+=ix;
			}
		}
	}
	
	
	/* Left Down */
	if (oy>0) {
		ry=ory+31;
		rx=ox;
		ix=rx&31;
		iy=ry&31;
		from=block[level[num+20]]+ix;
		to=&out[((31-iy)<<5)];
		for(cy=0; cy<=iy; cy++) {
			for(cx=0; cx<=(31-ix); cx++)
				*(to++)=*(from++);
			to+=ix;
			from+=ix;
		}
	} 
}
/*--------------------------------------------------------------------------*/
/* Put a 32*32 linear box to the blockmap/blockgfx address space            */
/*--------------------------------------------------------------------------*/
void changeblocks(int orx, int ory, uchar *out) {
	
	static int rx,ry,cx,cy,ix,iy,ox,oy,n;
	
	static char *from;
	static char *to;
	static int  num;
	
	rx=orx;
	ry=ory;
	
	ox=rx&31;
	oy=ry&31;
	
	/* Left Up */
	n=(ry>>5);
	num=(rx>>5)+(n<<4)+(n<<2);
	
	if (objects[num]==L_RED_DOOR)  {
		ix=ox;
		iy=oy;
		from=block[level[num]]+ix+(iy<<5);
		to=&out[0];
		for(cy=iy; cy<=31; cy++) {
			for(cx=ix; cx<=31; cx++) {
				*(from++)=*(to++);
			}
			to+=ix;
			from+=ix;
		}
	}
	
	/* Right Up */
	if (ox>0) {
		if (objects[num+1]==L_RED_DOOR) {
			rx=orx+31;
			ix=31-rx&31;
			iy=oy;
			from=block[level[num+1]]+(iy<<5);
			to=&out[ix];
			for(cy=iy; cy<=31; cy++) {
				for(cx=ix; cx<=31; cx++) {
					*(from++)=*(to++);
				}
				to+=ix;
				from+=ix;
			}
		}
		
		
		
		
		/* Right Down */
		if ( (oy>0) && (objects[num+21]==L_RED_DOOR) ) {
			rx=orx+31;
			ry=ory+31;
			iy=ry&31;
			ix=31-rx&31;
			from=block[level[num+21]];
			to=&out[ix+((31-iy)<<5)];
			for(cy=0; cy<=iy; cy++) {
				for(cx=ix; cx<=31; cx++)
					*(from++)=*(to++);
				to+=ix;
				from+=ix;
			}
		}
	}
	
	
	/* Left Down */
	if ( (oy>0) && (objects[num+20]==L_RED_DOOR) ) {
		ry=ory+31;
		rx=ox;
		ix=rx&31;
		iy=ry&31;
		from=block[level[num+20]]+ix;
		to=&out[((31-iy)<<5)];
		for(cy=0; cy<=iy; cy++) {
			for(cx=0; cx<=(31-ix); cx++)
				*(from++)=*(to++);
			to+=ix;
			from+=ix;
		}
	} 
	
	dynamicBlocksChanged = 1;
}

	
