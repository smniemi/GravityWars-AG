/* GravityWars 1.1,  (C) Sami Niemi -95 */

#include "memory.h"
#include "score.h"

/* Level code letters */
void putletter(short adr, short num) {   /* adr=x+(y<<8) */
	
	 short xx,yy;
	 char *to;
	 char *from;
	 uchar colr;
	
	to=&score[adr];
	from=&fonts[(num<<3)+num+num];
	
	for(yy=0; yy<=6; yy++) {
		for(xx=0; xx<=8; xx++) {
			colr=*(from++);
			if (colr!=0) colr+=48;
			*(to++)=colr;
		}
		to+=247;
		from+=251; /*253*/
	}
}

/* Score Digits */
void putdigit(short adr, short num) {   /* adr=x+(y<<8) */
	
	 short xx,yy;
	 char *to;
	 char *from;
	
	to=&score[adr];
	from=&digits[(num<<3)];
	
	for(yy=0; yy<=5; yy++) {
		for(xx=0; xx<=7; xx++) {
			*(to++)=*(from++);   
		}
		to+=248;
		from+=80;
	}
}

#define SCR_AB 55040
#define SCR_AP 65280

void putscore(int nr, short y) {}

void putscoreOnly(int nr, short y) {  /* Don't save the background */
#ifndef __EMSCRIPTEN__
	long adr;
	short xx,yy;
	uchar *dp;
	uchar *adr3;
	
	adr=184; /*(y<<9)+(y<<7)+8;*/
	dp=score;
	
		
		/* NORMAL */
		for (yy=0; yy<=15; yy++) {
			for (xx=0; xx<=255; xx++) {
				adr3=vga_ptr+adr++;
				*(adr3)=*(dp++);
			}
			adr+=384;
		}
#endif
	scoreUpdated = 1;
} 
void updatescore() {           /* Terrible Routine... (optimal speed though) */
	
/*
	short fuel;
	 short time;
	 short score;
	
	fuel=Dec2BCD[ShipFuel>>4];
	time=Dec2BCD[ShipTime>>7];
	score=Dec2BCD[ShipScore];
	
	putdigit(1322,(fuel>>4)&15);
	putdigit(1330,fuel&15);
	
	putdigit(1371,ShipLife);
	
	putdigit(1415,(time>>4)&15);
	putdigit(1423,time&15);
	
	putdigit(1482,(score>>16)&15);
	putdigit(1490,(score>>12)&15);
	putdigit(1498,(score>>8)&15);
	putdigit(1506,(score>>4)&15);
	putdigit(1514,score&15);
	
	putscoreOnly(0,0);
*/
	renderNewScore = 1;
	
}




/*----------------------------------------------------------------killscore */
void killscore(int nr, short y, short newy) {
} 

