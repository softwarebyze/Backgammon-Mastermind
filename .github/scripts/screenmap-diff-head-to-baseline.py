#!/usr/bin/env python3
"""Turn a Screenmap .diff.scrmap (or baseline .scrmap) into a baseline-shaped zip.

screenmap-ci merge expects root map.json + screens/; PR jobs upload diffs with
base/ + head/. This copies the head side into a temp baseline bundle.
"""
from __future__ import annotations

import json
import shutil
import sys
import tempfile
import zipfile
from pathlib import Path


def main() -> int:
    if len(sys.argv) != 3:
        print(f"usage: {sys.argv[0]} <in.scrmap> <out.scrmap>", file=sys.stderr)
        return 2
    src, dest = Path(sys.argv[1]), Path(sys.argv[2])
    dest.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        with zipfile.ZipFile(src) as z:
            z.extractall(root)

        if (root / "map.json").is_file() and (root / "screens").is_dir():
            shutil.copyfile(src, dest)
            print(f"already baseline-shaped: {src} → {dest}")
            return 0

        head_map = root / "head" / "map.json"
        if not head_map.is_file():
            print(f"no root map.json or head/map.json in {src}", file=sys.stderr)
            return 1

        out = root / "out"
        out.mkdir()
        (out / "screens").mkdir()
        shutil.copyfile(head_map, out / "map.json")
        head_screens = root / "head" / "screens"
        if head_screens.is_dir():
            shutil.copytree(head_screens, out / "screens", dirs_exist_ok=True)
        for name in ("capture-status.json", "graph.json"):
            p = root / "head" / name
            if p.is_file():
                shutil.copyfile(p, out / name)

        man = json.loads((root / "manifest.json").read_text())
        app = dict(man.get("app") or {})
        platform = app.get("platform") or "ios-simulator"
        plat = str(platform)
        label = "ios" if plat.startswith("ios") else "android" if "android" in plat else "ios"
        head = man.get("head") or {}
        out_man = {
            "formatVersion": 3,
            "flowFormat": "argent",
            "generator": "screenmap-ci/0.1+head-from-diff",
            "kind": "baseline",
            "app": {
                "name": app.get("name") or "app",
                "scheme": app.get("scheme"),
                "platform": platform,
                "device": app.get("device"),
                "mode": app.get("mode") or "expo-router",
                "platforms": [
                    {"platform": label, "label": platform, "device": app.get("device")}
                ],
            },
            "source": {"commit": head.get("commit"), "ref": head.get("ref")},
            "generatedAt": head.get("generatedAt") or man.get("generatedAt"),
        }
        (out / "manifest.json").write_text(json.dumps(out_man, indent=2) + "\n")

        with zipfile.ZipFile(dest, "w", compression=zipfile.ZIP_DEFLATED) as z:
            for path in out.rglob("*"):
                if path.is_file():
                    z.write(path, path.relative_to(out).as_posix())

    print(f"converted diff head → baseline: {src} → {dest}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
