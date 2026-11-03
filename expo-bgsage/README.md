# Shared game analysis

Hint, Tutor, and computer cube actions use the same app-owned portable adapter,
`ios/BgsageAnalysis.cpp`, on iOS, Android, and web. Context is relative to the
roller, including while the opponent answers a double: cube face and ownership,
points away, current Crawford game, Jacoby, beavers, cube cap, and whether the
match uses Crawford at all. The nine integer fields are serialized in
`src/cube-context.ts` and consumed by the three platform bridges.

Checker candidates are ranked by cube-aware equity when a game supplies context.
Lessons without a cube use cubeless equity. Match values are normalized equity,
not literal points won per game. Cube response values reverse the roller's
perspective. Beavers accept the first double, immediately offer a second double,
and retain the responder's ownership; raccoons are not enabled.

Standard matches retain the upstream Kazaross-XG2 match equity table. Matches
with Crawford disabled use an efficient-live-cube model (20% gammons) with the
Kazaross post-Crawford boundary, following [Tom Keith's MET construction](https://www.bkgm.com/articles/met.html).
This is a modeled table, not a new rollout table. `BgsageMatchEquity.cpp` contains
the model and retains upstream MPL attribution for the standard table/functions.
The engine supports scores through 25-away and cube faces through 32768.

`patches/apply.mjs` applies reviewed, idempotent changes to the pinned source:
32/64-bit-safe cache rotation, beavers that respect the configured cube cap,
and consistent hidden-layer sigmoid saturation on AVX, ARM and WASM.
The fetch script applies these to both native source trees; the upstream pin is
unchanged. Never modify ignored vendored sources as the only copy of a fix.

## Rebuild and verify web artifacts

Fetch the pinned engine and model assets via the normal install, then install
Emscripten 6.0.13 and run:

```sh
bash .github/scripts/build-bgsage-wasm.sh
bash .github/scripts/build-bgsage-probe.sh
/tmp/bgsage-context-probe --verify-met
node scripts/verify-bgsage-context.mjs
```

The committed JS/WASM/data are generated from the tracked shim and shared adapter.
A deliberate artifact change requires updating SHA-256 pins in
`src/lib/bgsage-artifacts.test.ts`. Every WASM analysis returns malloc-owned JSON:
the web bridge frees both that output and the input buffers. Error strings remain
borrowed. Asset versioning prevents mixing a cached older shim with this contract.
Native changes require rebuilding the native app; they cannot ship as a JS-only OTA.

The host probe checks all 625 no-Crawford MET entries for bounds, symmetry and
monotonicity. `verify-bgsage-context.mjs` compares real native and WASM candidates,
equities and cube actions, including alternating Crawford contexts. CI runs the
probe/parity checks and compiles the actual Swift/ObjC++ and Kotlin/JNI bridges.
