//
//  GameView.h
//  GravityWars
//
//  Created by Sami Niemi on 6/11/09.
//  Copyright 2009 Scalado AB. All rights reserved.
//

/*
 *  GameView.h
 *  GravityWars
 *
 *  Created by Sami Niemi on 6/11/09.
 *  Copyright 2009 Scalado AB. All rights reserved.
 *
 */

#import <OpenGLES/EAGL.h>
#import <OpenGLES/ES1/gl.h>
#import <OpenGLES/ES1/glext.h>

#import <AudioToolbox/AudioToolbox.h> 

#import "ScoreServerRequest.h"

#import "SoundEngine.h"

#import "GameDefines.h"
#import "Texture2D.h"
#import "memory.h"

#import "GameDefines.h"

#define TEXTURE_BACK		(0)							// 215 textures
#define TEXTURE_SHIP		(216+N_DESTROYEABLE)		// 13 textures
#define TEXTURE_BULLET		(216+N_DESTROYEABLE+12)		// 1 texture
#define TEXTURE_SCORE		(216+N_DESTROYEABLE+12+1)	// 1 texture
#define TEXTURE_CORNER_NW	(216+N_DESTROYEABLE+12+1+1)	// 1 texture
#define TEXTURE_CORNER_NE	(216+N_DESTROYEABLE+12+1+1+1)	// 1 texture
#define TEXTURE_CORNER_SE	(216+N_DESTROYEABLE+12+1+1+1+1)	// 1 texture
#define TEXTURE_CORNER_SW	(216+N_DESTROYEABLE+12+1+1+1+1+1)	// 1 texture
#define TEXTURE_ASSETS		(216+N_DESTROYEABLE+12+1+1+1+1+1+1)							// 1 texture
#define NUM_TEXTURES		(216+N_DESTROYEABLE+12+1+1+1+1+1+1+1)	

typedef enum {
	INTRO_INIT= 0x100, INTRO, INTRO_FADE, INTRO_DEINIT, INTRO_INIT_TUTORIAL, INTRO_TUTORIAL, INTRO_TUTORIAL_PAUSED, INTRO_TUTORIAL_RUNNING, INTRO_DEINIT_TUTORIAL, INTRO_EXIT, INTRO_INIT_CREDITS, INTRO_CREDITS, INTRO_DEINIT_CREDITS,
			  GAME_INIT = 0x200, GAME, GAME_DEINIT, GAME_INIT_SCORE, GAME_SCORE, GAME_INIT_INFO, GAME_INFO, GAME_INFO2, GAME_INFO_WAIT, GAME_DEINIT_INFO, GAME_FINISHED, GAME_FINISHED_WAIT, GAME_EXIT} GameState;

typedef enum  {
	GAME_INTRO	= INTRO_INIT>>8, 
	GAME_PLAY	= GAME_INIT>>8
} GameMode;

typedef struct {
	
	//	int frame_number;
	
    // The pixel dimensions of the backbuffer 
    GLint backingWidth;
    GLint backingHeight;
	
	GLint textureWidth;
	GLint textureHeight;
	
	Texture2D* logoTexture;
	Texture2D* backTexture;

	
	UIAccelerationValue accelX, accelY, accelZ;
	GLfloat yRot, xRot;
	
	float xx,yy;
	
	// GW Texture 
	// Get the width and height of the image
	
	GLuint spriteTexture[NUM_TEXTURES];
	GLubyte *spriteData[NUM_TEXTURES];
	
	GameState state;
	GameState nextState;
	
	int levelNumber;
	int baseLevel;
	
	int musicOn;
		
	/*
	SystemSoundID soundShot;
	SystemSoundID soundSplash;
	SystemSoundID soundExplotion;
	SystemSoundID soundWallHit;
	SystemSoundID soundWoosh;
	SystemSoundID soundGas;
*/
	
} GameView;
