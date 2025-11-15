//
//  GravityWarsAppDelegate.m
//  GravityWars
//
//  Created by Sami Niemi on 5/2/09.
//  Copyright Scalado AB 2009. All rights reserved.
//

#import "GravityWarsAppDelegate.h"
#import "EAGLView.h"

#import "Beacon.h"

#import "memory.h"

@implementation GravityWarsAppDelegate

@synthesize window;
@synthesize glView;

#define kFilename @"settings"

//int totalNumberOfLevels = 14;
//int completedNumberOfLevels = 0;

- (NSString*) dataFilePath {

	NSArray *paths = NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask,YES);
	NSString *documentsDirectory = [paths objectAtIndex:0];
	return [documentsDirectory stringByAppendingPathComponent:kFilename];
	
}

- (void)applicationWillTerminate:(UIApplication *)application {

	
	NSMutableArray *array = [[NSMutableArray alloc] init];
	NSNumber *level = [NSNumber numberWithInteger:completedNumberOfLevels];
	[array addObject:level];
    [level release];
	for (int i=1; i<=TOTAL_NUMBER_OF_LEVELS; i++) {
		NSNumber* score;
		score = [NSNumber numberWithInteger:highScore[i-1]];
		[array addObject:score];
		[score release];
		score = [NSNumber numberWithFloat:bestTime[i-1]];
		[array addObject:score];
		[score release];
	}
	
	[array writeToFile:[self dataFilePath] atomically:YES];
	[array release];
	
	[Beacon endBeacon];
}

- (void)applicationDidFinishLaunching:(UIApplication *)application {
   
	 
	
//								 "16217510ac371059685c83d8"
	NSString *applicationCode = @"aab05bbac4f913ea5325e0d7302b2006";
    [Beacon initAndStartBeaconWithApplicationCode:applicationCode
								  useCoreLocation:NO useOnlyWiFi:NO];
	
	
	
	// Load Highscore
	completedNumberOfLevels = 0;
	for(int i=0;i<TOTAL_NUMBER_OF_LEVELS; i++) {
		highScore[i]=99999;
		bestTime[i]=9999.0f;
	}	
	
	firstTimeLaunched = FALSE;
	
	NSString* filePath = [self dataFilePath];
	if ([[NSFileManager defaultManager] fileExistsAtPath:filePath]) {
		
		NSArray *array = [[NSArray alloc] initWithContentsOfFile:filePath];
		
		completedNumberOfLevels = [[array objectAtIndex:0] integerValue];

		for (int i=0; i<TOTAL_NUMBER_OF_LEVELS && i<([ array count ]-1)/2; i++) {  // 3 levels => count=4, 0,    1,2,   2,3,   4,5
			
			highScore[i] = [ [array objectAtIndex:2*i+1] integerValue ];
			bestTime[i] = [ [ array objectAtIndex:2*i+2] floatValue ];
		}
		[array release];
		 
	}
	else {
		firstTimeLaunched = TRUE;
	}
	
	//completedNumberOfLevels = 13; // REMOVE IN FINAL

	glView.animationInterval = 1.0 / 30.0;
	[glView startAnimation];
}


- (void)applicationWillResignActive:(UIApplication *)application {
	glView.animationInterval = 1.0 / 5.0;
}


- (void)applicationDidBecomeActive:(UIApplication *)application {
	glView.animationInterval = 1.0 / 30.0;
}


- (void)dealloc {
	[window release];
	[glView release];
	[super dealloc];
}

@end
