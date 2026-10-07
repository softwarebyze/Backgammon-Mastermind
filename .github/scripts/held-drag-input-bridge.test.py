"""Transport guards: never silently pass a wrong target or failed input."""
import importlib.util
from pathlib import Path
import subprocess
import threading
import sys

sys.dont_write_bytecode = True
import unittest
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.request import Request, urlopen

spec = importlib.util.spec_from_file_location(
    "bridge", Path(__file__).with_name("held-drag-input-bridge.py")
)
bridge = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bridge)


class BridgeTests(unittest.TestCase):
    def setUp(self):
        self.server = bridge.HTTPServer(("127.0.0.1", 0), bridge.Handler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.url = f"http://127.0.0.1:{self.server.server_port}"

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()

    def post(self, path="/held-drag"):
        return urlopen(Request(self.url + path, data=b"", method="POST"))

    def test_wrong_target_does_not_inject(self):
        with patch.object(bridge.subprocess, "check_output", return_value="Physical size: 1080x1920\n"), patch.object(bridge.subprocess, "run") as run:
            with self.assertRaises(HTTPError) as error:
                self.post()
            self.assertEqual(error.exception.code, 409)
            error.exception.close()
            run.assert_not_called()

    def test_unknown_path_does_not_inject(self):
        with patch.object(bridge.subprocess, "run") as run:
            with self.assertRaises(HTTPError) as error:
                self.post("/arbitrary-command")
            self.assertEqual(error.exception.code, 404)
            error.exception.close()
            run.assert_not_called()

    def test_failed_input_is_not_success(self):
        with patch.object(bridge.subprocess, "check_output", return_value="Physical size: 320x640\n"), patch.object(bridge.subprocess, "run", side_effect=subprocess.CalledProcessError(1, "adb")):
            with self.assertRaises(HTTPError) as error:
                self.post()
            self.assertEqual(error.exception.code, 500)
            error.exception.close()

    def test_real_inputs_only_and_both_exit_codes_checked(self):
        with patch.object(bridge.subprocess, "check_output", return_value="Physical size: 1080x1920\nOverride size: 320x640\n"), patch.object(bridge.subprocess, "run") as run:
            with self.post() as response:
                self.assertEqual(response.status, 200)
            args = run.call_args.args[0]
            self.assertEqual(args[:2], ["adb", "shell"])
            self.assertIn("input tap 206 243 &", args[2])
            self.assertIn("input swipe 166 371 288 288 1000", args[2])
            self.assertIn("test $swipe_exit -eq 0 && test $tap_exit -eq 0", args[2])
            self.assertEqual(run.call_args.kwargs, {"check": True, "timeout": 15})


if __name__ == "__main__":
    unittest.main()
