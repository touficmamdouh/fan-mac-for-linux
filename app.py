#!/usr/bin/env python3
"""Local-only fan dashboard; privileged changes go through a fixed pkexec helper."""
from __future__ import annotations

import argparse
import json
import os
import re
import secrets
import stat
import subprocess
import threading
import time
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
STATIC = ROOT / "static"
BASE = Path(os.environ.get("FAN_SYSFS_BASE", "/sys/devices/platform/applesmc.768"))
MODE_FILE = Path(os.environ.get("FAN_MODE_FILE", "/run/smart-fan-mode"))
SERVICE = "smart-fan.service"
CONTROL = Path("/opt/fan-dashboard/control-mode.sh")


def command(args: list[str], timeout: int = 4) -> str | None:
    try:
        result = subprocess.run(args, capture_output=True, text=True, timeout=timeout, check=False)
        return result.stdout.strip() if result.returncode == 0 else None
    except (OSError, subprocess.TimeoutExpired):
        return None


def read_temperature() -> float | None:
    output = command(["sensors"], timeout=5)
    if output is None:
        return None
    found: list[float] = []
    for line in output.splitlines():
        if "°C" not in line:
            continue
        before_unit = line.split("°C", 1)[0]
        match = re.search(r"([+-]?\d+(?:\.\d+)?)\s*$", before_unit)
        if match:
            found.append(float(match.group(1)))
    return max(found) if found else None


def read_int(path: Path) -> int | None:
    try:
        return int(path.read_text().strip())
    except (OSError, ValueError):
        return None


def status() -> dict:
    mode = None
    try:
        candidate = MODE_FILE.read_text().strip()
        if candidate in ("quiet", "boost"):
            mode = candidate
    except OSError:
        pass
    active = command(["systemctl", "is-active", SERVICE])
    # The controller script treats a missing mode file as its quiet default.
    if mode is None and active == "active":
        mode = "quiet"
    return {
        "temperature": read_temperature(),
        "fans": [read_int(BASE / f"fan{i}_input") for i in range(1, 4)],
        "mode": mode,
        "service": active or "غير متاح",
        "updated": int(time.time()),
    }


class Handler(BaseHTTPRequestHandler):
    server_version = "FanDashboard/1.0"

    def log_message(self, _format: str, *_args) -> None:
        return

    def set_response_headers(self, content_type: str) -> None:
        self.send_header("Content-Type", content_type)
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Content-Security-Policy", "default-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'; img-src 'self' data:")

    def json_response(self, code: int, body: dict) -> None:
        payload = json.dumps(body, ensure_ascii=False).encode()
        self.send_response(code)
        self.set_response_headers("application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_GET(self) -> None:
        path = urlparse(self.path).path
        if path == "/api/status":
            self.json_response(200, status())
            return
        assets = {"/": (STATIC / "index.html", "text/html; charset=utf-8"),
                  "/app.css": (STATIC / "app.css", "text/css; charset=utf-8"),
                  "/app.js": (STATIC / "app.js", "text/javascript; charset=utf-8")}
        asset = assets.get(path)
        if asset is None:
            self.send_error(404)
            return
        content = asset[0].read_bytes()
        if path == "/":
            content = content.replace(b"__DASHBOARD_TOKEN__", self.server.token.encode())
        self.send_response(200)
        self.set_response_headers(asset[1])
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    def do_POST(self) -> None:
        origin = self.headers.get("Origin", "")
        host = self.headers.get("Host", "")
        expected = f"http://127.0.0.1:{self.server.server_port}"
        if host != f"127.0.0.1:{self.server.server_port}" or origin != expected:
            self.json_response(403, {"error": "رفض الطلب لأنه ليس من اللوحة المحلية."})
            return
        if not secrets.compare_digest(self.headers.get("X-Dashboard-Token", ""), self.server.token):
            self.json_response(403, {"error": "انتهت صلاحية الجلسة؛ أعد تحميل الصفحة."})
            return
        if urlparse(self.path).path != "/api/mode":
            self.json_response(404, {"error": "المسار غير موجود."})
            return
        try:
            length = min(int(self.headers.get("Content-Length", "0")), 1024)
            data = json.loads(self.rfile.read(length))
        except (ValueError, json.JSONDecodeError):
            self.json_response(400, {"error": "تعذر قراءة الطلب."})
            return
        mode = data.get("mode") if isinstance(data, dict) else None
        if mode not in ("quiet", "boost"):
            self.json_response(400, {"error": "الوضع المطلوب غير صالح."})
            return
        try:
            helper_stat = CONTROL.stat()
            if (not stat.S_ISREG(helper_stat.st_mode) or helper_stat.st_uid != 0
                    or helper_stat.st_mode & 0o022):
                raise OSError("unsafe control helper")
        except OSError:
            self.json_response(503, {"error": "مساعد التحكم المحمي غير مثبت أو صلاحياته غير آمنة. ثبّت اللوحة أولًا."})
            return
        try:
            result = subprocess.run(["pkexec", str(CONTROL), mode], capture_output=True,
                                    text=True, timeout=120, check=False)
        except (OSError, subprocess.TimeoutExpired):
            self.json_response(503, {"error": "تعذر تشغيل طلب الصلاحية. تأكد من وجود pkexec ومكوّن المصادقة."})
            return
        if result.returncode:
            message = result.stderr.strip() or "لم يتم اعتماد تغيير الوضع."
            self.json_response(409, {"error": message[:240]})
            return
        self.json_response(200, {"ok": True, "status": status()})


def main() -> None:
    parser = argparse.ArgumentParser(description="لوحة مراوح iMac المحلية")
    parser.add_argument("--port", type=int, default=int(os.environ.get("FAN_DASHBOARD_PORT", "8765")))
    parser.add_argument("--no-browser", action="store_true")
    args = parser.parse_args()
    if os.geteuid() == 0:
        raise SystemExit("شغّل اللوحة كمستخدم عادي، وليس عبر sudo.")
    server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    server.token = secrets.token_urlsafe(32)
    url = f"http://127.0.0.1:{server.server_port}/"
    print(f"لوحة المراوح: {url}  (Ctrl+C للإيقاف)", flush=True)
    if not args.no_browser:
        threading.Timer(0.5, webbrowser.open, args=(url,)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nتم إيقاف اللوحة.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
