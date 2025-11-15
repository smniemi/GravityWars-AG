//
//  EAGLView.h
//  GravityWars
//
//  Created by Sami Niemi on 5/2/09.
//  Copyright Scalado AB 2009. All rights reserved.
//


#import <UIKit/UIKit.h>
#import <OpenGLES/EAGL.h>
#import <OpenGLES/ES1/gl.h>
#import <OpenGLES/ES1/glext.h>

#import "memory.h"

#import "Texture2D.h"

#import "GameState.h"
#import "GameView.h"
#import "GamePlay.h"
#import "GameIntro.h"



/*
This class wraps the CAEAGLLayer from CoreAnimation into a convenient UIView subclass.
The view content is basically an EAGL surface you render your OpenGL scene into.
Note that setting the view non-opaque will only work if the EAGL surface has an alpha channel.
*/
@interface EAGLView : UIView <UIAccelerometerDelegate> {
    
@private

	NSThread* gwThread;
    
    EAGLContext *context;
    
    /* OpenGL names for the renderbuffer and framebuffers used to render to this view */
    GLuint viewRenderbuffer, viewFramebuffer;
    
    /* OpenGL name for the depth buffer that is attached to viewFramebuffer, if it exists (0 if it does not exist) */
    GLuint depthRenderbuffer;
    
    NSTimer *animationTimer;
    NSTimeInterval animationInterval;
	
	GameView gameView;
	GamePlay* gamePlay;
	GameIntro* gameIntro;
	
}



@property NSTimeInterval animationInterval;


- (void)timerFired: (NSTimer *) theTimer;
- (void)startAnimation;
- (void)stopAnimation;
- (void)drawView;

@end

int frame_number;
