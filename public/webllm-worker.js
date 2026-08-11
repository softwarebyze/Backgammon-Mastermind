/* global self */
/**
 * WebLLM worker (static). Loaded from /webllm-worker.js so inference
 * stays off the UI thread and is less likely to freeze/crash the tab.
 */
import { WebWorkerMLCEngineHandler } from 'https://esm.sh/@mlc-ai/web-llm@0.2.84';

const handler = new WebWorkerMLCEngineHandler();
self.onmessage = (msg) => {
  handler.onmessage(msg);
};
