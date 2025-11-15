/*
 *  GameFunctions.c
 *  GravityWars
 *
 *  Created by Sami Niemi on 5/4/09.
 *  Copyright 2009 Scalado AB. All rights reserved.
 *
 */

#import <Foundation/NSString.h> 

#import <Foundation/NSDate.h>

#include "GameFunctions.h"
#include <memory.h>
#include "memory.h"

#include "SoundEngine.h"

void doPanic() {

}

FILE* iphone_fopen(const char* origpath, const char* type) {

	NSString* path2 = [[[[NSBundle mainBundle] resourcePath ] stringByAppendingString: @"/" ] stringByAppendingString: [NSString stringWithUTF8String:origpath] ]; // hur bygger man in resurserna dit?


	//char* fname = [path2 cStringUsingEncoding:1];
	
	FILE *f = fopen([path2 cStringUsingEncoding:1],type);	
	
	return f;
	
} 

unsigned int sounds[kNumSounds];

void play_sound(int sound) {
	if (sound == kSound_StopThrust) {
		if (thrustSoundIsActive) {
			SoundEngine_StopEffect( sounds[kSound_Thrust], false );
			thrustSoundIsActive = false;
		}
	}
	
	SoundEngine_StartEffect( sounds[sound]);
}


#define TICKS_PER_SECOND 12672.0f 

float first_clock = -1;
float first_ti = -1;

double getCurrentTimeInMillis() {
	
	//float c = clock(); 

	NSDate *today = [NSDate date];
	NSTimeInterval i = [today timeIntervalSince1970];
	
	return (i)*1000.0;//(0.0000001f+i-first_ti)*1000.0f;
	
	
}
