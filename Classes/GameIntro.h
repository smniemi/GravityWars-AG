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

#import "GameDefines.h"
#import "GameView.h"
#import "GamePlay.h"
#import "memory.h"

#define BACK_BLEND_LEVEL 0.66f

typedef enum {NOTHING = 0, LEVEL} IntroInputMode;

@interface GameIntro : NSObject {
	
@private
	// Message
	NSString* gameMessageString;
	bool gameMessageVisible;
	int frameNumberAtMessageStart;
	
	GameView* gv;
	GamePlay* gp;
	
//	int frame_number;
	CGPoint startPoint;
	CGPoint origStartPoint;
	NSTimeInterval origStartDate;
	
	CGPoint blogPosition;
	CGPoint exitPosition;
	CGPoint levelPosition;
	CGPoint musicPosition;
	CGPoint playPosition;
	CGPoint creditsPosition;
	CGPoint tutorialPosition;
	
	float globalFadeFactor;
	float backFadeFactor;
	float textFadeFactor;
	
	float creditsFadeFactor;
	
	IntroInputMode inputMode;
	CGPoint inputPosition;

	Texture2D* blogTexture;
	Texture2D* exitTexture;
	Texture2D* levelTexture;
	Texture2D* musicTexture;
	Texture2D* tutorialTexture;
	Texture2D* playTexture;
	Texture2D* creditsTexture;
	Texture2D* gravityWarsTexture;
	Texture2D* gravityWarsTexture2;
	Texture2D* gameCreditsTexture;
	Texture2D* numTexture[10];
	Texture2D* leftThumbTexture;
	Texture2D* rightThumbTexture;
	
	
	Texture2D* textTexture;
	float 	tutorialMessageIntensity;
	float	tutorialIntensityModifier;
	int screenTouched;
	
	int tutorialFrame;

}

-(void) runControlLogic;
-(void) initWithGameView:(GameView*)gameView theGamePlay:(GamePlay*)gamePlay;
-(void) drawView;
-(void) dispatchFirstTouchAtPoint:(CGPoint*)touchPoint forEvent:(UIEvent *)event;
-(void) dispatchTouchEvent:(UIView *)theView toPosition:(CGPoint*)position;
-(void) dispatchTouchEndEvent:(UIView *)theView toPosition:(CGPoint*)position;

@end
