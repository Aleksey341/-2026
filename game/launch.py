from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from functools import partial
import webbrowser,threading
ROOT=Path(__file__).resolve().parent
class Handler(SimpleHTTPRequestHandler):
 def end_headers(self):
  self.send_header('Cache-Control','no-store');super().end_headers()
 def log_message(self,fmt,*args):
  if '404' in str(args):super().log_message(fmt,*args)
try:server=ThreadingHTTPServer(('127.0.0.1',8765),partial(Handler,directory=str(ROOT)))
except OSError:server=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(ROOT)))
url=f'http://127.0.0.1:{server.server_port}/index.html'
print('Переговорная:',url,'\nДля остановки закройте это окно или нажмите Ctrl+C.',flush=True)
threading.Timer(.5,lambda:webbrowser.open(url)).start()
try:server.serve_forever()
except KeyboardInterrupt:pass
finally:server.server_close()
