//
//  GamePlay.h
//  GravityWars
//
//  Created by Sami Niemi on 6/11/09.
//  Copyright 2009 Scalado AB. All rights reserved.
//


//#import <Cocoa/Cocoa.h>

#import <OpenGLES/EAGL.h>
#import <OpenGLES/ES1/gl.h>
#import <OpenGLES/ES1/glext.h>

#import <AudioToolbox/AudioToolbox.h> 

#import "GameDefines.h"
#import "GameView.h"
#import "memory.h"

@interface GamePlay : NSObject {
	
@private

	GameView* gv;
	
//	int frame_number;
	CGPoint startPoint;
	CGPoint origStartPoint;
	NSTimeInterval origStartDate;
		
	float globalFadeFactor;
	float textFadeFactor;
	
	//InputMode inputMode;
	bool screenTouched;
	
	Texture2D* textTexture;
	Texture2D* lifeTexture;
	Texture2D* timeTexture;
	Texture2D* fuelTexture;
	Texture2D* scoreTexture;
	Texture2D* highScoreTexture;

	float finishedFadeFactor;
	Texture2D* gameFinishedTexture;
	Texture2D* gravityWarsTexture;
	Texture2D* blogTexture;
	
	unsigned int localShipTime;
	unsigned int localShipFuel;
	unsigned int localTotalTime;
	unsigned int localShipLife;

	// Message
	NSString* gameMessageString;
	bool gameMessageVisible;
	int frameNumberAtMessageStart;
	
	bool totalScoreVisible;
	Texture2D* totalScoreTexture;
	
	bool levelCreditsVisible;
	Texture2D* levelCreditsTexture;
	int frameNumberAtLevelCreditStart;
	
}

-(void) runControlLogic;
-(void) displayMessage:(NSString*)messageString;
-(void) initWithGameView:(GameView*)gameView;
-(void) drawView;
-(void) drawViewObjects;
-(void) drawViewMessages; 
-(void) dispatchFirstTouchAtPoint:(CGPoint*)touchPoint forEvent:(UIEvent *)event;
-(void) dispatchTouchEvent:(UIView *)theView toPosition:(CGPoint*)position;
-(void) dispatchTouchEndEvent:(UIView *)theView toPosition:(CGPoint*)position;

@end
