/*
 *  GameDefines.h
 *  GravityWars
 *
 *  Created by Sami Niemi on 5/4/09.
 *  Copyright 2009 Scalado AB. All rights reserved.
 *
 */

#ifndef GAMEDEFINES_H
#define GAMEDEFINES_H

#define SCANCODE_IDLE 0
#define SCANCODE_THRUST 1
#define SCANCODE_RIGHT 2
#define SCANCODE_LEFT 3
#define SCANCODE_FIRE 4

enum {
	kSound_Thrust= 0,
	kSound_Shoot,
	kSound_Explode,
	kSound_Splash,
	kSound_Wallhit,
	kSound_Whoosh,		// ?
	kSound_Happy,		// when flied in
	kSound_Cling,
	kSound_Key,			// shorter
	kNumSounds,
	kSound_StopThrust
	
};

extern unsigned int sounds[];

#define SHIP_MESSAGE_CRASHED			"You crashed!"
#define SHIP_MESSAGE_OUT_OF_TIME		"You're out of time!"
#define SHIP_MESSAGE_OUT_OF_FUEL		"You're out of fuel!"
#define SHIP_MESSAGE_CONGRATULATIONS	"Congratulations!!!"

#endif