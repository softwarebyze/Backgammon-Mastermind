// app.config.ts imports `tsx/cjs` so the Expo CLI can load env.ts. Under Jest
// that registers a process-wide require hook which, with SDK 58's winter
// globals, breaks every later suite in the worker. Jest already compiles TS.
module.exports = {};
