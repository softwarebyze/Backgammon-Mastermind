// SPDX-License-Identifier: MPL-2.0
// Reproducible web entry points over the exact adapter used by both native apps.
#include "BgsageAnalysis.h"
#include <algorithm>
#include <cstdlib>
#include <cstring>

#ifndef SAGE_MODEL_ROOT
#define SAGE_MODEL_ROOT "/models/"
#endif

extern "C" {
BgsageMobileEngine* sage_create() {
  static const char* names[]={
    "sl_s9_purerace", "sl_s9_race_race", "sl_s9_race_att", "sl_s9_race_prim",
    "sl_s9_race_anch", "sl_s9_att_race", "sl_s9_att_att", "sl_s9_att_prim",
    "sl_s9_att_anch", "sl_s9_prim_race", "sl_s9_prim_att", "sl_s9_prim_anch",
    "sl_s9_prim_anch", "sl_s9_anch_race", "sl_s9_anch_att", "sl_s9_prim_anch",
    "sl_s9_prim_anch", "sl_s11_bg_deep", "sl_s11_bg_middle", "sl_s11_bg_double",
    "sl_s11_bg_p3", "sl_s11_bg_containment", "sl_s11_bg_snake", "sl_s11_bg_massive"
  };
  char paths[24][128]; const char* ptrs[24]; int hidden[24];
  for(int i=0;i<24;++i) {
    std::strcpy(paths[i],SAGE_MODEL_ROOT); std::strcat(paths[i],names[i]);
    std::strcat(paths[i],".weights.best"); ptrs[i]=paths[i]; hidden[i]=i==0?100:400;
  }
  return bgsage_mobile_create("backgame_pair_phased",ptrs,hidden,24,SAGE_MODEL_ROOT "bearoff_1sided.db");
}
char* sage_analyze(BgsageMobileEngine* e,const int* board,int operation,int d1,int d2,int ply,const int* context) {
  BgsageMobileRequest r{}; std::copy(board,board+26,r.board);
  r.die1=d1; r.die2=d2; r.ply=ply;
  r.cube_value=context[0]; r.cube_owner=context[1]; r.away1=context[2]; r.away2=context[3];
  r.is_crawford=context[4]; r.jacoby=context[5]; r.beaver=context[6]; r.budget_ms=1000;
  return bgsage_analyze_context(e,operation,&r,context[7],context[8]!=0);
}
char* sage_checkers(BgsageMobileEngine* e,const int* board,int d1,int d2,int ply) {
  const int context[]={1,0,0,0,0,0,0,1,1}; return sage_analyze(e,board,0,d1,d2,ply,context);
}
char* sage_cube(BgsageMobileEngine* e,const int* board,int value,int owner,int ply) {
  const int context[]={value,owner,0,0,0,1,0,32768,1}; return sage_analyze(e,board,1,0,0,ply,context);
}
const char* sage_last_error() { return bgsage_mobile_last_error(); }
}
