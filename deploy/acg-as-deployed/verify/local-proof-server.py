#!/usr/bin/env python3
"""Local stand-in for the published site, used ONLY to prove the repaired
verifier can go GREEN against a correct deploy of the NEW build.

Serves dist-aiciv/ at /moon-astra/ and passes /moon-astra/api/* through to the
real production API, which is exactly the shape Netlify serves in production.
Nothing here is deployed anywhere; it listens on 127.0.0.1.
"""
import http.server, os, socketserver, ssl, sys, urllib.request, urllib.error

ROOT = sys.argv[1]          # the build dir (dist-aiciv)
PORT = int(sys.argv[2])
API = sys.argv[3].rstrip("/")


class H(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        p = path.split("?", 1)[0].split("#", 1)[0]
        if not p.startswith("/moon-astra"):
            return os.path.join(ROOT, "__no_such_prefix__")
        rel = p[len("/moon-astra"):].lstrip("/")
        if rel == "":
            rel = "index.html"
        return os.path.join(ROOT, rel)

    def do_GET(self):
        if self.path.startswith("/moon-astra/api/"):
            tail = self.path[len("/moon-astra/api/"):]
            url = f"{API}/api/{tail}"
            try:
                with urllib.request.urlopen(url, timeout=20) as r:
                    body = r.read()
                    self.send_response(r.status)
                    self.send_header("Content-Type", r.headers.get("Content-Type", "application/json"))
                    self.send_header("Content-Length", str(len(body)))
                    self.end_headers()
                    self.wfile.write(body)
            except urllib.error.HTTPError as e:
                body = e.read()
                self.send_response(e.code)
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
            except Exception as e:
                self.send_error(502, str(e))
            return
        return super().do_GET()

    def log_message(self, *a):
        pass


class S(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


S(("127.0.0.1", PORT), H).serve_forever()
