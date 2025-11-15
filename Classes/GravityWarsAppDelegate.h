//
//  GravityWarsAppDelegate.h
//  GravityWars
//
//  Created by Sami Niemi on 5/2/09.
//  Copyright Scalado AB 2009. All rights reserved.
//

#import <UIKit/UIKit.h>

@class EAGLView;

@interface GravityWarsAppDelegate : NSObject <UIApplicationDelegate> {
    UIWindow *window;
    EAGLView *glView;
}

@property (nonatomic, retain) IBOutlet UIWindow *window;
@property (nonatomic, retain) IBOutlet EAGLView *glView;

@end

