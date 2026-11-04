// SPDX-License-Identifier: MPL-2.0
// A host CLI for native/WASM parity checks; no device or platform framework.
#include "BgsageAnalysis.h"
#include <cstdlib>
#include <iostream>
#include <cassert>
#include <cmath>
#include <string>
#include "bgbot/match_equity.h"
namespace bgbot { extern thread_local bool bgsage_crawford_rule; }
extern "C" BgsageMobileEngine* sage_create();
extern "C" char* sage_analyze(BgsageMobileEngine*,const int*,int,int,int,int,const int*);
int main(int argc,char** argv) {
  if(argc==2 && std::string(argv[1])=="--verify-met") {
    using namespace bgbot;
    bgsage_crawford_rule=false;
    for(int a=1;a<=25;++a) for(int b=1;b<=25;++b) {
      const auto value=get_met(a,b,false);
      assert(std::isfinite(value) && value>=0 && value<=1);
      assert(std::abs(value+get_met(b,a,false)-1)<0.00001);
      if(a>1) assert(get_met(a-1,b,false)>=value-0.00001);
      if(b>1) assert(get_met(a,b-1,false)<=value+0.00001);
    }
    assert(std::abs(get_met(1,2,false)-0.51197)<0.00001);
    assert(std::abs(get_met(2,2,false)-0.5)<0.00001);
    bgsage_crawford_rule=true;
    assert(std::abs(get_met(1,2,false)-0.67736)<0.00001);
    std::cout<<"PASS no-Crawford MET: 625 bounded, symmetric, monotonic entries; standard table unchanged\n";
    return 0;
  }
  if(argc!=40) return 2;
  int a[39]; for(int i=0;i<39;++i) a[i]=std::atoi(argv[i+1]);
  auto* engine=sage_create();
  char* result=sage_analyze(engine,a+4,a[0],a[2],a[3],a[1],a+30);
  if(result) { std::cout<<result; bgsage_mobile_free(result); }
  else { std::cerr<<bgsage_mobile_last_error(); return 1; }
  bgsage_mobile_destroy(engine);
}
