/*
 *  GameFunctions.h
 *  GravityWars
 *
 *  Created by Sami Niemi on 5/4/09.
 *  Copyright 2009 Scalado AB. All rights reserved.
 *
 */

#include <stdio.h>
#include "GameDefines.h"

#ifndef GAMEFUNCTIONS_H
#define GAMEFUNCTIONS_H

FILE* iphone_fopen(const char* file, const char* type);

void displayMessage(const char* message);

void play_sound(int sound );

double getCurrentTimeInMillis();

#endif
