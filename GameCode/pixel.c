/* GravityWars 1.1,  (C) Sami Niemi -95 */

#include "memory.h"

/*-----------------------------------------------------------------setpixel */
void _setpixel(int x, int y, uchar c) {
	
	static long adr;
	
	adr=(y<<9)+(y<<7)+x;
	*(vga_ptr+(adr))=c;
}


/*-----------------------------------------------------------------setpixel */
uchar _getpixel(int x, int y) {
	
	static long adr;
	
	adr=(y<<9)+(y<<7)+x;
	return *(vga_ptr+(adr));
}

