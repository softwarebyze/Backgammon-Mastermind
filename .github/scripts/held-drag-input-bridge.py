#!/usr/bin/env python3
"""CI-only fixed Android gesture transport for the held-drag Maestro regression.

Never changes app state directly. Maestro loads/asserts the fixture; this sends
only real tap/swipe inputs, avoiding hierarchy fetches in the animation window.
The recording remains required proof that the pan actually activated in time.
"""
from http.server import BaseHTTPRequestHandler, HTTPServer
import subprocess


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200 if self.path == "/ready" else 404)
        self.end_headers()

    def do_POST(self):
        if self.path != "/held-drag":
            self.send_error(404)
            return
        # Measured from the CI portrait frame and native accessibility bounds.
        # Fail on a different target rather than send misleading coordinates.
        size = subprocess.check_output(["adb", "shell", "wm", "size"], text=True)
        if size.strip().splitlines()[-1].split(": ")[-1] != "320x640":
            self.send_error(409, "Expected CI portrait target 320x640")
            return
        try:
            # Launch both input processes in one device shell. A one-second pan
            # reaches activation distance early and holds through turn handoff.
            subprocess.run([
                "adb", "shell",
                "input tap 206 243 & tap_pid=$!; sleep 0.05; "
                "input swipe 166 371 288 288 1000; swipe_exit=$?; "
                "wait $tap_pid; tap_exit=$?; "
                "test $swipe_exit -eq 0 && test $tap_exit -eq 0",
            ], check=True, timeout=15)
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired) as error:
            self.send_error(500, str(error))
            return
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"Real tap and held pan sent; inspect recording for lift")


if __name__ == "__main__":
    HTTPServer(("127.0.0.1", 8099), Handler).serve_forever()
