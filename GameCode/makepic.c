/* GravityWars 1.1,  (C) Sami Niemi -95 */

#include "memory.h"

#include "blocks.h"
/*---------------------------------------------------------- drawSplitScreen */


/*--------------------------------------------------------------- drawScreen */
void drawScreen() {
	
	static short x,y,xx,yy;

	
	/*---- ScreenShot-----
	 static long adr;
	 static int mask;
	 ---------------------*/
	
	
	for(yy=y=0; y<=44; y++,yy+=32) {
		for(xx=x=0; x<=19; x++,xx+=32) {
			putbox(xx,yy, block[level[x+y*20]]);
		}
	}
	
}




