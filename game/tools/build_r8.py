"""Build the isolated prototype from exact R7. Never overwrites R7 or an output."""
from pathlib import Path
import re,json,base64,hashlib,sys
repo=Path(__file__).resolve().parents[2];source=repo/'START-HERE-R7.html';out=Path(sys.argv[1]).resolve()
if out.exists() or out==source:raise SystemExit('Use a new output path.')
raw=source.read_bytes()
if hashlib.sha256(raw).hexdigest()!='bba39094c254658839cd79df3375efab1386fe04138902db851ea4b878806359':raise SystemExit('R7 baseline changed; review required.')
html=raw.decode();match=re.search(r'window.ROOM_CONFIG=(.*?);window.ROOM_EMBEDDED=(.*?);</script>',html,re.S)
config,assets=map(json.loads,match.groups());model='assets/characters/r8/borup-r8-lite-rigged.glb'
config['character'].update(model=model,futureModel=model,height=1.7,rotation=[0,180,0],animations={'idle':'Idle','walk':'Walk'})
assets[model]='data:model/gltf-binary;base64,'+base64.b64encode((repo/'game'/model).read_bytes()).decode()
replacement='window.ROOM_CONFIG='+json.dumps(config,ensure_ascii=False)+';window.ROOM_EMBEDDED='+json.dumps(assets)+';</script>'
html=html[:match.start()]+replacement+html[match.end():]
m=re.search(r'<script\s+type="importmap">(.*?)</script>',html,re.S);imports=json.loads(m[1])
for name,path in [('assets.js','game/r8/src/assets.js'),('character-animation-r8.js','game/src/character-animation-r8.js')]:
 text=(repo/path).read_text().replace("'../vendor/three.module.js'","'room-module/vendor/three.module.js'")
 imports['imports']['room-module/src/'+name]='data:text/javascript;base64,'+base64.b64encode(text.encode()).decode()
html=html[:m.start(1)]+json.dumps(imports)+html[m.end(1):]
html=html.replace('</body>','<div style="position:fixed;bottom:8px;right:8px;color:white;background:#283448;padding:6px;z-index:9999">R8 Lite: технический прототип. Дефекты анимации известны.</div></body>')
out.write_text(html);assert source.read_bytes()==raw
print(json.dumps({'output':str(out),'bytes':out.stat().st_size,'R7Unchanged':True}))
