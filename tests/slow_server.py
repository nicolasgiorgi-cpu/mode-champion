# Sert la démo (site-demo) sur :8897 ; /tmp/mc-slow.json = {"chemin": secondes} pour ralentir des fichiers
import http.server, socketserver, json, os, time, sys
ROOT='/home/claude/site-demo'; FLAG='/tmp/mc-slow.json'
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self,*a,**k): super().__init__(*a, directory=ROOT, **k)
    def log_message(self,*a): pass
    def do_GET(self):
        try: slow=json.load(open(FLAG)) if os.path.exists(FLAG) else {}
        except Exception: slow={}
        path=self.path.split('?')[0]
        for k,v in slow.items():
            if path==k: time.sleep(v)
        return super().do_GET()
class S(socketserver.ThreadingMixIn, http.server.HTTPServer): daemon_threads=True; allow_reuse_address=True
S(('localhost',8897),H).serve_forever()
