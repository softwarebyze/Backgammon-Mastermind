// BgsageBridge.mm — Objective-C++ implementation over bgbot/mobile.h.
#import "BgsageBridge.h"

#include "BgsageAnalysis.h"

#include <string>
#include <vector>

namespace {
struct BridgeState {
  std::vector<std::string> files;   // owns the path strings (incl. bearoff last)
  std::vector<const char*> ptrs;    // 24 model paths, borrowed from files
  BgsageMobileEngine* engine = nullptr;
};

NSString* RunAnalyze(BridgeState* st, int op, const BgsageMobileRequest& req, int limit = 32768, bool crawfordRule = true) {
  if (!st || !st->engine) {
    const char* e = bgsage_mobile_last_error();
    NSString* msg = e ? [NSString stringWithUTF8String:e] : @"engine failed to initialize";
    return [NSString stringWithFormat:@"{\"error\":\"%@\"}", msg];
  }
  char* j = bgsage_analyze_context(st->engine, op, &req, limit, crawfordRule);
  NSString* s =
      j ? [NSString stringWithUTF8String:j] : @"{\"error\":\"engine returned null\"}";
  bgsage_mobile_free(j);
  return s;
}

void FillBoard(BgsageMobileRequest& r, NSArray<NSNumber*>* board) {
  for (int i = 0; i < 26 && i < (int)[board count]; i++) r.board[i] = [board[i] intValue];
}
}  // namespace

@implementation BgsageBridge {
  BridgeState* _st;
}

- (instancetype)initWithModelPaths:(NSArray<NSString*>*)modelPaths
                       bearoffPath:(NSString*)bearoffPath {
  self = [super init];
  if (self) {
    _st = new BridgeState();
    for (NSString* p in modelPaths) _st->files.push_back([p UTF8String]);
    _st->files.push_back([bearoffPath UTF8String]);  // index 24: bearoff
    for (size_t i = 0; i < 24; i++) _st->ptrs.push_back(_st->files[i].c_str());
    // Index 0 = 100 hidden units; indices 1..23 = 400.
    static const int kHidden[24] = {100, 400, 400, 400, 400, 400, 400, 400, 400,
                                    400, 400, 400, 400, 400, 400, 400, 400, 400,
                                    400, 400, 400, 400, 400, 400};
    _st->engine = bgsage_mobile_create("backgame_pair_phased", _st->ptrs.data(),
                                       kHidden, 24, _st->files[24].c_str());
  }
  return self;
}

- (void)dealloc {
  if (_st) {
    bgsage_mobile_destroy(_st->engine);
    delete _st;
  }
}

- (NSString*)analyzeCheckers:(NSArray<NSNumber*>*)board
                       die1:(int)die1
                       die2:(int)die2
                        ply:(int)ply {
  BgsageMobileRequest r{};
  FillBoard(r, board);
  r.die1 = die1;
  r.die2 = die2;
  r.ply = ply;
  r.cube_value = 1;
  r.cube_owner = 0;  // centered
  r.jacoby = 0;
  r.budget_ms = 1000;
  return RunAnalyze(_st, /*op=*/0, r, 1);
}

- (NSString*)analyzeCube:(NSArray<NSNumber*>*)board
               cubeValue:(int)cubeValue
               cubeOwner:(int)cubeOwner
                     ply:(int)ply {
  BgsageMobileRequest r{};
  FillBoard(r, board);
  r.ply = ply;
  r.cube_value = cubeValue;
  r.cube_owner = cubeOwner;
  r.jacoby = 1;
  r.budget_ms = 1000;
  return RunAnalyze(_st, /*op=*/1, r);
}

- (NSString*)analyzePosition:(NSArray<NSNumber*>*)board
                       dice:(NSArray<NSNumber*>*)dice
                        ply:(int)ply
                    context:(NSArray<NSNumber*>*)context
                  operation:(int)operation {
  if (board.count != 26 || dice.count != 2 || context.count != 9)
    return @"{\"error\":\"invalid request shape\"}";
  BgsageMobileRequest r{};
  FillBoard(r, board);
  r.die1 = dice[0].intValue; r.die2 = dice[1].intValue; r.ply = ply;
  r.cube_value = context[0].intValue; r.cube_owner = context[1].intValue;
  r.away1 = context[2].intValue; r.away2 = context[3].intValue;
  r.is_crawford = context[4].intValue; r.jacoby = context[5].intValue;
  r.beaver = context[6].intValue; r.budget_ms = 1000;
  return RunAnalyze(_st, operation, r, context[7].intValue, context[8].boolValue);
}
@end
