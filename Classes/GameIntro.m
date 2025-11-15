//
//  GamePlay.m
//  GravityWars
//
//  Created by Sami Niemi on 6/11/09.
//  Copyright 2009 Scalado AB. All rights reserved.
//

#import "GameIntro.h"

#import "tutorial.h"

#import "Beacon.h"


@implementation GameIntro

-(void) initWithGameView:(GameView*)gameView theGamePlay:(GamePlay*)gamePlay;
{
	gv = gameView;
	gp = gamePlay;
	gv->levelNumber = 1;

	blogPosition.x = 240;
	blogPosition.y = 330;
	
	exitPosition.x = 480-16;
	exitPosition.y = 16;

	levelPosition.x = 240;
	levelPosition.y = 220-84+32;

	musicPosition.x = 240;
	musicPosition.y = 330;

	playPosition.x = 120;//240;
	playPosition.y = 200+32;//220-40;

	creditsPosition.x = 360;//240;
	creditsPosition.y = 200+32;//220;
	
	tutorialPosition.x = 240;
	tutorialPosition.y = 200+32;//220+40;

	gv->nextState = INTRO_INIT;
	gv->state = INTRO_INIT;
	
	globalFadeFactor = 0.0f;
	backFadeFactor = BACK_BLEND_LEVEL;
	textFadeFactor = 1.0f;
	gv->musicOn = TRUE;
	
	inputMode = NOTHING;

	textTexture = [Texture2D alloc];
	
	UIImage* image = [UIImage imageNamed:@"thumb_l.png"];
	leftThumbTexture = [[Texture2D alloc] initWithImage:image];
	
	image = [UIImage imageNamed:@"thumb_r.png"];
	rightThumbTexture = [[Texture2D alloc] initWithImage:image];	
	
	gameCreditsTexture = [[Texture2D alloc] initWithString:@"(C) VisioLogics\n\nGame design, programming, music:\nSami Niemi\n\nGraphics:\nPär Johannesson" dimensions:CGSizeMake(512, 256) alignment:UITextAlignmentCenter fontName:@"Galactican" fontSize:20];
	
	exitTexture = [[Texture2D alloc] initWithString:@"exit" dimensions:CGSizeMake(64, 32) alignment:UITextAlignmentCenter fontName:@"Galactican" fontSize:16];
	gravityWarsTexture = [[Texture2D alloc] initWithString:@"GRAVITY WARS" dimensions:CGSizeMake(128*3, 32*3) alignment:UITextAlignmentCenter fontName:@"Galactican" fontSize:48];
	gravityWarsTexture2 = [[Texture2D alloc] initWithString:@"- the beginning -" dimensions:CGSizeMake(128,32) alignment:UITextAlignmentCenter fontName:@"Galactican" fontSize:16];
	creditsTexture = [[Texture2D alloc] initWithString:@"Credits" dimensions:CGSizeMake(128, 32) alignment:UITextAlignmentCenter fontName:@"Galactican" fontSize:24];
	levelTexture = [[Texture2D alloc] initWithString:@"Level" dimensions:CGSizeMake(128, 32) alignment:UITextAlignmentCenter fontName:@"Galactican" fontSize:24];//	textTexture = [[Texture2D alloc] initWithString:@"You crashed!!!" dimensions:CGSizeMake(128, 32) alignment:UITextAlignmentCenter fontName:@"American Typewriter" fontSize:16];
	musicTexture = [[Texture2D alloc] initWithString:@"Music on/off" dimensions:CGSizeMake(128, 32) alignment:UITextAlignmentCenter fontName:@"Galactican" fontSize:18];//	textTexture = [[Texture2D alloc] initWithString:@"You crashed!!!" dimensions:CGSizeMake(128, 32) alignment:UITextAlignmentCenter fontName:@"American Typewriter" fontSize:16];
	tutorialTexture = [[Texture2D alloc] initWithString:@"Tutorial" dimensions:CGSizeMake(128, 32) alignment:UITextAlignmentCenter fontName:@"Galactican" fontSize:24];//	textTexture = [[Texture2D alloc] initWithString:@"You crashed!!!" dimensions:CGSizeMake(128, 32) alignment:UITextAlignmentCenter fontName:@"American Typewriter" fontSize:16];
	playTexture = [[Texture2D alloc] initWithString:@"Play" dimensions:CGSizeMake(128, 32) alignment:UITextAlignmentCenter fontName:@"Galactican" fontSize:24];//	textTexture = [[Texture2D alloc] initWithString:@"You crashed!!!" dimensions:CGSizeMake(128, 32) alignment:UITextAlignmentCenter fontName:@"American Typewriter" fontSize:16];
	blogTexture = [[Texture2D alloc] initWithString:@"Visit blog!" dimensions:CGSizeMake(128, 32) alignment:UITextAlignmentCenter fontName:@"Galactican" fontSize:18];//	textTexture = [[Texture2D alloc] initWithString:@"You crashed!!!" dimensions:CGSizeMake(128, 32) alignment:UITextAlignmentCenter fontName:@"American Typewriter" fontSize:16];
	for(int n = 0; n<=9; n++) {
		numTexture[n] = [[Texture2D alloc] initWithString:[NSString stringWithFormat:@"%i", n] dimensions:CGSizeMake(32, 32) alignment:UITextAlignmentCenter fontName:@"Galactican" fontSize:24];
	}		
	
	tutorialMessageIntensity = 0.0f;
	tutorialIntensityModifier = 0.0f;
	screenTouched = FALSE;

	gv->levelNumber = completedNumberOfLevels+1;

}

-(void) deinit
{	
	
	[exitTexture release];
	[gravityWarsTexture release];
	[gravityWarsTexture2 release];
	[gameCreditsTexture release];
	[creditsTexture release];
	[levelTexture release];
	[musicTexture release];
	[tutorialTexture release];
	[playTexture release];
	int i;
	for (i = 0; i<=9; i++)
		[numTexture[i] release];
	
	[leftThumbTexture release];
	[rightThumbTexture release];
	
	[textTexture release];

	[levelTexture release];
}


- (void)viewLogic
{
	switch(gv->state) {
		case INTRO_INIT:
			levelnum=0;
			main_init();
			if (gv->musicOn) {
				NSBundle* bundle = [NSBundle mainBundle];

				SoundEngine_StopBackgroundMusic(false);
				SoundEngine_UnloadBackgroundMusicTrack();
				SoundEngine_LoadBackgroundMusicTrack([[bundle pathForResource:@"Test1" ofType:@"m4r"] UTF8String], true, false);
				SoundEngine_SetBackgroundMusicVolume(0.33f);
				SoundEngine_StartBackgroundMusic();
			}
			gv->nextState = INTRO_FADE;
			break;
			
		case INTRO_FADE:
			globalFadeFactor-=0.1f;
			textFadeFactor+=0.1f; if (textFadeFactor>1.0f) textFadeFactor=1.0f;
			backFadeFactor+=0.1f; if (backFadeFactor>BACK_BLEND_LEVEL) backFadeFactor=BACK_BLEND_LEVEL;
			if (globalFadeFactor<0.0f) {
				gv->nextState = INTRO;
				globalFadeFactor = 0.0f;
			}
			break;
		case INTRO_INIT_TUTORIAL:
			
			trainer = TRUE;
			
			textFadeFactor-=0.1f;
			backFadeFactor-=0.1f;
			if (textFadeFactor<0.0f) textFadeFactor = 0.0f;
			if (backFadeFactor<0.0f) backFadeFactor = 0.0f;
			if (textFadeFactor == 0.0f && backFadeFactor==0.0f) {
				tutorialFrame = 0;
				screenTouched = FALSE;
				[[Beacon shared] startSubBeaconWithName:@"Checked tutorial" timeSession:NO];

				gv->nextState = INTRO_TUTORIAL;
			}
			break;
		case INTRO_INIT_CREDITS:
			textFadeFactor=0.0f;			
			screenTouched = FALSE;
			
			[[Beacon shared] startSubBeaconWithName:@"Checked credits" timeSession:NO];

			gv->nextState = INTRO_CREDITS;
			break;			
			
		case INTRO_CREDITS:
			textFadeFactor-=0.2f;
			creditsFadeFactor+=0.1f;
			if (creditsFadeFactor>1.0f) {
				creditsFadeFactor = 1.0f;
			}
			if (textFadeFactor<0.0f) {
				textFadeFactor = 0.0f;
			}
			if (screenTouched) {
				screenTouched = FALSE;
				gv->nextState = INTRO_DEINIT_CREDITS;
			}
			break;			
		case INTRO_DEINIT_CREDITS:
			textFadeFactor+=0.2f;
			if (textFadeFactor>1.0f) {
				textFadeFactor = 1.0f;
			}
			creditsFadeFactor-=0.1f;
			if (creditsFadeFactor<0.0f) {
				creditsFadeFactor = 0.0f;
				gv->nextState = INTRO;
			}
			break;			
		case INTRO_TUTORIAL_PAUSED:
			if (screenTouched) {
				screenTouched = FALSE;
				gv->nextState = INTRO_TUTORIAL;
			}
			break;
		case INTRO_DEINIT_TUTORIAL:
			// Don't come back to intro, but directly to the game 
			if (firstTimeLaunched) {
				globalFadeFactor+=0.1f;
				if (globalFadeFactor>1.0f) {
					globalFadeFactor = 1.0f;
					firstTimeLaunched = FALSE;
					gv->nextState = INTRO_EXIT;
				}
			}
			else {
				textFadeFactor+=0.1f;
				backFadeFactor+=0.1f;
				if (textFadeFactor>1.0f) textFadeFactor = 1.0f;
				if (backFadeFactor>BACK_BLEND_LEVEL) backFadeFactor = BACK_BLEND_LEVEL;
				if (textFadeFactor == 1.0f && backFadeFactor==BACK_BLEND_LEVEL) {
					main_init();
					main_end();
					levelnum=gv->levelNumber;
					
					shipState.image = SHIP_IMAGE_NO_THRUST;
					shipState.state = SHIP_STATE_LANDED;
					
					gv->nextState = INTRO_INIT;
				}
			}
			break;
		case INTRO_DEINIT:
			globalFadeFactor+=0.1f;
			if (globalFadeFactor>1.0f) {
				gv->nextState = INTRO_EXIT;
				globalFadeFactor = 1.0f;
			}
			break;
		case INTRO_EXIT:
			trainer = FALSE;
			gv->nextState = GAME_INIT_INFO;
			break;
	}
}


float distance2(float x1,float y1, float x2, float y2)
{
	return sqrt( (x1-x2)*(x1-x2) + (y1-y2)*(y1-y2));
}


-(void) dispatchFirstTouchAtPoint:(CGPoint*)touchPoint forEvent:(UIEvent *)event
{

	//115,228, 108,232
	
	screenTouched = TRUE;
	
	if (gv->state == INTRO_TUTORIAL || gv->state == INTRO_TUTORIAL_PAUSED || gv->state == INTRO_TUTORIAL_RUNNING) { // Running tutorial is brakeable by click  
		if (distance2(320-exitPosition.y, exitPosition.x, touchPoint->x, touchPoint->y)<64) {	
			SoundEngine_StartEffect( sounds[kSound_Cling]);
			gv->nextState = INTRO_DEINIT_TUTORIAL;
		}
		return;
	}
	
	if (gv->state == INTRO_CREDITS) { 
		if (distance2(320-blogPosition.y, blogPosition.x, touchPoint->x, touchPoint->y)<64) {	
			SoundEngine_StartEffect( sounds[kSound_Cling]);
			NSURL *url = [NSURL URLWithString:@"http://visiologics.wordpress.com/"];
			[[UIApplication sharedApplication] openURL:url];
		}
	}		
		
	if (gv->state == INTRO) {	
		//	if (distance2(320-levelPosition.y, levelPosition.x, touchPoint->x, touchPoint->y)<128) {
		if (touchPoint->x>(320-levelPosition.y)-16 && touchPoint->x<(320-levelPosition.y)+48) {
			SoundEngine_StartEffect( sounds[kSound_Cling]);
			inputMode = LEVEL;
			
			gv->levelNumber = gv->baseLevel + (int)round((touchPoint->y - 240)/48);
			if (gv->levelNumber<1) gv->levelNumber = 1;
			if (gv->levelNumber>completedNumberOfLevels+1) gv->levelNumber = completedNumberOfLevels+1;
			
			gv->baseLevel = gv->levelNumber;
			
			inputPosition.x = touchPoint->x;
			inputPosition.y = touchPoint->y;
		}
		else if (distance2(320-playPosition.y, playPosition.x, touchPoint->x, touchPoint->y)<64) {
			SoundEngine_StartEffect( sounds[kSound_Cling]);
			inputMode = NOTHING;
			inputPosition.x = touchPoint->x;
			inputPosition.y = touchPoint->y;
			
			globalFadeFactor = 0.0f;
			if (firstTimeLaunched)
				gv->nextState = INTRO_INIT_TUTORIAL;
			else
				gv->nextState = INTRO_DEINIT;
		}		
		else if (distance2(320-tutorialPosition.y, tutorialPosition.x, touchPoint->x, touchPoint->y)<64) {
			SoundEngine_StartEffect( sounds[kSound_Cling]);
			inputMode = NOTHING;
			inputPosition.x = touchPoint->x;
			inputPosition.y = touchPoint->y;
			gv->nextState = INTRO_INIT_TUTORIAL;
		}		
		else if (distance2(320-creditsPosition.y, creditsPosition.x, touchPoint->x, touchPoint->y)<64) {
			SoundEngine_StartEffect( sounds[kSound_Cling]);
			inputMode = NOTHING;
			inputPosition.x = touchPoint->x;
			inputPosition.y = touchPoint->y;
			gv->nextState = INTRO_INIT_CREDITS;
		}		
		else if (distance2(320-musicPosition.y, musicPosition.x, touchPoint->x, touchPoint->y)<64) {
			SoundEngine_StartEffect( sounds[kSound_Cling]);
			if (gv->musicOn == TRUE) {
				SoundEngine_StopBackgroundMusic(false);
				SoundEngine_UnloadBackgroundMusicTrack();
				gv->musicOn = FALSE;
			}
			else {
				NSBundle* bundle = [NSBundle mainBundle];

				SoundEngine_StopBackgroundMusic(false);
				SoundEngine_UnloadBackgroundMusicTrack();
				SoundEngine_LoadBackgroundMusicTrack([[bundle pathForResource:@"Test1" ofType:@"m4r"] UTF8String], true, false);
				SoundEngine_SetBackgroundMusicVolume(0.33f);
				SoundEngine_StartBackgroundMusic();
				gv->musicOn = TRUE;
			}
		}		
	}
}/*
 Checks to see which view, or views, the point is in and then sets the center of each moved view to the new postion.
 If views are directly on top of each other, they move together.
 */
-(void) dispatchTouchEvent:(UIView *)theView toPosition:(CGPoint*)position
{
/*
	gv->levelNumber= gv->baseLevel - (int)((position->y - inputPosition.y)/48);
	if (gv->levelNumber<1) gv->levelNumber = 1;
	if (gv->levelNumber>99) gv->levelNumber = 99;
*/	
/*
	switch(inputMode) {
		case LEVEL:
		{
						
			gv->levelNumber= gv->baseLevel - (int)((position->y - inputPosition.y)/48);
			if (gv->levelNumber<1) gv->levelNumber = 1;
			if (gv->levelNumber>99) gv->levelNumber = 99;
			
		}
			break;
	}
*/
}



/*
 Checks to see which view, or views,  the point is in and then calls a method to perform the closing animation,
 which is to return the piece to its original size, as if it is being put down by the user.
 */
- (void) dispatchTouchEndEvent:(UIView *)theView toPosition:(CGPoint*)position
{   

	if (inputMode == LEVEL) {
		
/*		gv->levelNumber= gv->baseLevel + (int)round((position->y - 240)/48);
		if (gv->levelNumber<1) gv->levelNumber = 1;
		if (gv->levelNumber>99) gv->levelNumber = 99;
		
		gv->baseLevel = gv->levelNumber;*/
	}
	
	inputMode = NOTHING;
	inputPosition = *position;

		
}



extern int frame_number;
	

-(void) runControlLogic {
	frame_number++;
	
	// frame number, left x/y/onoff, right x,y,on/off, thrust, firing, angle
	
	if (gv->state == INTRO_TUTORIAL || gv->state == INTRO_TUTORIAL_RUNNING) {
		
		shipThrust = demo[(tutorialFrame*10) + 7];
		shipIsFiring = demo[(tutorialFrame*10) + 8];
		sa = demo[(tutorialFrame*10) + 9];
		
		if (tutorialFrame>sizeof(demo)/(10*sizeof(int))) {
			tutorialFrame = 0;
			sx = Lsx;
			sy = Lsy;
			sa = 0;
			gv->nextState = INTRO_DEINIT_TUTORIAL;
		}
		
		tutorialFrame++;
		control();
		
		ShipFuel = 99<<4;
		ShipTime = 999;
	}
	
	[self viewLogic];
	
}


// Updates the OpenGL view when the timer fires
- (void)drawView
{
			
	[self runControlLogic];
	
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
	gv->xx = -16+240;
	gv->yy = -16+180; // 160 is middle, 240 is further down
	if (gv->xx>0) gv->xx=0;
	if (gv->xx<-(640-480)) gv->xx=-(640-480);
	if (gv->yy>0) gv->yy=0;
	if (gv->yy<-(1408-320)) gv->yy=-(1408-320);
	
 	[gp drawViewObjects];
	
	if (gv->state == INTRO_TUTORIAL || gv->state == INTRO_TUTORIAL_PAUSED || gv->state == INTRO_TUTORIAL_RUNNING) {
	
		tutorialMessageIntensity +=tutorialIntensityModifier;
		if (tutorialMessageIntensity>1.0f)
			tutorialMessageIntensity = 1.0f;
		if (tutorialMessageIntensity<0.0f)
			tutorialMessageIntensity = 0.0f;
		
		{
			for (int i = 0; i<sizeof(messages)/sizeof(GameMessage); i++) {			
				if (tutorialFrame == messages[i].frame_number-demo[0]) {
					if (messages[i].message[0] == '+') {
						tutorialIntensityModifier = 0.05f;
					}
					else if (messages[i].message[0] == '-') {
						tutorialIntensityModifier = -0.05f;
					}
					else if (messages[i].message[0] == '*') {
						gv->nextState = INTRO_TUTORIAL_PAUSED;
						tutorialFrame++;
					}
					else if (messages[i].message[0] == '!') {
						gv->nextState = INTRO_TUTORIAL_RUNNING;
						tutorialFrame++;
					}
					else {
						NSString* text = [NSString stringWithUTF8String:messages[i].message ];
						[textTexture initWithString:text dimensions:CGSizeMake(512, 64) alignment:UITextAlignmentCenter fontName:@"Galactican" fontSize:24];
						tutorialIntensityModifier = 0.05f;
					}
					break;
				}
			}
			
		}
		
		
		if (tutorialMessageIntensity>0.0f) { // Display message
			float x = 240-gv->xx, y = 64-gv->yy;
			glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
			
			int dx[5]={-1, 0, +1, 0, 0}, dy[5]={0, -1, 0, +1, 0}; GLfloat col[5][3]={{0,0.2,0},{0,0.2,0},{0,0.2,0},{0,0.2,0},{0.8f,1.0f,0.8f}};
			for (int i=0; i<5; i++) {
				glColor4f(col[i][0],col[i][1],col[i][2],tutorialMessageIntensity);				
				[textTexture drawAtPoint:CGPointMake(x+dx[i],y+dy[i])];
			}
		}
			

		int thumbX, thumbY, shiftY, shiftX;
		
		thumbY = 320-demo[(tutorialFrame*10) + 1];
		thumbX = demo[(tutorialFrame*10) + 2];		
		shiftX = shiftY = demo[(tutorialFrame*10) + 3]? 1 : 4;
		
		if (thumbX>0 && thumbY<320) {
			glColor4f(0.0f, 0.0f, 0.0f, 0.45f);
			[leftThumbTexture drawAtPoint:CGPointMake(thumbX-gv->xx-shiftX, thumbY-gv->yy-38+70-shiftY)];
			glColor4f(1.0f, 0.8f, 0.6f, 0.45f);
			[leftThumbTexture drawAtPoint:CGPointMake(thumbX-gv->xx+shiftX, thumbY-gv->yy-38+70+shiftY)];
		}
		
		thumbY = 320-demo[(tutorialFrame*10) + 4];
		thumbX = demo[(tutorialFrame*10) + 5];		
		shiftX = shiftY = demo[(tutorialFrame*10) + 3]? 4 : 1;
		
		if (thumbX>0 && thumbY<320) {
			glColor4f(0.0f, 0.0f, 0.0f, 0.45f);
			[rightThumbTexture drawAtPoint:CGPointMake(thumbX-gv->xx+20+32-shiftX, thumbY-gv->yy+38+20-shiftY)];
			glColor4f(1.0f, 0.8f, 0.6f, 0.45f);
			[rightThumbTexture drawAtPoint:CGPointMake(thumbX-gv->xx+20+32+shiftX, thumbY-gv->yy+38+20+shiftY)];
		}
		
	}
		
	// Blend over scene
	if (backFadeFactor!=0.0f) {
		const GLfloat screenVertices[] = {
			(0	),	(0),	
			(0+480),(0),	
			(0),	(0+320),	
			(0+480),	(0+320)	
		};
		glDisable(GL_TEXTURE_2D);
		glColor4f(0.0f, 0.0f, 0.0f, backFadeFactor);
		glVertexPointer(2, GL_FLOAT, 0, screenVertices);
		glEnableClientState(GL_VERTEX_ARRAY);
		glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);				
		glDrawArrays(GL_TRIANGLE_STRIP, 0, 4);
		glEnable(GL_TEXTURE_2D);
	}		
	
	// Gravity wars intro
	
	float cs = cos(frame_number/8.0);
	float sn = sin(frame_number/8.0);
	float f = 0.3f;
	float stretch;

	glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);

	glPushMatrix();
	glTranslatef(-gv->xx+240, -gv->yy+32,0);
	stretch = 1.0f+frame_number/200.f; if (stretch>1.25f) stretch = 1.25f;
	glScalef(stretch, stretch, 1.0f);
	glTranslatef(+gv->xx-240, +gv->yy-32,0);
	glColor4f(0.6f,0.6f,0.9f,0.5f*textFadeFactor);	
	[gravityWarsTexture drawAtPoint:CGPointMake(240-gv->xx-5.0*cs*f, 64-gv->yy+7.5*sn*f)];
	[gravityWarsTexture drawAtPoint:CGPointMake(240-gv->xx-6.0*sn*f, 64-gv->yy+5.5*cs*f)];
	[gravityWarsTexture2 drawAtPoint:CGPointMake(240-gv->xx-2.0*sn*f, 64+24-gv->yy+3.5*cs*f)];
	[gravityWarsTexture2 drawAtPoint:CGPointMake(240-gv->xx-3.0*cs*f, 64+24-gv->yy+2.5*sn*f)];
	glColor4f(0.9f,0.9f,1.0f,0.8f*textFadeFactor);
	[gravityWarsTexture drawAtPoint:CGPointMake(240-gv->xx, 64-gv->yy)];
	[gravityWarsTexture2 drawAtPoint:CGPointMake(240-gv->xx, 64+24-gv->yy)];
	glPopMatrix(); 
	
	float p;
	
	p = (0.75+0.25*sin(3.14159/4.0f+frame_number*0.5)*sin(3.14159/4.0f+frame_number*0.1))*textFadeFactor;
	glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
	glColor4f(0.6f,0.6f,0.9f,p);	
	[tutorialTexture drawAtPoint:CGPointMake(tutorialPosition.x-gv->xx-1, tutorialPosition.y-gv->yy-1)];
	[tutorialTexture drawAtPoint:CGPointMake(tutorialPosition.x-gv->xx-0, tutorialPosition.y-gv->yy+0)];

	p = (0.75+0.25*sin(3.14159/4.0f+frame_number*0.5)*sin(3.14159/4.0f+frame_number*0.1))*textFadeFactor;
	glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
	glColor4f(0.6f,0.6f,0.9f,p);	
	[playTexture drawAtPoint:CGPointMake(playPosition.x-gv->xx-1, playPosition.y-gv->yy-1)];
	[playTexture drawAtPoint:CGPointMake(playPosition.x-gv->xx-0, playPosition.y-gv->yy+0)];
	
	p = (0.75+0.25*sin(3.14159/4.0f+frame_number*0.5)*sin(3.14159/4.0f+frame_number*0.1))*textFadeFactor;
	glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
	glColor4f(0.6f,0.6f,0.9f,p);	
	[creditsTexture drawAtPoint:CGPointMake(creditsPosition.x-gv->xx-1, creditsPosition.y-gv->yy-1)];
	[creditsTexture drawAtPoint:CGPointMake(creditsPosition.x-gv->xx-0, creditsPosition.y-gv->yy+0)];

	glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
	glColor4f(0.6f,0.6f,0.9f,1.0f*textFadeFactor);	
	[levelTexture drawAtPoint:CGPointMake(levelPosition.x-gv->xx-1, levelPosition.y-24-gv->yy-1)];
	[levelTexture drawAtPoint:CGPointMake(levelPosition.x-gv->xx-0, levelPosition.y-24-gv->yy+0)];
	glColor4f(0.8f,0.8f,1.0f,1.0f*textFadeFactor);
	[levelTexture drawAtPoint:CGPointMake(levelPosition.x-gv->xx, levelPosition.y-24-gv->yy)];

	float musicFadeFactor = (gv->musicOn ? 1.0f : 0.33f);
	
	glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
	glColor4f(0.6f,0.6f,0.9f,1.0f*musicFadeFactor*textFadeFactor);	
	[musicTexture drawAtPoint:CGPointMake(musicPosition.x-gv->xx-1, musicPosition.y-24-gv->yy-1)];
	[musicTexture drawAtPoint:CGPointMake(musicPosition.x-gv->xx-0, musicPosition.y-24-gv->yy+0)];
	glColor4f(0.8f,0.8f,1.0f,1.0f*musicFadeFactor*textFadeFactor);
	[musicTexture drawAtPoint:CGPointMake(musicPosition.x-gv->xx, musicPosition.y-24-gv->yy)];
	
	
	for (int i = 0; i<9; i++) {
		int lev = gv->levelNumber+i-4;
		if (lev>0 && lev<=completedNumberOfLevels+1) {
			glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
			float f = 1.0f/(1.0f+(i-4)*(i-4));
			glColor4f(0.6f,0.6f,0.9f,f*textFadeFactor);	
			[numTexture[lev/10] drawAtPoint:CGPointMake(-8+levelPosition.x+(i-4)*48-gv->xx, levelPosition.y-gv->yy)];
			[numTexture[lev/10] drawAtPoint:CGPointMake(-8+levelPosition.x+(i-4)*48-gv->xx, levelPosition.y-gv->yy)];
			[numTexture[lev%10] drawAtPoint:CGPointMake( 8+levelPosition.x+(i-4)*48-gv->xx, levelPosition.y-gv->yy)];
			[numTexture[lev%10] drawAtPoint:CGPointMake( 8+levelPosition.x+(i-4)*48-gv->xx, levelPosition.y-gv->yy)];
			float p = 1.0f;
			if (i==4) {
				p = 0.75+0.25*sin(frame_number*0.5)*sin(frame_number*0.25);
			}
			glColor4f(0.8f,0.8f*p,1.0f*p,f*textFadeFactor);
			[numTexture[lev/10] drawAtPoint:CGPointMake(-8+240+(i-4)*48-gv->xx, levelPosition.y-gv->yy)];
			[numTexture[lev%10] drawAtPoint:CGPointMake( 8+240+(i-4)*48-gv->xx, levelPosition.y-gv->yy)];
		}
	}
	glColor4f(1.0f,1.0f,1.0f,1.0f);
	
	if (gv->state == INTRO_TUTORIAL || gv->state == INTRO_TUTORIAL_RUNNING || gv->state == INTRO_TUTORIAL_PAUSED) {
		glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
		glColor4f(0.6f,0.6f,0.9f,0.5f);	
		[exitTexture drawAtPoint:CGPointMake(exitPosition.x-gv->xx-1, exitPosition.y-gv->yy-1)];
		[exitTexture drawAtPoint:CGPointMake(exitPosition.x-gv->xx-0, exitPosition.y-gv->yy+0)];
		glColor4f(0.9f,0.9f,1.0f,0.8f);
		[exitTexture drawAtPoint:CGPointMake(exitPosition.x-gv->xx-1, exitPosition.y-gv->yy-1)];
		
	}

	
	if (gv->state == INTRO_CREDITS || gv->state == INTRO_INIT_CREDITS || gv->state == INTRO_DEINIT_CREDITS) {
		
		float cs = cos(frame_number/8.0);
		float sn = sin(frame_number/8.0);
		float f = 0.3f;
		glPushMatrix();
		glTranslatef(-gv->xx+240, -gv->yy+32,0);
		stretch = 1.0f+frame_number/200.f; if (stretch>1.25f) stretch = 1.25f;
		glScalef(stretch, stretch, 1.0f);
		glTranslatef(+gv->xx-240, +gv->yy-32,0);
		glColor4f(0.6f,0.6f,0.9f,0.5f);	
		[gravityWarsTexture drawAtPoint:CGPointMake(240-gv->xx-5.0*cs*f, 64-gv->yy+7.5*sn*f)];
		[gravityWarsTexture drawAtPoint:CGPointMake(240-gv->xx-6.0*sn*f, 64-gv->yy+5.5*cs*f)];
		glColor4f(0.9f,0.9f,1.0f,0.8f);
		[gravityWarsTexture drawAtPoint:CGPointMake(240-gv->xx, 64-gv->yy)];
		glPopMatrix(); 
				
		glColor4f(0.6f,0.5f,0.5f,0.5f*(creditsFadeFactor));	
		[gameCreditsTexture drawAtPoint:CGPointMake(240-gv->xx-1, 250*(1.0f-creditsFadeFactor)+220-gv->yy+1)];
		[gameCreditsTexture drawAtPoint:CGPointMake(240-gv->xx-0, 250*(1.0f-creditsFadeFactor)+220-gv->yy+0)];
		glColor4f(0.8f,0.7f,0.5f,0.8f*(creditsFadeFactor));
		[gameCreditsTexture drawAtPoint:CGPointMake(240-gv->xx, 250*(1.0f-creditsFadeFactor)+220-gv->yy)];
		
		float p = 1.0f;
			p = 0.75+0.25*sin(frame_number*0.5)*sin(frame_number*0.25)*creditsFadeFactor;
			
		glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
		glColor4f(0.3f,0.3f,0.9f,1.0f*p);	
		[blogTexture drawAtPoint:CGPointMake(blogPosition.x-gv->xx-1, 250*(1.0f-creditsFadeFactor)+blogPosition.y-24-gv->yy-1)];
		[blogTexture drawAtPoint:CGPointMake(blogPosition.x-gv->xx-0, 250*(1.0f-creditsFadeFactor)+blogPosition.y-24-gv->yy+0)];
		glColor4f(0.4f,0.4f,1.0f,1.0f*p);
		[blogTexture drawAtPoint:CGPointMake(blogPosition.x-gv->xx, 250*(1.0f-creditsFadeFactor)+blogPosition.y-24-gv->yy)];
	}		
	
	// Fade to black
	if (globalFadeFactor!=0.0f)	{	
		const GLfloat screenVertices[] = {
			(0	),	(0),	
			(0+480),(0),	
			(0),	(0+320),	
			(0+480),	(0+320)	
		};
		glDisable(GL_TEXTURE_2D);
		glColor4f(0.0f, 0.0f, 0.0f, globalFadeFactor);
		glVertexPointer(2, GL_FLOAT, 0, screenVertices);
		glEnableClientState(GL_VERTEX_ARRAY);
		glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);				
		glDrawArrays(GL_TRIANGLE_STRIP, 0, 4);
		glEnable(GL_TEXTURE_2D);
	}		
	
}

@end
