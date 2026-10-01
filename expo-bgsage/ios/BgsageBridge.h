// BgsageBridge.h — Objective-C++ facade over the bgsage mobile C API.
// Swift calls this; the C struct with its int[26] board stays behind this wall.
#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface BgsageBridge : NSObject

/// modelPaths: 24 weight-file paths in strategy order (index 0 = 100 hidden
/// units, indices 1..23 = 400). bearoffPath: path to bearoff_1sided.db.
- (instancetype)initWithModelPaths:(NSArray<NSString *> *)modelPaths
                       bearoffPath:(NSString *)bearoffPath;

/// board: 26 NSNumbers, player-on-roll perspective (0 = opp bar, 25 = my bar).
/// Returns the engine's JSON response string.
- (NSString *)analyzeCheckers:(NSArray<NSNumber *> *)board
                         die1:(int)die1
                         die2:(int)die2
                          ply:(int)ply;

/// cubeOwner: 0 = centered, 1 = player on roll owns, 2 = opponent owns.
/// Returns the engine's JSON response string.
- (NSString *)analyzeCube:(NSArray<NSNumber *> *)board
                cubeValue:(int)cubeValue
                cubeOwner:(int)cubeOwner
                      ply:(int)ply;

@end

NS_ASSUME_NONNULL_END
