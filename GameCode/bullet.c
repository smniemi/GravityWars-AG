/* GravityWars 1.1,  (C) Sami Niemi -95 */

#include "memory.h"
#include "bullet.h"


/*-----------------------------------------------------------------setbullet */
void setbullet(int x, int y,int num) {	// used for obtaining the color of the bullet bg
	
	static long adr;
	static short xx,yy,n;
	static char *adr2;
	static char *bullet;
	
	bullet=bulletback[num];
	
	adr=x+y*640;
		
	n=0;
	for(yy=0; yy<=2; yy++) {
		for(xx=0; xx<=2; xx++) {
			
			adr2=vga_ptr+adr;
			bullet[n]=*(adr2);
			*(adr2)=bulletgfx[n];
			n++;
			adr++;
		}
		adr+=637;
	}
}

/*----------------------------------------------------------------killbullet */
void killbullet(int x, int y,int num) {
	
	static long adr;
	static short page,xx,yy,n;
	
	static char *bullet;
	
	bullet=bulletback[num];
	adr=x+y*640;	
	
	n=0;
	for(yy=0; yy<=2; yy++) {
		for(xx=0; xx<=2; xx++) {
			*(vga_ptr+adr)=bullet[n];
			n++;
			adr++;
		}
		adr+=637;
	}
	
	
}



