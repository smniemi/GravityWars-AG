/*
 *  score.h
 *  GravityWars
 *
 *  Created by Sami Niemi on 5/4/09.
 *  Copyright 2009 Scalado AB. All rights reserved.
 *
 */

#ifndef SCORE_H
#define SCORE_H

void putscoreOnly(int nr, short y);
void putletter(short adr, short num);
void putdigit(short adr, short num);
void putscore(int nr, short y);
void updatescore();
void killscore(int nr, short y, short newy);

#endif