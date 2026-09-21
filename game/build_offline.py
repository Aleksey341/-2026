"""Bundle local dependencies and config-referenced GLBs/textures into one HTML."""
from pathlib import Path
import json,base64,re,mimetypes
ROOT=Path(__file__).resolve().parent
cfg=json.loads((ROOT/'config/room.json').read_text(encoding='utf-8'));cache={};imports={}
def datauri(data,mime):return 'data:'+mime+';base64,'+base64.b64encode(data).decode()
def module(path):
 path=path.resolve()
 if path in cache:return cache[path]
 if not path.is_relative_to(ROOT):raise ValueError('Module outside project')
 key='room-module/'+path.relative_to(ROOT).as_posix();cache[path]=key
 text=path.read_text(encoding='utf-8')
 def replace(m):
  name=m.group(2)
  if not name.startswith('.'):return m.group(0)
  return m.group(1)+module(path.parent/name)+m.group(3)
 text=re.sub(r'''(from\s+['"])([^'"]+)(['"])''',replace,text)
 imports[key]=datauri(text.encode(),'text/javascript');return key
def strings(x):
 if isinstance(x,dict):
  for v in x.values():yield from strings(v)
 elif isinstance(x,list):
  for v in x:yield from strings(v)
 elif isinstance(x,str) and x.startswith('assets/'):yield x
embedded={}
for name in set(strings(cfg)):
 p=(ROOT/name).resolve()
 if not p.is_relative_to(ROOT):raise ValueError('Asset outside project')
 if not p.exists():print('Missing asset; built-in fallback will be used:',name);continue
 if p.suffix=='.gltf':raise ValueError('Offline packaging needs GLB with embedded textures. Export '+name+' as GLB.')
 embedded[name]=datauri(p.read_bytes(),mimetypes.guess_type(str(p))[0] or 'application/octet-stream')
html=(ROOT/'index.html').read_text(encoding='utf-8')
setup='<script>window.ROOM_CONFIG='+json.dumps(cfg,ensure_ascii=False).replace('<','\\u003c')+';window.ROOM_EMBEDDED='+json.dumps(embedded)+';</script>'
entry=module(ROOT/'src/game.js')
maptag='<script type="importmap">'+json.dumps({'imports':imports})+'</script>'
html=html.replace('<script type="module" src="src/game.js"></script>',setup+maptag+'<script type="module">import '+json.dumps(entry)+';</script>')
html=html.replace('if(location.protocol===\'file:\')','if(false)')
(ROOT/'Play-offline.html').write_text(html,encoding='utf-8')
print('Created Play-offline.html. Rebuild after changing assets/config.')
