/* global http */
// Start .github/scripts/held-drag-input-bridge.py before running this Android flow.
const response = http.post('http://127.0.0.1:8099/held-drag', { body: '' });
if (!response.ok) {
  throw new Error(`Held-drag input bridge failed: ${response.body}`);
}
