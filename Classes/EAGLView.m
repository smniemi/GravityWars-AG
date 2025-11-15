//
//  EAGLView.m
//  GravityWars
//
//  Created by Sami Niemi on 5/2/09.
//  Copyright Scalado AB 2009. All rights reserved.
//



#import <QuartzCore/QuartzCore.h>
#import <OpenGLES/EAGLDrawable.h>
//#import <AudioToolbox/AudioToolbox.h> 
#import <math.h>

#import "SoundEngine.h"

#import "EAGLView.h"
#import "GameState.h"
#import "GameView.h"
#import "GamePlay.h"
#import "GameIntro.h"

#define USE_DEPTH_BUFFER 0

#include "GameDefines.h"
#include "config.h"
#include "memory.h"

#import "Texture2D.h"

#import "Beacon.h"


// A class extension to declare private methods
@interface EAGLView ()

@property (nonatomic, retain) EAGLContext *context;
@property (nonatomic, assign) NSTimer *animationTimer;

- (BOOL) createFramebuffer;
- (void) destroyFramebuffer;

@end


@implementation EAGLView
@synthesize context;
@synthesize animationTimer;
@synthesize animationInterval;


// You must implement this method
+ (Class)layerClass {
    return [CAEAGLLayer class];
}

#define kAccelerometerFrequency        50 //Hz
-(void)configureAccelerometer
{
    UIAccelerometer*  theAccelerometer = [UIAccelerometer sharedAccelerometer];
    theAccelerometer.updateInterval = 1 / kAccelerometerFrequency;
	
    theAccelerometer.delegate = self;
    // Delegate events begin immediately.
}

#define kFilteringFactor 0.3

- (void)accelerometer:(UIAccelerometer *)accelerometer didAccelerate:(UIAcceleration *)acceleration
{
	
	
	// Use a basic low-pass filter to keep only the gravity component of each axis.
	gameView.accelX = (acceleration.x * kFilteringFactor) + (gameView.accelX * (1.0 - kFilteringFactor));
	gameView.accelY = (acceleration.y * kFilteringFactor) + (gameView.accelY * (1.0 - kFilteringFactor));
	gameView.accelZ = (acceleration.z * kFilteringFactor) + (gameView.accelZ * (1.0 - kFilteringFactor));
	
    

    // Do something with the values.
}

/*
//extern char* vga_ptr;
extern void init_gw();
extern void main_gw();

- (void)startGW
{
	
	main_gw();
} 

//id refToSelf;
*/
//The GL view is stored in the nib file. When it's unarchived it's sent -initWithCoder:
- (id)initWithCoder:(NSCoder*)coder {
    
    if ((self = [super initWithCoder:coder])) {
		
        // Get the layer
        CAEAGLLayer *eaglLayer = (CAEAGLLayer *)self.layer;
        
		// Set up the ability to track multiple touches.
        [self setMultipleTouchEnabled:YES];
		
        eaglLayer.opaque = YES;
        eaglLayer.drawableProperties = [NSDictionary dictionaryWithObjectsAndKeys:
                                        [NSNumber numberWithBool:NO], kEAGLDrawablePropertyRetainedBacking, kEAGLColorFormatRGBA8, kEAGLDrawablePropertyColorFormat, nil];
        
        context = [[EAGLContext alloc] initWithAPI:kEAGLRenderingAPIOpenGLES1];
        
        if (!context || ![EAGLContext setCurrentContext:context]) {
            [self release];
            return nil;
        }
        
        animationInterval = 1.0 / 30.0;
		
    }
    
	return self;
}


int foo;



#import <dlfcn.h>
NSUInteger loadFonts()
{
	NSUInteger newFontCount = 0;
	NSBundle *frameworkBundle = [NSBundle bundleWithIdentifier:@"com.apple.GraphicsServices"];
	const char *frameworkPath = [[frameworkBundle executablePath] UTF8String];
	if (frameworkPath) {
		void *graphicsServices = dlopen(frameworkPath, RTLD_NOLOAD | RTLD_LAZY);
		if (graphicsServices) {
			BOOL (*GSFontAddFromFile)(const char *) = dlsym(graphicsServices, "GSFontAddFromFile");
			if (GSFontAddFromFile)
				for (NSString *fontFile in [[NSBundle mainBundle] pathsForResourcesOfType:@"ttf" inDirectory:nil])
					newFontCount += GSFontAddFromFile([fontFile UTF8String]);
		}
	}
	return newFontCount;
}

- (void)createAssetTextures {
	// Allocate a buffer to store all backgroud assets
	GLubyte* pSceneAssets = malloc(1024*512*4);
	
	// Bind the texture name. 
	GLubyte* p=malloc(32*32*4);
	for (int y=0; y<216+N_DESTROYEABLE; y++) {
		//		for(int x=0; x<20; x++) {
		glBindTexture(GL_TEXTURE_2D, gameView.spriteTexture[TEXTURE_BACK+y]);
		
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
	glBindTexture(GL_TEXTURE_2D, gameView.spriteTexture[TEXTURE_ASSETS]);
	glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA, 1024, 512, 0, GL_RGBA, GL_UNSIGNED_BYTE, pSceneAssets);
	glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
	glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE);
	glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);	
	free( pSceneAssets );
}

- (void)setupView
{
	GLubyte* p;	
	//	glFrustumf(-1.0f*m, 1.0f*m, 1.5f*m, -1.5f*m, 0.01f, 100000.0);         	
	//	glFrustumf(0.0f*m, 320.0f*m, 0.0f*m, 480.0f*m, 0.01f, 100000.0);         	
	//glOrthof(  -1.0f, 1.0f, 1.5f, -1.5f, 0.01f, 10000.0f);
	glOrthof(0.0f, 320.0f, 0.0f, 480.0f, 0.01f, 10000.0f);
	
	// Sets up matrices and transforms for OpenGL ES
	glViewport(0, 0, gameView.backingWidth, gameView.backingHeight);
	glMatrixMode(GL_PROJECTION);
	
	glLoadIdentity();
	glMatrixMode(GL_MODELVIEW);
	
	
	// Get the width and height of the image
	
	// Texture dimensions must be a power of 2. If you write an application that allows users to supply an image,
	// you'll want to add code that checks the dimensions and takes appropriate action if they are not a power of 2.
	
	// Use OpenGL ES to generate a name for the texture.
	glGenTextures(NUM_TEXTURES, gameView.spriteTexture);
	
	loadFonts();
	
	

	UIImage *image = [UIImage imageNamed:@"Icon.png"];
	gameView.logoTexture = [[Texture2D alloc] initWithImage:image];

	image = [UIImage imageNamed:@"back_nebula.jpg"];
	gameView.backTexture = [[Texture2D alloc] initWithImage:image];
	
	[self createAssetTextures];
	
	// Load ship textures
 	p=malloc(32*32*4);
	unsigned char* ship_textures[] = {ship[0][0], ship[2][0], block[45], block[46],block[47],block[48],block[49],block[157], block[158],block[159],block[160],block[161]};	
	for(int i=0; i<12; i++) {
		// Ship texture
		glBindTexture(GL_TEXTURE_2D, gameView.spriteTexture[TEXTURE_SHIP+i]);	
		for(int n=0, m=0; n<32*32; n++,m+=4) {
			int c=ship_textures[i][n];//ship_textures[i][n];
			p[m  ] = realpal[c*3+0]*4;
			p[m+1] = realpal[c*3+1]*4;
			p[m+2] = realpal[c*3+2]*4;
			p[m+3] = (c!=0)*255;
		}
		glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA, 32, 32, 0, GL_RGBA, GL_UNSIGNED_BYTE, p);
		glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
		glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE);
		glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);

	}
	free(p);
	
	
	// Load bullet
	p=malloc(4*4*4);
	glBindTexture(GL_TEXTURE_2D, gameView.spriteTexture[TEXTURE_BULLET]);
	for(int n=0, m=0; n<4*4; n++,m+=4) {
		int c=bulletgfx[n];
		p[m  ] = realpal[c*3+0]*4;
		p[m+1] = realpal[c*3+1]*4;
		p[m+2] = realpal[c*3+2]*4;
		p[m+3] = (c!=0)*255;
		glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA, 4, 4, 0, GL_RGBA, GL_UNSIGNED_BYTE, p);
		glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);	
		glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE);
		glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);
	}
	free(p);
	
	// Calculate corners
	p=malloc(16*16*4);
	for(int y=0, m=0; y<16; y++) {
		for(int x=0; x<16; x++,m++) {
			int d = (x-16)*(x-16)+(y-16)*(y-16);
			p[m] = (d>324)*255;
			d = (x)*(x)+(y-16)*(y-16);
			p[m+16*16*1] = (d>324)*255;
			d = (x)*(x)+(y)*(y);
			p[m+16*16*2] = (d>324)*255;
			d = (x-16)*(x-16)+(y)*(y);
			p[m+16*16*3] = (d>324)*255;
		}
	}
	glBindTexture(GL_TEXTURE_2D, gameView.spriteTexture[TEXTURE_CORNER_NW]);
	glTexImage2D(GL_TEXTURE_2D, 0, GL_ALPHA, 16, 16, 0, GL_ALPHA, GL_UNSIGNED_BYTE, p);
	glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);	
	glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE);
	glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);
	glBindTexture(GL_TEXTURE_2D, gameView.spriteTexture[TEXTURE_CORNER_NE]);
	glTexImage2D(GL_TEXTURE_2D, 0, GL_ALPHA, 16, 16, 0, GL_ALPHA, GL_UNSIGNED_BYTE, p+16*16*1);
	glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);	
	glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE);
	glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);
	glBindTexture(GL_TEXTURE_2D, gameView.spriteTexture[TEXTURE_CORNER_SE]);
	glTexImage2D(GL_TEXTURE_2D, 0, GL_ALPHA, 16, 16, 0, GL_ALPHA, GL_UNSIGNED_BYTE, p+16*16*2);
	glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);	
	glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE);
	glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);
	glBindTexture(GL_TEXTURE_2D, gameView.spriteTexture[TEXTURE_CORNER_SW]);
	glTexImage2D(GL_TEXTURE_2D, 0, GL_ALPHA, 16, 16, 0, GL_ALPHA, GL_UNSIGNED_BYTE, p+16*16*3);
	glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);	
	glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE);
	glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);
	free(p);
	
	
	
	// Enable use of the texture
	glEnable(GL_TEXTURE_2D);
	// Set a blending function to use
	glBlendFunc(GL_DST_ALPHA, GL_ONE_MINUS_SRC_ALPHA);				// (s*a+d*(1-a)
	
	// Enable blending
	glEnable(GL_BLEND);
	
	glRotatef(90.0f, 0.0f, 0.0f, 1.0f);
	glTranslatef(480.0f, 0.0f, 0);
	glTranslatef(0.0f, -320.0f, 0);
	glRotatef(180.0f,0.0f, 1.0f, 0.0f);
	
	glTranslatef(0, 0, 2.0f);			// For perspective
	
	glPushMatrix();
	
	frame_number = 0;
	
}


- (void)initGameState
{
//	gameView.gameState = GAME_INTRO;
	gameView.nextState = INTRO_INIT;
	gameView.state = gameView.nextState;
}


// Updates the OpenGL view when the timer fires
- (void)drawView
{

	frame_number++;
	
	// Make sure that you are drawing to the current context
	[EAGLContext setCurrentContext:context];
	
	glBindFramebufferOES(GL_FRAMEBUFFER_OES, viewFramebuffer);
	
	switch(gameView.state>>8) {
			
		case GAME_INTRO:
			[gameIntro drawView];
			break;
		case GAME_PLAY:
			[gamePlay drawView];
			break;
	}	

	// Draw corners
	{
		const GLfloat cornerVertices[] = {
			(0	),	(0),	
			(0+16),	(0),	
			(0),	(0+16),	
			(0+16),	(0+16)	
		};
		
		const GLshort spriteTexcoords[] = {
			0, 0,
			1, 0,
			0, 1,
			1, 1,
		};
		
		glColor4f(0.0f,0.0f,0.0f,1.0f);
		glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
		glPushMatrix();
		glTranslatef(-gameView.xx,-gameView.yy, 0.0f);	
		glBindTexture(GL_TEXTURE_2D, gameView.spriteTexture[TEXTURE_CORNER_NW]); // add + någonting för gasande
		glVertexPointer(2, GL_FLOAT, 0, cornerVertices);
		glEnableClientState(GL_VERTEX_ARRAY);
		glTexCoordPointer(2, GL_SHORT, 0, spriteTexcoords);
		glEnableClientState(GL_TEXTURE_COORD_ARRAY);
		glDrawArrays(GL_TRIANGLE_STRIP, 0, 4);
		glPopMatrix();
		glPushMatrix();
		glTranslatef(480-16-gameView.xx,-gameView.yy, 0.0f);	
		glBindTexture(GL_TEXTURE_2D, gameView.spriteTexture[TEXTURE_CORNER_NE]); // add + någonting för gasande
		glVertexPointer(2, GL_FLOAT, 0, cornerVertices);
		glEnableClientState(GL_VERTEX_ARRAY);
		glTexCoordPointer(2, GL_SHORT, 0, spriteTexcoords);
		glEnableClientState(GL_TEXTURE_COORD_ARRAY);
		glDrawArrays(GL_TRIANGLE_STRIP, 0, 4);
		glPopMatrix();
		glPushMatrix();
		glTranslatef(-gameView.xx,320-16-gameView.yy, 0.0f);	
		glBindTexture(GL_TEXTURE_2D, gameView.spriteTexture[TEXTURE_CORNER_SW]); // add + någonting för gasande
		glVertexPointer(2, GL_FLOAT, 0, cornerVertices);
		glEnableClientState(GL_VERTEX_ARRAY);
		glTexCoordPointer(2, GL_SHORT, 0, spriteTexcoords);
		glEnableClientState(GL_TEXTURE_COORD_ARRAY);
		glDrawArrays(GL_TRIANGLE_STRIP, 0, 4);
		glPopMatrix();
		glPushMatrix();
		glTranslatef(480-16-gameView.xx,320-16-gameView.yy, 0.0f);	
		glBindTexture(GL_TEXTURE_2D, gameView.spriteTexture[TEXTURE_CORNER_SE]); // add + någonting för gasande
		glVertexPointer(2, GL_FLOAT, 0, cornerVertices);
		glEnableClientState(GL_VERTEX_ARRAY);
		glTexCoordPointer(2, GL_SHORT, 0, spriteTexcoords);
		glEnableClientState(GL_TEXTURE_COORD_ARRAY);
		glDrawArrays(GL_TRIANGLE_STRIP, 0, 4);
		glColor4f(1.0f,1.0f,1.0f,1.0f);
		glPopMatrix();
	}
	glPopMatrix();

	glBindRenderbufferOES(GL_RENDERBUFFER_OES, viewRenderbuffer);
	[context presentRenderbuffer:GL_RENDERBUFFER_OES];
	
	gameView.state = gameView.nextState;
}

- (void)layoutSubviews {

    [EAGLContext setCurrentContext:context];
    [self destroyFramebuffer];
    [self createFramebuffer];
	[self loadAssets];
    [self drawView];
}


- (void)loadAssets {

	// Note that each of the Sound Engine functions defined in SoundEngine.h return an OSStatus value.
	// Although the code in this application does not check for errors, you'll want to add error checking code 
	// in your own application, particularly during development.
	//Setup sound engine. Run  it at 44Khz to match the sound files
	SoundEngine_Initialize(44100);
	// Assume the listener is in the center at the start. The sound will pan as the position of the rocket changes.
	SoundEngine_SetListenerPosition(0.0, 0.0, 1.0);
	// Load each of the four sounds used in the game.
	NSBundle* bundle = [NSBundle mainBundle];
	SoundEngine_LoadEffect([[bundle pathForResource:@"punch" ofType:@"wav"] UTF8String], &sounds[kSound_Shoot]);
	SoundEngine_SetEffectLevel(&sounds[kSound_Shoot], 0.33f);
	SoundEngine_LoadEffect([[bundle pathForResource:@"explode2" ofType:@"wav"] UTF8String], &sounds[kSound_Explode]);
	SoundEngine_LoadLoopingEffect([[bundle pathForResource:@"aircraft008" ofType:@"wav"] UTF8String], NULL, NULL, &sounds[kSound_Thrust]);
	SoundEngine_SetEffectLevel(&sounds[kSound_Thrust], 0.25f);
	SoundEngine_LoadEffect([[bundle pathForResource:@"splash2" ofType:@"wav"] UTF8String], &sounds[kSound_Splash]);
	SoundEngine_SetEffectLevel(&sounds[kSound_Splash], 0.66f);
	SoundEngine_LoadEffect([[bundle pathForResource:@"wallhit" ofType:@"wav"] UTF8String], &sounds[kSound_Wallhit]);
	SoundEngine_SetEffectLevel(&sounds[kSound_Wallhit], 0.50f);
	SoundEngine_LoadEffect([[bundle pathForResource:@"whoosh2" ofType:@"wav"] UTF8String], &sounds[kSound_Whoosh]);
	SoundEngine_SetEffectLevel(&sounds[kSound_Whoosh], 0.50f);
	SoundEngine_LoadEffect([[bundle pathForResource:@"cling" ofType:@"wav"] UTF8String], &sounds[kSound_Cling]);
	SoundEngine_SetEffectLevel(&sounds[kSound_Cling], 0.66f);
	SoundEngine_LoadEffect([[bundle pathForResource:@"key2" ofType:@"wav"] UTF8String], &sounds[kSound_Key]);
	SoundEngine_SetEffectLevel(&sounds[kSound_Key], 0.88f);
	SoundEngine_LoadEffect([[bundle pathForResource:@"finish2" ofType:@"wav"] UTF8String], &sounds[kSound_Happy]);
	SoundEngine_SetEffectLevel(&sounds[kSound_Key], 0.88f);
	SoundEngine_LoadBackgroundMusicTrack([[bundle pathForResource:@"Test1" ofType:@"m4r"] UTF8String], true, false);
	SoundEngine_SetBackgroundMusicVolume(0.33f);
	SoundEngine_StartBackgroundMusic();

	gameView.musicOn = TRUE;
	
}

- (BOOL)createFramebuffer {
	
    glGenFramebuffersOES(1, &viewFramebuffer);
    glGenRenderbuffersOES(1, &viewRenderbuffer);
    
    glBindFramebufferOES(GL_FRAMEBUFFER_OES, viewFramebuffer);
    glBindRenderbufferOES(GL_RENDERBUFFER_OES, viewRenderbuffer);
    [context renderbufferStorage:GL_RENDERBUFFER_OES fromDrawable:(CAEAGLLayer*)self.layer];
    glFramebufferRenderbufferOES(GL_FRAMEBUFFER_OES, GL_COLOR_ATTACHMENT0_OES, GL_RENDERBUFFER_OES, viewRenderbuffer);
    
    glGetRenderbufferParameterivOES(GL_RENDERBUFFER_OES, GL_RENDERBUFFER_WIDTH_OES, &gameView.backingWidth);
    glGetRenderbufferParameterivOES(GL_RENDERBUFFER_OES, GL_RENDERBUFFER_HEIGHT_OES, &gameView.backingHeight);
    
    if (USE_DEPTH_BUFFER) {
        glGenRenderbuffersOES(1, &depthRenderbuffer);
        glBindRenderbufferOES(GL_RENDERBUFFER_OES, depthRenderbuffer);
        glRenderbufferStorageOES(GL_RENDERBUFFER_OES, GL_DEPTH_COMPONENT16_OES, gameView.backingWidth, gameView.backingHeight);
        glFramebufferRenderbufferOES(GL_FRAMEBUFFER_OES, GL_DEPTH_ATTACHMENT_OES, GL_RENDERBUFFER_OES, depthRenderbuffer);
    }
    
    if(glCheckFramebufferStatusOES(GL_FRAMEBUFFER_OES) != GL_FRAMEBUFFER_COMPLETE_OES) {
        NSLog(@"failed to make complete framebuffer object %x", glCheckFramebufferStatusOES(GL_FRAMEBUFFER_OES));
        return NO;
    }
	
	
	init_gw();	
	
	main_init();
	
	gameView.xRot = 0;
	gameView.yRot = 0;
	gameView.accelX=gameView.accelY=gameView.accelZ=0;
	shipRotation = 0;
	
	self.configureAccelerometer;    
	
	//SoundEngine_StopBackgroundMusic(false);
	
	[self setupView];
	
	gamePlay = [GamePlay alloc]; 
	[gamePlay initWithGameView:&gameView];
	gameIntro = [GameIntro alloc]; 
	[gameIntro initWithGameView:&gameView theGamePlay:gamePlay];
	
	[self initGameState];
	
	[[Beacon shared] startSubBeaconWithName:@"Started" timeSession:NO];
	
//	[[NSRunLoop currentRunLoop] addTimer:[ NSTimer timerWithTimeInterval:1/30.f target:self selector:@selector(timerFired:) userInfo:nil repeats:YES ] forMode:NSRunLoopCommonModes]; 
	
    return YES;
}
/*
- (void)timerFired: (NSTimer *) theTimer {

	switch(gameView.state>>8) {
		case GAME_INTRO:
			[gameIntro runControlLogic];
			break;
		case GAME_PLAY:
			[gamePlay runControlLogic];
			break;
	}		
	
}
 */

- (void)destroyFramebuffer {
    
	for(int n=0; n<NUM_TEXTURES; n++)
		if (gameView.spriteData[n])
			free(gameView.spriteData[n]);
		
	[gameView.logoTexture release];
	[gameView.backTexture release];
	
    glDeleteFramebuffersOES(1, &viewFramebuffer);
    viewFramebuffer = 0;
    glDeleteRenderbuffersOES(1, &viewRenderbuffer);
    viewRenderbuffer = 0;
    
    if(depthRenderbuffer) {
        glDeleteRenderbuffersOES(1, &depthRenderbuffer);
        depthRenderbuffer = 0;
    }
	
	[ gamePlay deinit];
	[ gamePlay dealloc ];
	[ gameIntro deinit];
	[ gameIntro dealloc ];
	
	SoundEngine_UnloadBackgroundMusicTrack();
	SoundEngine_Teardown();	

}


- (void)startAnimation {
    self.animationTimer = [NSTimer scheduledTimerWithTimeInterval:animationInterval target:self selector:@selector(drawView) userInfo:nil repeats:YES];
}


- (void)stopAnimation {
    self.animationTimer = nil;
}


- (void)setAnimationTimer:(NSTimer *)newTimer {
    [animationTimer invalidate];
    animationTimer = newTimer;
}


- (void)setAnimationInterval:(NSTimeInterval)interval {
    
    animationInterval = interval;
    if (animationTimer) {
        [self stopAnimation];
        [self startAnimation];
    }
}


- (void)dealloc {
    
	
	[[Beacon shared] endSubBeaconWithName:@"Started"];
	
    [self stopAnimation];
    
    if ([EAGLContext currentContext] == context) {
        [EAGLContext setCurrentContext:nil];
    }
    
    [context release];  
    [super dealloc];
}



#pragma mark -
#pragma mark === Touch handling  ===
#pragma mark

float distance(float x1, float y1, float x2, float y2) {
	
	int xd = x1-x2;
	int yd = y1-y2;
	
	return xd*xd+yd*yd;
}





/*
 Checks to see which view, or views, the point is in and then calls a method to perform the opening animation,
 which  makes the piece slightly larger, as if it is being picked up by the user.
 */
-(void) dispatchFirstTouchAtPoint:(CGPoint)touchPoint forEvent:(UIEvent *)event
{
	
	switch(gameView.state>>8) {
		case GAME_INTRO:
			[gameIntro dispatchFirstTouchAtPoint:&touchPoint forEvent: event];
			break;
		case GAME_PLAY:
			[gamePlay dispatchFirstTouchAtPoint:&touchPoint forEvent: event];
			break;
	}	
}


/*
 Checks to see which view, or views, the point is in and then sets the center of each moved view to the new postion.
 If views are directly on top of each other, they move together.
 */
-(void) dispatchTouchEvent:(UIView *)theView toPosition:(CGPoint)position
{
	switch(gameView.state>>8) {
		case GAME_INTRO:
			[gameIntro dispatchTouchEvent:theView toPosition:&position];
			break;
		case GAME_PLAY:
			[gamePlay dispatchTouchEvent:theView toPosition:&position];
			break;
	}	
}


/*
 Checks to see which view, or views,  the point is in and then calls a method to perform the closing animation,
 which is to return the piece to its original size, as if it is being put down by the user.
 */
- (void) dispatchTouchEndEvent:(UIView *)theView toPosition:(CGPoint)position
{   
	switch(gameView.state>>8) {
		case GAME_INTRO:
			[gameIntro dispatchTouchEndEvent:theView toPosition:&position];
			break;
		case GAME_PLAY:
			[gamePlay dispatchTouchEndEvent:theView toPosition:&position];
			break;
	}	
}

// Handles the start of a touch
- (void)touchesBegan:(NSSet *)touches withEvent:(UIEvent *)event
{
	NSUInteger numTaps = [[touches anyObject] tapCount];
	// Enumerate through all the touch objects.
	NSUInteger touchCount = 0;
	for (UITouch *touch in touches) {
		// Send to the dispatch method, which will make sure the appropriate subview is acted upon
		[self dispatchFirstTouchAtPoint:[touch locationInView:self] forEvent:nil];
		touchCount++;  
	}    
}


// Handles the continuation of a touch.
- (void)touchesMoved:(NSSet *)touches withEvent:(UIEvent *)event
{  
	
    NSUInteger touchCount = 0;
	
    // Enumerates through all touch objects
	for (UITouch *touch in touches){
        // Send to the dispatch method, which will make sure the appropriate subview is acted upon
		[self dispatchTouchEvent:[touch view] toPosition:[touch locationInView:self]];
        touchCount++;
    }
}

// Handles the end of a touch event.
- (void)touchesEnded:(NSSet *)touches withEvent:(UIEvent *)event
{
    for (UITouch *touch in touches){
        // Sends to the dispatch method, which will make sure the appropriate subview is acted upon
        [self dispatchTouchEndEvent:[touch view] toPosition:[touch locationInView:self]];
    }
}


- (void)touchesCancelled:(NSSet *)touches withEvent:(UIEvent *)event
{
    // Enumerates through all touch object
    for (UITouch *touch in touches){
        // Sends to the dispatch method, which will make sure the appropriate subview is acted upon
        [self dispatchTouchEndEvent:[touch view] toPosition:[touch locationInView:self]];
    }
}

@end
