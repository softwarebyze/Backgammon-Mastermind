// SPDX-License-Identifier: MPL-2.0
// App-owned extension of the pinned bgsage portable boundary.
#pragma once
#include "bgbot/mobile.h"
#ifdef __cplusplus
extern "C" {
#endif
char* bgsage_analyze_context(BgsageMobileEngine* engine, int operation,
    const BgsageMobileRequest* request, int max_cube_value, bool crawford_rule = true);
#ifdef __cplusplus
}
#endif
