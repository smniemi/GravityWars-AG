//
//  GamePlay.m
//  GravityWars
//
//  Created by Sami Niemi on 6/11/09.
//  Copyright 2009 Scalado AB. All rights reserved.
//

#import "GamePlay.h"

#import "GameFunctions.h"

#import "Beacon.h"

#include <unistd.h>

@implementation GamePlay

extern int frame_number;


double initialTime = -1;
int leftX, leftY, rightX, rightY, leftOnOff, rightOnOff;
int initial_frame_number;

void outputShipInfo() {
	
//	double time = getCurrentTimeInMillis();

	// leftx/y, right x/y, shipThrust, shipIsFiring, sa
		
	printf(" %8d, %3d,%3d,%1d, %3d,%3d,%1d,  %2d, %1d, %5d,\n", frame_number, leftX, leftY, leftOnOff, rightX, rightY, rightOnOff, shipThrust, shipIsFiring, sa);
		   
}

-(void) updateScoreTextures {	
		
	float totalTime = (float)(endLevelTime-startLevelTime)/1000.0f-ShipScore/4.0;
	if (totalTime<0)
		totalTime=0;
/*	int totalTimeHI = totalTime/600;
	int totalTimeMID = (((int)totalTime)%600)/10;
	int totalTimeLO = (((int)totalTime)%10)*10;
*/		
		
	if ((ShipFuel>>4)!=(localShipFuel>>4)) {

		NSString* fuelString = [NSString stringWithFormat:@"Fuel %d", ShipFuel>>4];

		[ fuelTexture initWithString:fuelString dimensions:CGSizeMake(128, 32) alignment:UITextAlignmentLeft fontName:@"Galactican" fontSize:18];
		localShipFuel = ShipFuel;
	}
	if (ShipTime!=localShipTime) {
		NSString* timeString = [NSString stringWithFormat:@"Time %d", (int)ShipTime];
		
		[ timeTexture initWithString:timeString dimensions:CGSizeMake(128, 32) alignment:UITextAlignmentLeft fontName:@"Galactican" fontSize:18];
		localShipTime = ShipTime;
	}
	if (ShipLife!=localShipLife) {
		NSString* lifeString = [NSString stringWithFormat:@"A %d", ShipLife];

		[ lifeTexture initWithString:lifeString dimensions:CGSizeMake(128, 32) alignment:UITextAlignmentRight fontName:@"Galactican" fontSize:18];
		localShipLife = ShipLife;
	}
	if ((int)(totalTime*10)!=localTotalTime) {
		NSString* scoreString = [NSString stringWithFormat:@"%.1f s", totalTime];

		[ scoreTexture initWithString:scoreString dimensions:CGSizeMake(128, 32) alignment:UITextAlignmentCenter fontName:@"Galactican" fontSize:24];
		localTotalTime = (int)(totalTime*10);
	}		
}

id refToSelf;

-(void) initWithGameView:(GameView*)gameView
{
	gv = gameView;
	refToSelf = self;
	
	levelCreditsTexture = [Texture2D alloc];
	totalScoreTexture = [Texture2D alloc];
	textTexture = [Texture2D alloc];
	lifeTexture = [Texture2D alloc];
	timeTexture = [Texture2D alloc];
	fuelTexture = [Texture2D alloc];
	scoreTexture = [Texture2D alloc];
	highScoreTexture = [Texture2D alloc];
	
	[self updateScoreTextures];
	
	gameMessageString = [NSString alloc];
	
	gv->nextState = GAME_INIT;
	gv->state = GAME_INIT;
	
	globalFadeFactor = 1.0f;
	textFadeFactor = 1.0f;
	
	screenTouched = false;
	
	finishedFadeFactor = 0.0;
	
	gameFinishedTexture = [[Texture2D alloc] initWithString:@"You made it! The ship is safely home.\n\nFor more adventures, search the\nAppStore for more GravityWars titles!\n\nThanks for playing! - Sami" dimensions:CGSizeMake(512, 256) alignment:UITextAlignmentCenter fontName:@"Galactican" fontSize:18];
	gravityWarsTexture = [[Texture2D alloc] initWithString:@"GRAVITY WARS" dimensions:CGSizeMake(128*3, 32*3) alignment:UITextAlignmentCenter fontName:@"Galactican" fontSize:48];
	blogTexture = [[Texture2D alloc] initWithString:@"Visit blog!" dimensions:CGSizeMake(128, 32) alignment:UITextAlignmentCenter fontName:@"Galactican" fontSize:18];//	textTexture = [[Texture2D alloc] initWithString:@"You crashed!!!" dimensions:CGSizeMake(128, 32) alignment:UITextAlignmentCenter fontName:@"American Typewriter" fontSize:16];
	
		
//	inputMode = NOTHING;
	
}


-(void) deinit
{

	[textTexture release];
	[lifeTexture release];
	[timeTexture release];
	[fuelTexture release];
	[scoreTexture release];
	[highScoreTexture release];
	[totalScoreTexture release];
	[levelCreditsTexture release];
	
	[gameFinishedTexture release];
	[gravityWarsTexture release];
	[blogTexture release];
	
}


void displayMessage(const char* message) {
	
	NSString* text = [NSString stringWithUTF8String:message ];

	[refToSelf displayMessage:text];
}
- (void) displayMessage:(NSString*)messageString 
{
	gameMessageVisible = true;
	frameNumberAtMessageStart = frame_number;
		
	gameMessageString = [ NSString stringWithString:messageString];

	[textTexture initWithString:gameMessageString dimensions:CGSizeMake(256, 32) alignment:UITextAlignmentCenter fontName:@"Galactican" fontSize:18];
	
}

- (void) displayLevelCredits 
{
	
	
//	NSString* text = [NSString stringWithFormat:@"Level: %d\n\n\"%s\"\n\nLevel author %s\n\n- %s -", levelnum, level_name[levelnum], level_author[levelnum], level_comment[levelnum]  ];
	NSString* text = [NSString stringWithFormat:@"Level: %d\n\n\"%s\"\n\n\n- %s -", levelnum, level_name[levelnum], level_comment[levelnum]  ];

	NSString* levelString = [NSString stringWithFormat:@"Playing Level %d", levelnum];
	[[Beacon shared] startSubBeaconWithName:levelString timeSession:NO];

	[levelCreditsTexture initWithString:text dimensions:CGSizeMake(512, 256) alignment:UITextAlignmentCenter fontName:@"Galactican" fontSize:20];

	levelCreditsVisible = true;
	gameMessageVisible = false;

	frameNumberAtLevelCreditStart = frame_number;

	if (gv->musicOn) {
		
		SoundEngine_StopBackgroundMusic(false);
		SoundEngine_UnloadBackgroundMusicTrack();

		NSBundle* bundle = [NSBundle mainBundle];
		switch(levelnum%5) {
			case 0:
				SoundEngine_LoadBackgroundMusicTrack([[bundle pathForResource:@"Gw1" ofType:@"m4r"] UTF8String], true, false);
				break;
			case 1:
				SoundEngine_LoadBackgroundMusicTrack([[bundle pathForResource:@"Gw2" ofType:@"m4r"] UTF8String], true, false);
				break;
			case 2:
				SoundEngine_LoadBackgroundMusicTrack([[bundle pathForResource:@"Gw3" ofType:@"m4r"] UTF8String], true, false);
				break;
			case 3:
				SoundEngine_LoadBackgroundMusicTrack([[bundle pathForResource:@"Gw4" ofType:@"m4r"] UTF8String], true, false);
				break;
			case 4:
				SoundEngine_LoadBackgroundMusicTrack([[bundle pathForResource:@"Gw5" ofType:@"m4r"] UTF8String], true, false);
				break;
		}
		SoundEngine_SetBackgroundMusicVolume(0.33f);
		SoundEngine_StartBackgroundMusic();
	}
	
	[self requestScore:levelnum];	

}


- (void) clearLevelCredits 
{
	levelCreditsVisible = false;
}

- (void) displayTotalScore
{
	[self updateScoreTextures]; // sync time
	
	int totalScore = ShipScore;
	float totalTime = (float)(endLevelTime-startLevelTime)/1000.0f-ShipScore/4.0;
	
	if (totalTime<0)
		totalTime=0;

	if (completedNumberOfLevels<levelnum)
		completedNumberOfLevels = levelnum;
		
	if (totalTime<bestTime[levelnum-1]) {
		bestTime[levelnum-1] = totalTime;
	}

	[self postScore:levelnum totalTime:(int)(totalTime*10)]; // should be moved up into the if
	NSString* hiscore;
	if (highScore[levelnum-1] == 99999) {
		hiscore = @" - ";
	} else {
		hiscore = [NSString stringWithFormat:@"%.1f", highScore[levelnum-1]/10.0];
	}
	
	NSString* text = [NSString stringWithFormat:@"Completed level %d !!!\n\nTime: %.1f sec\nYour best time: %.1f sec\nGlobal high score: %@ sec", levelnum, totalTime, bestTime[levelnum-1], hiscore ];

	[totalScoreTexture initWithString:text dimensions:CGSizeMake(512, 256) alignment:UITextAlignmentCenter fontName:@"Galactican" fontSize:24];
	
	totalScoreVisible = true;
	gameMessageVisible = false;
	
	NSString* levelString = [NSString stringWithFormat:@"Completed Level %d", levelnum];
	[[Beacon shared] startSubBeaconWithName:levelString timeSession:NO];
	
//	frameNumberAtLevelCreditStart = frame_number;
}


- (void) clearTotalScore 
{
	totalScoreVisible = false;
}


- (void)createAssetTextures {
	// Allocate a buffer to store all backgroud assets
	GLubyte* pSceneAssets = malloc(1024*512*4);
	
	// Bind the texture name. 
	GLubyte* p=malloc(32*32*4);
	for (int y=0; y<216+N_DESTROYEABLE; y++) {
		//		for(int x=0; x<20; x++) {
		glBindTexture(GL_TEXTURE_2D, gv->spriteTexture[TEXTURE_BACK+y]);
		
		for(int n=0, m=0; n<32*32; n++,m+=4) {
			int c=block[y][n];
			int tc;
			if (c>=176 && c<=190) {// background
				tc=realpal[c*3+0]*4+24; if (tc>255) tc=255; p[m  ] = tc;
				tc=realpal[c*3+1]*4+24; if (tc>255) tc=255; p[m+1] = tc;
				tc=realpal[c*3+2]*4+24; if (tc>255) tc=255; p[m+2] = tc;
			}
			else {
				p[m  ] = realpal[c*3+0]*4;
				p[m+1] = realpal[c*3+1]*4;
				p[m+2] = realpal[c*3+2]*4;
			}
			p[m+3] = (c!=0 && (c<176 || c>190 ))*255; 
			//			p[m+3] = (c!=0 && /*c!=WATERCOLOR &&*/ (c<176 || c>190) && c!=DOOR1COLOR)*255;
		}
		
		// Copy to scene asset
		int old_r=0; int old_g=0; int old_b=0; int old_c=0;
		int assetptr = (y/32)*32*1024*4+(y%32)*32*4;
		for (int yy=0; yy<32; yy++) {
			for(int xx=0; xx<32; xx++) {
				
				int c=block[y][yy*32+xx];
				if (c!=WATERCOLOR) {
					pSceneAssets[assetptr+yy*1024*4+xx*4+0] = (old_r=p[yy*32*4+xx*4+0]);
					pSceneAssets[assetptr+yy*1024*4+xx*4+1] = (old_g=p[yy*32*4+xx*4+1]);
					pSceneAssets[assetptr+yy*1024*4+xx*4+2] = (old_b=p[yy*32*4+xx*4+2]);
					pSceneAssets[assetptr+yy*1024*4+xx*4+3] = 0; old_c = c;
				}
				else {
					pSceneAssets[assetptr+yy*1024*4+xx*4+0] = old_r;
					pSceneAssets[assetptr+yy*1024*4+xx*4+1] = old_g;
					pSceneAssets[assetptr+yy*1024*4+xx*4+2] = old_b;
					pSceneAssets[assetptr+yy*1024*4+xx*4+3] = (old_c<176 || old_c>190)*255;
					
				}
				if ( (c!=0 && (c<176 || c>190)) && c!=196 && c!=DOOR1COLOR && c!=DOOR2COLOR && c!=DOOR3COLOR && c!=WATERCOLOR) {  // 196 == GREEN
					pSceneAssets[assetptr+yy*1024*4+xx*4+3] = 255;
				}
			}
		}
		glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA, 32, 32, 0, GL_RGBA, GL_UNSIGNED_BYTE, p);
		
		glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
		glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE);
		glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);
		//		}
	}
	free(p);
	// Create a large asset texture 
	glBindTexture(GL_TEXTURE_2D, gv->spriteTexture[TEXTURE_ASSETS]);
	glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA, 1024, 512, 0, GL_RGBA, GL_UNSIGNED_BYTE, pSceneAssets);
	glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
	glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE);
	glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);	
	free( pSceneAssets );
}


- (void)viewLogic
{
	
	if (gameOver) {
		gv->nextState = GAME_DEINIT;
	}
	
	if (gv->state == GAME && shipState.state == SHIP_STATE_DISAPPEARING && (shipState.animationPhase>>2)==0) {
		
		gv->levelNumber = (levelnum+1);
		gv->nextState = GAME_INIT_SCORE;	
	}
	
	switch(gv->state) {
		case GAME_INIT:
			[ self displayMessage:@"Good luck!!"];
			
			trainer = FALSE;
			
			shipState.state = SHIP_STATE_LANDED;
			shipState.image = SHIP_IMAGE_NO_THRUST; 
	
			[[Beacon shared] startSubBeaconWithName:@"Playing" timeSession:NO];
			
			endLevelTime = startLevelTime =  getCurrentTimeInMillis();
			[self updateScoreTextures];
			
			gv->nextState = GAME;
			break;
		case GAME_DEINIT:
			SoundEngine_StopEffect( sounds[kSound_Thrust], false);
			thrustSoundIsActive = false;


			globalFadeFactor+=0.05f;
			if (globalFadeFactor>1.0f) {
				[[Beacon shared] endSubBeaconWithName:@"Playing"];
				gv->nextState = INTRO_INIT;
				globalFadeFactor = 1.0f;
			}
			break;
			
			
		case GAME_INIT_SCORE:
			if (thrustSoundIsActive) {
				SoundEngine_StopEffect( sounds[kSound_Thrust], false);
				thrustSoundIsActive = false;
			}
			thrustSoundIsActive = false;


			[self displayTotalScore];
			screenTouched = false;
			gv->nextState = GAME_SCORE;			
		case GAME_SCORE:
			globalFadeFactor+=0.05f;
			if (globalFadeFactor>0.25f) {
				globalFadeFactor = 0.25f;				
			}
			if (screenTouched) {
				screenTouched = false;
				[self clearTotalScore];
				
				if (levelnum == TOTAL_NUMBER_OF_LEVELS) {

					// Put congratulations soud here
					
					gv->nextState = GAME_FINISHED;
				}
				else {
					gv->nextState = GAME_INIT_INFO;
				}
			}
			break;
		case GAME_INIT_INFO:			
			if (thrustSoundIsActive) {
				SoundEngine_StopEffect( sounds[kSound_Thrust], false);
				thrustSoundIsActive = false;
			}
			thrustSoundIsActive = false;


			endLevelTime = startLevelTime =  getCurrentTimeInMillis();


			gv->nextState = GAME_INFO;
			break;
		case GAME_INFO:
			globalFadeFactor+=0.05f;
			if (globalFadeFactor>1.0f) {
				globalFadeFactor = 1.0f;
				gv->nextState = GAME_INFO2;
			}
			break;
		case GAME_INFO2:
			
			main_end();
			levelnum=gv->levelNumber;
			main_init();	
			shipState.state = SHIP_STATE_APPEARING;

			
			[self createAssetTextures];

			UIImage *image;
			switch(levelnum%7) {
				case 0:
					image = [UIImage imageNamed:@"back5_park.JPG"];
					gv->backTexture = [[Texture2D alloc] initWithImage:image];
					break;
				case 1:
					image = [UIImage imageNamed:@"back_nebula.jpg"];
					gv->backTexture = [[Texture2D alloc] initWithImage:image];
					break;
				case 2:
					image = [UIImage imageNamed:@"back_park.JPG"];
					gv->backTexture = [[Texture2D alloc] initWithImage:image];
					break;
				case 3:
					image = [UIImage imageNamed:@"back2_park.JPG"];
					gv->backTexture = [[Texture2D alloc] initWithImage:image];
					break;
				case 4:
					image = [UIImage imageNamed:@"back3_park.JPG"];
					gv->backTexture = [[Texture2D alloc] initWithImage:image];
					break;
				case 5:
					image = [UIImage imageNamed:@"back4_park.JPG"];
					gv->backTexture = [[Texture2D alloc] initWithImage:image];
					break;
				case 6:
					image = [UIImage imageNamed:@"back_park.JPG"];
					gv->backTexture = [[Texture2D alloc] initWithImage:image];
					break;
			}
			
			[self displayLevelCredits];
			screenTouched = false;
			gv->nextState = GAME_INFO_WAIT; 
			break;
		case GAME_INFO_WAIT:
			globalFadeFactor-=0.01f;
			if (globalFadeFactor<0.25f) {
				globalFadeFactor = 0.25f;	
			}
			if (screenTouched || !levelCreditsVisible) {
				screenTouched = false;
				[self clearLevelCredits];
			
				gv->nextState = GAME_DEINIT_INFO;
			break;
			
		case GAME_DEINIT_INFO:			
			globalFadeFactor-=0.05f;
			if (globalFadeFactor<0.0f) {
				globalFadeFactor = 0.0f;
				gv->nextState = GAME_INIT;
			}
			break;
			
		case GAME_FINISHED:
			globalFadeFactor-=0.05f;
			if (globalFadeFactor<0.0f) {
				globalFadeFactor = 0.0f;			
			}
			finishedFadeFactor+=0.1f;
			if (finishedFadeFactor>1.0f) {
				finishedFadeFactor = 1.0f;
				screenTouched = false;
				gv->nextState = GAME_FINISHED_WAIT;
			}
			break;
			
			break;
		case GAME_FINISHED_WAIT:
			if (screenTouched) {
				screenTouched = false;
				gv->nextState = GAME_DEINIT;
			}
			break;
		}
	}
}

float distance3(float x1,float y1, float x2, float y2)
{
	return sqrt( (x1-x2)*(x1-x2) + (y1-y2)*(y1-y2));
}


-(void) dispatchFirstTouchAtPoint:(CGPoint*)touchPoint forEvent:(UIEvent *)event
{
	
	screenTouched = true;
/*	
	if (distance3(touchPoint->x, touchPoint->y, 0, 0)<32) {
//		gv->gameState = GAME_INTRO;
		frame_number = 0;
		levelnum = 1;

		gv->nextState = INTRO_INIT;
	}		
*/		
	if (touchPoint->y>160) // 240 -> 160
	{
		// LOGGING
		rightOnOff = 1;
		rightX = touchPoint->x;
		rightY = touchPoint->y;
		
		startPoint = origStartPoint = *touchPoint;	
		origStartDate = [[NSDate date] timeIntervalSince1970];
	}
	
	if (touchPoint->y<160) // 240 -> 160
	{
		// LOGGING
		leftOnOff = 1;
		leftX = touchPoint->x;
		leftY = touchPoint->y;
		
		if (ShipFuel>0) {
			shipThrust=32;
			if (!thrustSoundIsActive) {
				SoundEngine_StartEffect( sounds[kSound_Thrust] );
				thrustSoundIsActive = true;
			}
		}
	}
	
}

/*
 Checks to see which view, or views, the point is in and then sets the center of each moved view to the new postion.
 If views are directly on top of each other, they move together.
 */
-(void) dispatchTouchEvent:(UIView *)theView toPosition:(CGPoint*)position
{
	if (position->y>160-32 && position->y<=160+32) { // 240 -> 160
	
		// the left finger has come over to right side, abort thrust.
		shipThrust = 0;
		
		if (thrustSoundIsActive) {
			SoundEngine_StopEffect( sounds[kSound_Thrust], false);
			thrustSoundIsActive = false;
		}
		
	}
	else if (position->y>160+32) { // 240 -> 160
		
		// LOGGING
		rightOnOff = 1;
		rightX = position->x;
		rightY = position->y;
		
		// Manage rotation
		int speed = (-MAX(position->y-startPoint.y, 0)+MAX(startPoint.y-position->y, 0))*100/2; 
		startPoint = *position;	
		if (speed!=0) {
			if (shipState.state == SHIP_STATE_FLYING) {
				sa+=speed; 
				if (sa>16383) sa=sa-16383;
				else if (sa<0) sa=16383+sa;
			}
		}
		
	}
}


/*
 Checks to see which view, or views,  the point is in and then calls a method to perform the closing animation,
 which is to return the piece to its original size, as if it is being put down by the user.
 */
- (void) dispatchTouchEndEvent:(UIView *)theView toPosition:(CGPoint*)position
{   
	
	if (position->y>160) // 240 -> 160
	{
		// LOGGING
		rightOnOff = 0;
		
		// Manage fire
		NSTimeInterval now = [[NSDate date] timeIntervalSince1970];
		
		// Fire if:  pressed less than 0.1s, and position not moved significantly
		if ((now-origStartDate)<0.2 && distance(position->x,position->y, origStartPoint.x, origStartPoint.y)<10) {
			shipIsFiring = TRUE;
			
		}
		else {
			shipIsFiring = FALSE;

		}
		
	}
 	else {
		
		// LOGGING
		leftOnOff = 0;
		
		shipThrust = 0;

		if (thrustSoundIsActive) {
			SoundEngine_StopEffect( sounds[kSound_Thrust], false);
			thrustSoundIsActive = false;
		}

	}
	
}



int blast_frame_number = 0;


void resetFrameNumber() {
	blast_frame_number = frame_number;
}

extern int frame_number;

void blastf(float xPos, float yPos, float *x, float *y) {
	
	if (shipState.image == SHIP_IMAGE_EXPLODE_1of5)  // SHOULD BE CHANGED
		resetFrameNumber();
	
	if (frame_number-blast_frame_number > 50)
		return;
	
	float xx = xPos+*x; float yy=yPos+*y;
	float dx = xx-shipState.x-16; float dy = yy-shipState.y-16;
	float d = sqrt(dx*dx+dy*dy);
	
	//	xx+=15*125*dx/d*cos(d/75.0+frame_number/3.0f)/(125+frame_number*frame_number);
	//	yy+=15*125*dy/d*cos(d/75.0+frame_number/3.0f)/(125+frame_number*frame_number);
	
	xx-=10*55*dx*cos(d/25.0+(frame_number-blast_frame_number)/2.0f)/(d*(55+(frame_number-blast_frame_number)*(frame_number-blast_frame_number)));
	yy-=10*55*dy*cos(d/25.0+(frame_number-blast_frame_number)/2.0f)/(d*(55+(frame_number-blast_frame_number)*(frame_number-blast_frame_number)));
	
	// Expansion
	xx+=10*55*dx/(d*(55+(frame_number-blast_frame_number)*(frame_number-blast_frame_number)));
	yy+=10*55*dy/(d*(55+(frame_number-blast_frame_number)*(frame_number-blast_frame_number)));
	
	*x = xx-xPos;
	*y = yy-yPos;
}

void blastf3(float xPos, float yPos, float *x, float *y) {
	
	if (shipState.image == SHIP_IMAGE_EXPLODE_1of5)  // SHOULD BE CHANGED
		resetFrameNumber();
	
	if ((frame_number-blast_frame_number) > 50)
		return;
	
	float xx = *x; float yy=*y;
	float dx = xx-shipState.x-16; float dy = yy-shipState.y-16;
	float d = sqrt(dx*dx+dy*dy);
	
	//	xx+=15*125*dx/d*cos(d/75.0+frame_number/3.0f)/(125+frame_number*frame_number);
	//	yy+=15*125*dy/d*cos(d/75.0+frame_number/3.0f)/(125+frame_number*frame_number);
	
	xx-=10*55*dx*cos(d/25.0+(frame_number-blast_frame_number)/2.0f)/(d*(55+(frame_number-blast_frame_number)*(frame_number-blast_frame_number)));
	yy-=10*55*dy*cos(d/25.0+(frame_number-blast_frame_number)/2.0f)/(d*(55+(frame_number-blast_frame_number)*(frame_number-blast_frame_number)));
	
	// Expansion
	xx+=10*55*dx/(d*(55+(frame_number-blast_frame_number)*(frame_number-blast_frame_number)));
	yy+=10*55*dy/(d*(55+(frame_number-blast_frame_number)*(frame_number-blast_frame_number)));
	
	*x = xx;
	*y = yy;
}

void blastfItems(float xPos, float yPos, float *x, float *y) {
		
	float xx = *x; float yy=*y;
	float dx = xx-xPos-16; float dy = yy-yPos-16;
	float d = sqrt(dx*dx+dy*dy);
		
	xx-=2.0f*dx*cos(d/25.0+(frame_number-blast_frame_number)/3.0f+xPos+yPos)/(d+1);
	yy-=2.0f*dy*cos(d/25.0+(frame_number-blast_frame_number)/3.0f+xPos+yPos)/(d+1);
		
	*x = xx;
	*y = yy;
}

void blastfWater(float xPos, float yPos, float *x, float *y) {
	
	blastfItems(xPos, yPos, x,y);
	{
		float xx = *x; float yy=*y;
		float dx = xx-shipState.x-16; float dy = yy-shipState.y-16;
		
		
		xx-=3.0f*cos(dx/25.0+(frame_number-blast_frame_number)/4.0f);
		yy-=3.0f*cos(dy/25.0+(frame_number-blast_frame_number)/4.0f);
	*x = xx;
	*y = yy;
	}
}

void blastfWater2(float xPos, float yPos, float *x, float *y) {
	
	{
		float xx = *x; float yy=*y;
		float dx = xx-shipState.x-16; float dy = yy-shipState.y-16;
		
		xx-=1.5f*cos(dx/25.0+(frame_number-blast_frame_number)/4.0f);
		yy-=1.5f*cos(dy/25.0+(frame_number-blast_frame_number)/4.0f);
		*x = xx;
		*y = yy;
	}
}

void blastfi(float xPos, float yPos, float *x, float *y) {
	
	
	if (shipState.thrust == SHIP_IMAGE_EXPLODE_1of5)
		resetFrameNumber();
	
	if ((frame_number-blast_frame_number) > 50)
		return;

	int frame_number2 = (frame_number-blast_frame_number) - 0;
	if (frame_number2 < 0 )
		return;
	
	float xx = xPos+*x; float yy=yPos+*y;
	float dx = xx-shipState.x-16; float dy = yy-shipState.y-16;
	float d = sqrt(dx*dx+dy*dy);
	
	//	xx+=15*125*dx/d*cos(d/75.0+frame_number/3.0f)/(125+frame_number*frame_number);
	//	yy+=15*125*dy/d*cos(d/75.0+frame_number/3.0f)/(125+frame_number*frame_number);
	
	xx-=10*55*dx*cos(d/50.0+frame_number2/2.0f)/(d*(55+frame_number2*frame_number2));
	yy-=10*55*dy*cos(d/50.0+frame_number2/2.0f)/(d*(55+frame_number2*frame_number2));
	
	// Expansion
	xx-=5*55*dx/(d*(55+frame_number2*frame_number2));
	yy-=5*55*dy/(d*(55+frame_number2*frame_number2));
	
	*x = xx-xPos;
	*y = yy-yPos;
}


void calculateAssetCoordinates(GLfloat* assetTexcoords, int asset) {
	int xcoord = asset%32;
	int ycoord = asset/32;
	
	const float one = 1.0f-1.0f/64.0f;
	const float zro = 0.0f+1.0f/64.0f;
	
	GLfloat tmpAssetTexcoords[] = {
		(xcoord+zro)/32.0f, (ycoord+zro)/16.0f,
		(xcoord+one)/32.0f, (ycoord+zro)/16.0f,
		(xcoord+zro)/32.0f, (ycoord+one)/16.0f,
		(xcoord+zro)/32.0f, (ycoord+one)/16.0f,
		(xcoord+one)/32.0f, (ycoord+one)/16.0f,
		(xcoord+one)/32.0f, (ycoord+zro)/16.0f
	};
	memcpy((void*)assetTexcoords, (void*)tmpAssetTexcoords, sizeof(GLfloat)*12);
}

double lastControlTime = -1;


-(void) runControlLogic {

	if ( gv->state == GAME) {
		control();	
	}
	[self viewLogic];
}


// Updates the OpenGL view when the timer fires
- (void)drawView
{
			
	//outputShipInfo();
	[self runControlLogic ];
		
	glMatrixMode(GL_MODELVIEW);
	
	// Clears the view with black
	glClearColor(0.0f, 0.0f, 0.0f, 1.0f);
	glClear(GL_COLOR_BUFFER_BIT);
	glEnable(GL_TEXTURE_2D);
	
	glEnableClientState(GL_TEXTURE_COORD_ARRAY);
	glEnableClientState(GL_VERTEX_ARRAY);

	
	glBlendFunc(GL_DST_ALPHA, GL_ONE_MINUS_SRC_ALPHA);				// (s*a+d*(1-a)
	
	
	glPushMatrix();
	
	glRotatef(gv->xRot, 1.0f, 0.0f, 0.0f);
	glRotatef(gv->yRot, 0.0f, 1.0f, 0.0f);
	
	// scroll calculations
	gv->xx = -shipState.x-16+240;
	gv->yy = -shipState.y-16+180; // 160 is middle, 240 is further down
	if (gv->xx>0) gv->xx=0;
	if (gv->xx<-(640-480)) gv->xx=-(640-480);
	if (gv->yy>0) gv->yy=0;
	if (gv->yy<-(1408-320)) gv->yy=-(1408-320);

	[self drawViewObjects];
	
	[self drawViewMessages];
}

- (void)drawViewObjects {

	const GLfloat blockVertices[] = {
		(0	),	(0),	
		(0+32),	(0),	
		(0),	(0+32),	
		(0+32),	(0+32)	
	};		
	
	GLubyte* p32x32 = malloc(32*32*4);	
		
	// Load dynamic backgrounds 
	if (dynamicBlocksChanged == 1) {
		for (int y=216; y<216+N_DESTROYEABLE; y++) {
			glBindTexture(GL_TEXTURE_2D, gv->spriteTexture[TEXTURE_BACK+y]);		
			for(int n=0, m=0; n<32*32; n++,m+=4) {
				int c=block[y][n]*3;
				p32x32[m  ] = realpal[c+0]*4;
				p32x32[m+1] = realpal[c+1]*4;
				p32x32[m+2] = realpal[c+2]*4;
				p32x32[m+3] = (c!=0 && (c<176 || c>190) )*255;

			}
			glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA, 32, 32, 0, GL_RGBA, GL_UNSIGNED_BYTE, p32x32);
			glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
			glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE);
			glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);
			}		
		dynamicBlocksChanged = 0;
	}
	free(p32x32);

	srand(0);
	
	// shadows movement based on tilt
	float tx = gv->accelY*48; //(16*sin(frame_number/100.0));
	float ty = gv->accelX*48+18;//(16*cos(frame_number/100.0));
	if (tx<-16) tx=-16;
	if (tx>16) tx=16;
	if (ty<-16) ty=-16;
	if (ty>16) ty=16;
	
	/*
	if ((gv->state>>8) == GAME_INTRO) {
		tx = 8;
		ty = 8;
	}
	*/

	glBindTexture(GL_TEXTURE_2D, gv->spriteTexture[TEXTURE_ASSETS]);
	glColor4f(1.0f, 1.0f, 1.0f, 1.0f);
	glBlendFunc(GL_ONE, GL_ZERO);
	
	GLfloat allBackBlockVertices[sizeof(GLfloat)*12*45*21]; 
	GLfloat allBackAssetTexcoords[sizeof(GLfloat)*12*45*21]; 
	GLfloat allForegroundBlockVertices[sizeof(GLfloat)*12*45*21]; 
	GLfloat allForegroundAssetTexcoords[sizeof(GLfloat)*12*45*21]; 

	const GLfloat spriteTexcoords[] = {
		0.0000, 0.0000,
		0.9999, 0.0000,
		0.0000, 0.9999,
		0.9999, 0.9999,
	};
	
	
	// Calculate flat background
	int numBackgroundRectangles = 0;
	for (int y = 0; y<44; y++) {
		for (int x = 0; x<20; x++) {
			float xPos = x*32.0f;
			float yPos = y*32.0f;
			int i = rand()%2+((rand()%8)<7);
			
			if (((xPos+gv->xx/2.0f-32.0f)>=-32.0f && (xPos+gv->xx/2.0f-32.0f)<=480) && ((yPos+gv->yy/2.0f)>=-32.0f && (yPos+gv->yy/2.0f)<=320)) // Perform clipping
			{
				
				calculateAssetCoordinates((void*)allBackAssetTexcoords+sizeof(GLfloat)*12*numBackgroundRectangles, 45-9+i);
				
				GLfloat blockVertices[] = {
					(xPos	),	(yPos),	
					(xPos+32),	(yPos),	
					(xPos),		(yPos+32),	
					(xPos),		(yPos+32),	
					(xPos+32),	(yPos+32),	
					(xPos+32),	(yPos)
				};	
				memcpy((void*)allBackBlockVertices+sizeof(GLfloat)*12*numBackgroundRectangles, (void*)blockVertices, sizeof(GLfloat)*12);
			
				numBackgroundRectangles++;

			}
		}
	}
			
	// Calculate foreground/shadow
	int numForegroundRectangles = 0;
	for (int y = 0; y<44; y++) {
		for (int x = 0; x<20; x++) {
			float xPos = x*32.0f;
			float yPos = y*32.0f;
			int i = rand()%2+((rand()%8)<7);
			
			// Calc rect; note that the shadows can move +-32

			if ((xPos+gv->xx>=-32.0f && xPos+gv->xx<=480) && (yPos+gv->yy>=-64.0f && yPos+gv->yy<=320+32.0)) // Perform clipping
			{

//				int asset =  216+(x+y*10)%N_DESTROYEABLE;//%
				int asset = level[y*20+x];

				GLfloat blockVertices[] = {
					(xPos	),	(yPos),	
					(xPos+32),	(yPos),	
					(xPos),		(yPos+32),	
					(xPos),		(yPos+32),	
					(xPos+32),	(yPos+32),	
					(xPos+32),	(yPos)
				};	
				
				blastf3(xPos, yPos, blockVertices+0, blockVertices+1);
				blastf3(xPos, yPos, blockVertices+2, blockVertices+3);
				blastf3(xPos, yPos, blockVertices+4, blockVertices+5);
				blastf3(xPos, yPos, blockVertices+6, blockVertices+7);
				blastf3(xPos, yPos, blockVertices+8, blockVertices+9);
				blastf3(xPos, yPos, blockVertices+10, blockVertices+11);
 
				switch (objects[y*20+x]) {
					case E_BONUS:
					case E_BONUS1:
					case E_BONUS2:
					case E_BONUS3:
					case E_BONUS4:
					case E_BONUS5:
					case E_BONUS6:
					case E_BONUS7:
					case E_BONUS8:
					case E_XTIME:
					case E_XLIFE:
					case E_XFUEL:
					case E_KEY:
					case E_STOP:
						
						blastfItems(xPos, yPos, blockVertices+0, blockVertices+1);
						blastfItems(xPos, yPos, blockVertices+2, blockVertices+3);
						blastfItems(xPos, yPos, blockVertices+4, blockVertices+5);
						blastfItems(xPos, yPos, blockVertices+6, blockVertices+7);
						blastfItems(xPos, yPos, blockVertices+8, blockVertices+9);
						blastfItems(xPos, yPos, blockVertices+10, blockVertices+11);					
						break; 

					case E_WBONUS:
					case E_WBONUS1:
					case E_WBONUS2:
					case E_WBONUS3:
					case E_WBONUS4:
					case E_WFUEL:					
					case E_WKEY:
//					case E_WATER:
//					case E_TOP_WATER:
						

						blastfWater(xPos, yPos, blockVertices+0, blockVertices+1);
						blastfWater(xPos, yPos, blockVertices+2, blockVertices+3);
						blastfWater(xPos, yPos, blockVertices+4, blockVertices+5);
						blastfWater(xPos, yPos, blockVertices+6, blockVertices+7);
						blastfWater(xPos, yPos, blockVertices+8, blockVertices+9);
						blastfWater(xPos, yPos, blockVertices+10, blockVertices+11);					
 
//						asset = 45-9+i;
						break; 
				}	
				
				memcpy((void*)allForegroundBlockVertices+sizeof(GLfloat)*12*numForegroundRectangles, (void*)blockVertices, sizeof(GLfloat)*12);

				calculateAssetCoordinates((void*)allForegroundAssetTexcoords+sizeof(GLfloat)*12*numForegroundRectangles, asset);

				numForegroundRectangles++;
				
			}
		}
	}

	glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);				

/*	glColor4f(1.0f,1.0f,1.0f,1.0f);				
	// Render background
	glPushMatrix();
	glTexCoordPointer(2, GL_FLOAT, 0, allBackAssetTexcoords);
	glVertexPointer(2, GL_FLOAT, 0, allBackBlockVertices);
	glTranslatef(gv->xx/2.0f-32.0f,gv->yy/2.0f-32.0f,0.0f);
	glDrawArrays(GL_TRIANGLES, 0, 6*numBackgroundRectangles);
	glPopMatrix();
*/
	float foregroundTone[3];// = {1.0f, 0.8f, 0.6f};
	float backgroundTone[3];// = {1.0f, 0.5f, 0.14f};
	switch(levelnum%7) {
		case 0:
		{	// Nebula
			float _foregroundTone[3] = {1.0f, 0.64f, 0.2f};
			float _backgroundTone[3] = {0.9f, 0.7f, 1.0f};
			memcpy(foregroundTone, _foregroundTone, sizeof(float)*3);
			memcpy(backgroundTone, _backgroundTone, sizeof(float)*3);
			break;
		}
		case 1:
		{	// Brown
			float _foregroundTone[3] = {1.0f, 0.8f, 0.6f};
			float _backgroundTone[3] = {1.0f, 0.5f, 0.14f};
			memcpy(foregroundTone, _foregroundTone, sizeof(float)*3);
			memcpy(backgroundTone, _backgroundTone, sizeof(float)*3);
			break;
		}
		case 2:
		{	// Green 85-107-47
			float _foregroundTone[3] = {0.8f, 1.0f, 0.43f};
			float _backgroundTone[3] = {0.9f, 1.0f, 0.60f};
			memcpy(foregroundTone, _foregroundTone, sizeof(float)*3);
			memcpy(backgroundTone, _backgroundTone, sizeof(float)*3);
			break;
		}
		case 3:
		{	// Blueish 0-191-255
			float _foregroundTone[3] = {0.8f, 0.8f, 1.00f}; 
			float _backgroundTone[3] = {0.8f, 0.9f, 1.0f};
			memcpy(foregroundTone, _foregroundTone, sizeof(float)*3);
			memcpy(backgroundTone, _backgroundTone, sizeof(float)*3);
			break;
		}
		case 4:
		{	// "back3_park.JPG"
			float _foregroundTone[3] = {1.0f, 0.8f, 0.4f};
			float _backgroundTone[3] = {1.0f, 0.5f, 0.14f};
			memcpy(foregroundTone, _foregroundTone, sizeof(float)*3);
			memcpy(backgroundTone, _backgroundTone, sizeof(float)*3);
			break;
		}
		case 5:
		{	// "back4_park.JPG"
			float _foregroundTone[3] = {1.0f, 0.8f, 0.8f};
			float _backgroundTone[3] = {0.7f, 1.0f, 0.7f};
			memcpy(foregroundTone, _foregroundTone, sizeof(float)*3);
			memcpy(backgroundTone, _backgroundTone, sizeof(float)*3);
			break;
		}
		case 6:
		{	// Green 85-107-47
			float _foregroundTone[3] = {0.8f, 1.0f, 0.43f};
			float _backgroundTone[3] = {0.9f, 1.0f, 0.60f};
			memcpy(foregroundTone, _foregroundTone, sizeof(float)*3);
			memcpy(backgroundTone, _backgroundTone, sizeof(float)*3);
			break;
		}
	}
	// Translate 
	glTranslatef(gv->xx, gv->yy, 0.0f);	
	
	// Render background
	glPushMatrix();
	// 139-69-19
//	glColor4f(1.0f,1.0f,1.0f,0.2f);				
	glColor4f(backgroundTone[0], backgroundTone[1], backgroundTone[2],1.0f); // brown		
	
	float s = 1.25f;//640.f/512.f;
	
	glScalef(s, s, 1.0f);
	[gv->backTexture drawAtPoint:CGPointMake(240.0f-gv->xx/2.0f+tx/2, 160.f+32.0f-gv->yy/2.0f+ty/2)]; // 512x765
	glPopMatrix();
	
	// Set texture
	glBindTexture(GL_TEXTURE_2D, gv->spriteTexture[TEXTURE_ASSETS]);
	
	// Render game foreground objects
	{
		glTexCoordPointer(2, GL_FLOAT, 0, allForegroundAssetTexcoords);
		glVertexPointer(2, GL_FLOAT, 0, allForegroundBlockVertices);	
		
		// Render game shadow
		glPushMatrix();
		glTranslatef(-tx,-ty,0.0f);
		glColor4f(0.0f, 0.0f, 0.0f, 0.45f);
		glBlendFunc(GL_ZERO, GL_ONE_MINUS_SRC_ALPHA);	
		glDrawArrays(GL_TRIANGLES, 0, 6*numForegroundRectangles);
		glPopMatrix();
		
		
		
	}
	
	// Draw ship
	if (shipState.active) {
		
		glBindTexture(GL_TEXTURE_2D, gv->spriteTexture[TEXTURE_SHIP+shipState.image]); // add + någonting för gasande
		
		// Calculate a new ship vertex
		{
			GLfloat shipBlockVertices[] = {
				(0	),	(0),	
				(0+32),	(0),	
				(0),	(0+32),	
				(0+32),	(0+32)	
			};
			blastf(shipState.x, shipState.y, shipBlockVertices+0, shipBlockVertices+1);
			blastf(shipState.x, shipState.y, shipBlockVertices+2, shipBlockVertices+3);
			blastf(shipState.x, shipState.y, shipBlockVertices+4, shipBlockVertices+5);
			blastf(shipState.x, shipState.y, shipBlockVertices+6, shipBlockVertices+7);		
			
			if (shipFlagInWater) { // in water
				blastfWater2(shipState.x, shipState.y, shipBlockVertices+0, shipBlockVertices+1);
				blastfWater2(shipState.x, shipState.y, shipBlockVertices+2, shipBlockVertices+3);
				blastfWater2(shipState.x, shipState.y, shipBlockVertices+4, shipBlockVertices+5);
				blastfWater2(shipState.x, shipState.y, shipBlockVertices+6, shipBlockVertices+7);		
			}
			
			glVertexPointer(2, GL_FLOAT, 0, shipBlockVertices);
		}
		
		glTexCoordPointer(2, GL_FLOAT, 0, spriteTexcoords);
		
		// Rotate ship shadow
		glPushMatrix();
		glTranslatef((shipState.x),(shipState.y), 0.0f);
		glTranslatef(16.0f, 16.0f, 0);
		glRotatef(-sa/512.0f*180.0f/16.0f, 0, 0, 1.0f);
		glTranslatef(-16.0f, -16.0f, 0);
		glTranslatef(-tx/2.0f,-ty/2.0f,0.0f);
		glColor4f(0.0f, 0.0f, 0.0f, 0.45f);
		glBlendFunc(GL_ZERO, GL_ONE_MINUS_SRC_ALPHA);	
		glDrawArrays(GL_TRIANGLE_STRIP, 0, 4);
		glPopMatrix();
		
		glColor4f((foregroundTone[0]+1.0f)/2.0f, (foregroundTone[1]+1.0f)/2.0f, (foregroundTone[2]+1.0f)/2.0f,1.0f); 

		// Draw ship
		glPushMatrix();
		glTranslatef((shipState.x),(shipState.y), 0.0f);
		glTranslatef(16.0f, 16.0f, 0);
		glRotatef(-sa/512.0f*180.0f/16.0f, 0, 0, 1.0f);
		glTranslatef(-16.0f, -16.0f, 0);
		glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);	
		glDrawArrays(GL_TRIANGLE_STRIP, 0, 4);	
		glPopMatrix();
	}
	
	// Draw game foreground
	glColor4f(foregroundTone[0], foregroundTone[1], foregroundTone[2],1.0f); 
	glBindTexture(GL_TEXTURE_2D, gv->spriteTexture[TEXTURE_ASSETS]);
	glTexCoordPointer(2, GL_FLOAT, 0, allForegroundAssetTexcoords);
	glVertexPointer(2, GL_FLOAT, 0, allForegroundBlockVertices);	
	glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);	
	glDrawArrays(GL_TRIANGLES, 0, 6*numForegroundRectangles);
	
	glBindTexture(GL_TEXTURE_2D, gv->spriteTexture[TEXTURE_ASSETS]);
	
	// Draw water etc.. 
	glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);				
	for (int y = 0; y<44; y++) {
		for (int x = 0; x<20; x++) {
			float xPos = x*32.0f;
			float yPos = y*32.0f;
			if ((xPos+gv->xx>=-32.0f && xPos+gv->xx<=480) && (yPos+gv->yy>=-32.0f && yPos+gv->yy<=320)) // Perform clipping
			{
				switch (objects[y*20+x]) {
					case E_WATER:
					case E_TOP_WATER:
					case E_WKEY:
					case E_WFUEL:	
					case E_WBONUS:
					case E_WBONUS1:
					case E_WBONUS2:
					case E_WBONUS3:
					case E_WBONUS4:
					case L_RED_DOOR:
					case E_STOP:
						
						glPushMatrix();
						glTranslatef(xPos, yPos, 0);

						if (objects[y*20+x] == L_RED_DOOR) {
							glColor4f(foregroundTone[0], foregroundTone[1], foregroundTone[2], 0.85+0.15*sin(frame_number/5.0));
						} 
						else if (objects[y*20+x] == E_STOP) {
							glColor4f(foregroundTone[0], foregroundTone[1], foregroundTone[2], 0.90+0.15*sin(frame_number/2.0));
						}
						else {
							glColor4f(foregroundTone[0], foregroundTone[1], foregroundTone[2], 1.0f);
						}
						int asset = level[y*20+x];

//						if (level[y*20+x+levelStart]>=216)
//							glBindTexture(GL_TEXTURE_2D, gv->spriteTexture[TEXTURE_BACK+216]);
							
						glTexCoordPointer(2, GL_FLOAT, 0, spriteTexcoords);						
						
						GLfloat box[] = {
							(0	),	(0),	
							(0+32),	(0),	
							(0),	(0+32),	
							(0+32),	(0+32)	
						};
						blastf(xPos, yPos, box+0, box+1);
						blastf(xPos, yPos, box+2, box+3);
						blastf(xPos, yPos, box+4, box+5);
						blastf(xPos, yPos, box+6, box+7);
						
						glVertexPointer(2, GL_FLOAT, 0, box);

						switch (objects[y*20+x]) {
							case E_WKEY:
							case E_WFUEL:	
							case E_WBONUS:
							case E_WBONUS1:
							case E_WBONUS2:
							case E_WBONUS3:
							case E_WBONUS4:
								
								asset = 204;
								break;
						}
						
						

						glBindTexture(GL_TEXTURE_2D, gv->spriteTexture[TEXTURE_BACK+asset]);
						
						// Draw foreground
						glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);	
						glDrawArrays(GL_TRIANGLE_STRIP, 0, 4);
						
						
						glPopMatrix();
						break;
				}

			}
		}
	}
	
	glColor4f(foregroundTone[0], foregroundTone[1], foregroundTone[2],1.0f); 
	
	// Draw bullet
	glPushMatrix();
	glBindTexture(GL_TEXTURE_2D, gv->spriteTexture[TEXTURE_BULLET]); 
	for (int n = 0; n<N_BULLETS; n++) {
		if (bullet[n].active == TRUE) {
			const GLfloat rectangleVertices[] = {
				((bullet[n].x>>STEP)-1),((bullet[n].y>>STEP)-1),	
				((bullet[n].x>>STEP)+3),((bullet[n].y>>STEP)-1),	
				((bullet[n].x>>STEP)+3),((bullet[n].y>>STEP)+3),	
				((bullet[n].x>>STEP)-1),((bullet[n].y>>STEP)+3)	
			};
			glVertexPointer(2, GL_FLOAT, 0, rectangleVertices);
			glTexCoordPointer(2, GL_FLOAT, 0, spriteTexcoords);
			glDrawArrays(GL_TRIANGLE_STRIP, 0, 4);
		}
		
	}	
	glPopMatrix();
	
	glColor4f(foregroundTone[0], foregroundTone[1], foregroundTone[2],1.0f); 
	glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);				

	glPushMatrix();
	// Draw actions
	for (int n = 0; n<N_ACTION; n++) {
		if (action[n].state == TRUE) {
			glTranslatef(action[n].x-16,action[n].y-16, 0.0f);
			glBindTexture(GL_TEXTURE_2D, gv->spriteTexture[TEXTURE_BACK+action[n].frame-1]); // add + någonting för gasande
			glVertexPointer(2, GL_FLOAT, 0, blockVertices);
			glTexCoordPointer(2, GL_FLOAT, 0, spriteTexcoords);
			glDrawArrays(GL_TRIANGLE_STRIP, 0, 4);			
			
		}
	}
	glPopMatrix();
}

- (void) drawViewMessages 
{	
	// Draw message
	if (gameMessageVisible) {
		
		float f = 20.0f/(20+frame_number);
		float cs = cos(frame_number/4.0);
		float sn = sin(frame_number/4.0);
		if (frame_number - frameNumberAtMessageStart< 50) {
			float x = 240-gv->xx, y = 120-gv->yy;
			glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
			
			cs*=cs; sn*=sn;
			glColor4f(0.1f,0.1f,0.1f,1.00f);	
			[textTexture drawAtPoint:CGPointMake(x+12+15*cs*f, y+10+20*sn*f)];
			[textTexture drawAtPoint:CGPointMake(x+15+5*cs*f, y+10+10*sn*f)];
			glColor4f(0.2f,0.2f,0.2f,1.00f);	
			[textTexture drawAtPoint:CGPointMake(x+5-10*cs*f, y-15+15*sn*f)];
			[textTexture drawAtPoint:CGPointMake(x+10-20*cs*f, y- 10+5*sn*f)];
			glColor4f(1.0f,1.0f,1.0f,1.0f);
			[textTexture drawAtPoint:CGPointMake(x+f*5*cs, y+f*5*sn)];
			glColor4f(1.0f,1.0f,1.0f,1.0f);
		}
		else {
			gameMessageVisible = false;
		}
	}		
	
	if (gv->state == GAME) {
		[self updateScoreTextures];
	}
	
	glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
	int dx[5]={-1, 0, +1, 0, 0}, dy[5]={0, -1, 0, +1, 0}; GLfloat col[5][3]={{0,0,0},{0,0,0},{0,0,0},{0,0,0},{1.0f,1.0f,1.0f}};
	for (int i=0; i<5; i++) {
		glColor4f(col[i][0],col[i][1],col[i][2],1.0f);				
		[fuelTexture drawAtPoint:CGPointMake(16*9/2-gv->xx		+dx[i],5+10-gv->yy			+dy[i])];
		[timeTexture drawAtPoint:CGPointMake(16*9/2-gv->xx		+dx[i],5+18+10-gv->yy		+dy[i])];	
		[scoreTexture drawAtPoint:CGPointMake(240-gv->xx			+dx[i], 18-gv->yy		+dy[i])];
		[highScoreTexture drawAtPoint:CGPointMake(240-gv->xx			+dx[i], 18+24-gv->yy+dy[i])];
		[lifeTexture drawAtPoint:CGPointMake(480-16*9/2+4-gv->xx	+dx[i], 5+10-gv->yy		+dy[i])];
	}
	
	glColor4f(1.0f,1.0f,1.0f,1.0f);
	
	// Fade to black
	if (globalFadeFactor!=0.0f)	{	
		glPushMatrix();
		const GLfloat screenVertices[] = {
			(0	),	(0),	
			(0+480),(0),	
			(0),	(0+320),	
			(0+480),	(0+320)	
		};
		glDisable(GL_TEXTURE_2D);
		glColor4f(0.0f, 0.0f, 0.0f, globalFadeFactor);
		glVertexPointer(2, GL_FLOAT, 0, screenVertices);
		glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);	
		glTranslatef(-gv->xx,-gv->yy, 0.0f);	
		glDrawArrays(GL_TRIANGLE_STRIP, 0, 4);
		glEnable(GL_TEXTURE_2D);
		glPopMatrix();
	}		
	
	// Draw credits
	if (levelCreditsVisible) {	
		
		float f = 10.0f/(20+(frame_number-frameNumberAtLevelCreditStart));
		float cs = cos(frame_number/4.0);
		float sn = sin(frame_number/4.0);
		if (frame_number - frameNumberAtLevelCreditStart< 150) {
			
			float x = 240-gv->xx, y = 160-gv->yy;
			/*
			glColor4f(1.0f,1.0f,1.0f,globalFadeFactor);
			glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
			[gv->logoTexture drawAtPoint:CGPointMake(240-gv->xx, 320-32-gv->yy)];
			*/
			
			cs*=cs; sn*=sn;
			glColor4f(1.0f/2.0f, 1.0f/2.0f, 1.0f/2.0f,0.25f);
			[levelCreditsTexture drawAtPoint:CGPointMake(x-5+15*cs*f,y-8-6*sn*f)];
			[levelCreditsTexture drawAtPoint:CGPointMake(x+6-3*cs*f, y-7-13*sn*f)];
			[levelCreditsTexture drawAtPoint:CGPointMake(x-7-15*cs*f,y+6+5*sn*f)];
			[levelCreditsTexture drawAtPoint:CGPointMake(x+8+3*cs*f, y+5+15*sn*f)];
			glColor4f(1.0f,1.0f,1.0f,1.0f);				
			[levelCreditsTexture drawAtPoint:CGPointMake(x, y)];

		}
		else {
			[self clearLevelCredits];
		}
	}		
	
	// Draw final score
	if (totalScoreVisible) {	
				
		float f = 20.0f/(20+(frame_number-frameNumberAtMessageStart));
		float cs = cos(frame_number/4.0);
		float sn = sin(frame_number/4.0);
		//if (frame_number - frameNumberAtMessageStart< 150) 
		{
			glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
			float x = 240-gv->xx, y = 160+64-gv->yy;
			
//			glColor4f(1.0f,1.0f,1.0f,1.0f);				
//			[gv->logoTexture drawAtPoint:CGPointMake(240-gv->xx, 320-64-gv->yy)];
			
			
			cs*=cs; sn*=sn;
			glColor4f(0.9f/2.0f, 0.8f/2.0f, 0.6f/2.0f,0.25f);
			[totalScoreTexture drawAtPoint:CGPointMake(x-1,y-1)];
			glColor4f(0.9f,0.8f,0.6f,1.0f);				
			[totalScoreTexture drawAtPoint:CGPointMake(x, y)];
			
		}
/*		else {
			[self clearTotalScore];
		}
*/
	}		

	// Final message
	if (gv->state == GAME_FINISHED_WAIT || gv->state == GAME_FINISHED) {
		
		float cs = cos(frame_number/8.0);
		float sn = sin(frame_number/8.0);
		float f = 0.3f;
		glPushMatrix();
		glTranslatef(-gv->xx+240, -gv->yy+32,0);
		float stretch = 1.0f+frame_number/200.f; if (stretch>1.25f) stretch = 1.25f;
		glScalef(stretch, stretch, 1.0f);
		glTranslatef(+gv->xx-240, +gv->yy-32,0);
		glColor4f(0.6f,0.6f,0.9f,0.5f);	
		[gravityWarsTexture drawAtPoint:CGPointMake(240-gv->xx-5.0*cs*f, 64-gv->yy+7.5*sn*f)];
		[gravityWarsTexture drawAtPoint:CGPointMake(240-gv->xx-6.0*sn*f, 64-gv->yy+5.5*cs*f)];
		glColor4f(0.9f,0.9f,1.0f,0.8f);
		[gravityWarsTexture drawAtPoint:CGPointMake(240-gv->xx, 64-gv->yy)];
		glPopMatrix(); 
		
		glColor4f(0.9f,0.7f,0.7f,0.5f*(finishedFadeFactor));	
		[gameFinishedTexture drawAtPoint:CGPointMake(240-gv->xx-1, 250*(1.0f-finishedFadeFactor)+220-gv->yy+1)];
		[gameFinishedTexture drawAtPoint:CGPointMake(240-gv->xx-0, 250*(1.0f-finishedFadeFactor)+220-gv->yy+0)];
		glColor4f(1.0f,0.9f,0.6f,0.8f*(finishedFadeFactor));
		[gameFinishedTexture drawAtPoint:CGPointMake(240-gv->xx, 250*(1.0f-finishedFadeFactor)+220-gv->yy)];
		
		float p = 1.0f;
		p = 0.75+0.25*sin(frame_number*0.5)*sin(frame_number*0.25)*finishedFadeFactor;
		
		CGPoint blogPosition;
		blogPosition.x = 240;
		blogPosition.y = 330;
		
		glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
		glColor4f(0.3f,0.3f,0.9f,1.0f*p);	
		[blogTexture drawAtPoint:CGPointMake(blogPosition.x-gv->xx-1, 250*(1.0f-finishedFadeFactor)+blogPosition.y-24-gv->yy-1)];
		[blogTexture drawAtPoint:CGPointMake(blogPosition.x-gv->xx-0, 250*(1.0f-finishedFadeFactor)+blogPosition.y-24-gv->yy+0)];
		glColor4f(0.4f,0.4f,1.0f,1.0f*p);
		[blogTexture drawAtPoint:CGPointMake(blogPosition.x-gv->xx, 250*(1.0f-finishedFadeFactor)+blogPosition.y-24-gv->yy)];
	}	
	
	//	xRot+=0.02; yRot-=0.012;
	//	scans[SCANCODE_CURSORBLOCKLEFT] = (int)(-xRot/3.0);//(rand()>0.9);
	
}


-(void) requestScore:(NSInteger)level
{
	NSLog(@"Requesting scores...");
	
	ScoreServerRequest *request = [[ScoreServerRequest alloc] initWithGameName:@"GravityWars" delegate:self];
	
	tQueryFlags flags = kQueryFlagIgnore;
	
	// request All time Scores: the only supported version as of v0.2
	// request best 15 scores (limit:15, offset:0)
	NSString* cat = [NSString stringWithFormat:@"level_%d", level];
	[request requestScores:kQueryAllTime limit:1 offset:0 flags:flags category:cat];

	// Release. It won't be freed from memory until the connection fails or suceeds
	[request release];
}

-(void) postScore:(int)level totalTime:(int)time
{
	NSLog(@"Posting Score");
	
	// Create que "post" object for the game "DemoGame 3"
	// The gameKey is the secret key that is generated when you create you game in cocos live.
	// This secret key is used to prevent spoofing the high scores
	ScoreServerPost *server = [[ScoreServerPost alloc] initWithGameName:@"GravityWars" gameKey:@"f23cca53d7eca0f0e41880e66ef5c09d" delegate:self];
	
	NSMutableDictionary *dict = [NSMutableDictionary dictionaryWithCapacity:3];
	
	// Name at random
	
	// cc_ files are predefined cocoslive fields.
	// set score
	[dict setObject: [NSNumber numberWithInt: time ] forKey:@"cc_score"];
	
	// set playername
	[dict setObject:@"Anonymous" forKey:@"cc_playername"];

	NSString* cat = [NSString stringWithFormat:@"level_%d", level];
	
	[dict setObject:cat forKey:@"cc_category"];
	
	NSLog(@"Sending data: %@", dict);
	
	// You can add a new score to the database
	//	[server sendScore:dict];
	
	// Or you can "update" your score instead of adding a new one.
	// The score will be udpated only if it is better than the previous one
	// 
	// "update score" is the recommend way since it can be treated like a profile
	// and it has some benefits like: "tell me if my score was beaten", etc.
	// It also supports "world ranking". eg: "What's my ranking ?"
	[server updateScore:dict];
	
	// Release. It won't be freed from memory until the connection fails or suceeds
	[server release];
}

-(void) scoreRequestOk:(id) sender
{
	NSArray* scores = [sender parseScores];	
	if ([scores count]>0) {
		NSDictionary* score = [ scores objectAtIndex:0 ]; 
		NSNumber* num = [ score objectForKey:@"cc_score" ];
		highScore[levelnum-1] = [num integerValue]; 
	}
	
	NSString* hiscore;
	if (highScore[levelnum-1] == 99999) {
		hiscore = @" - ";
	} else {
		hiscore = [NSString stringWithFormat:@"(%.1f s)", highScore[levelnum-1]/10.0];
	}
	
	[ highScoreTexture initWithString:hiscore dimensions:CGSizeMake(128, 32) alignment:UITextAlignmentCenter fontName:@"Galactican" fontSize:18];	
	
}

-(void) scoreRequestFail:(id) sender {
	
	NSString* hiscore;
	if (highScore[levelnum-1] == 99999) {
		hiscore = @" - ";
	} else {
		hiscore = [NSString stringWithFormat:@"(%.1f s)", highScore[levelnum-1]/10.0];
	}
	
	[ highScoreTexture initWithString:hiscore dimensions:CGSizeMake(128, 32) alignment:UITextAlignmentCenter fontName:@"Galactican" fontSize:18];	
	
}

-(void) scorePostOk: (id) sender
{
	/*
	if( [sender ranking] != kServerPostInvalidRanking && [sender scoreDidUpdate]) {
		NSString *message = [NSString stringWithFormat:@"World ranking: %d", [sender ranking]];
		UIAlertView *alert = [[UIAlertView alloc] initWithTitle:@"Post Ok." message:message delegate:nil cancelButtonTitle:nil otherButtonTitles:@"OK", nil];	
		alert.tag = 2;
		[alert show];
		[alert release];		
		
	}
	 */
}

-(void) scorePostFail: (id) sender
{
}

@end
