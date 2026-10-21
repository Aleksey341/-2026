"""Run from local clone: python apply_to_repo.py C:\\path\\to\\-2026
Creates START-HERE-R16-FURNITURE.html and copies the GLB models; original R15 untouched.
"""
from pathlib import Path
import argparse, json, re, shutil
parser=argparse.ArgumentParser()
parser.add_argument('repo', help='Local -2026 repository root')
a=parser.parse_args(); repo=Path(a.repo).resolve(); here=Path(__file__).parent
src=repo/'START-HERE-R15.html'
if not src.is_file():raise SystemExit(f'File not found: {src}')
html=src.read_text(encoding='utf-8')
pattern=r'window\.ROOM_CONFIG\s*=\s*(\{.*?\})\s*;\s*</script>'
m=re.search(pattern,html,re.S)
if not m: raise SystemExit('window.ROOM_CONFIG JSON was not found; source differs from expected R15')
config=json.loads(m.group(1))
updates={'sofa':'assets/models/room1-sofa-r16.glb','coffee-table':'assets/models/room1-coffee-table-r16.glb'}
for key,path in updates.items():
 if key not in config['objects']:raise SystemExit(f'Object missing: {key}')
 config['objects'][key]['model']=path
 config['objects'][key]['enabled']=True
# Preserve room, positions, rotations, fit, and collisions from existing R15.
updated=json.dumps(config,ensure_ascii=False,separators=(',',':'))
html=html[:m.start(1)]+updated+html[m.end(1):]
html=html.replace('Итоги 2026 — HR будущего · R15','Итоги 2026 — HR будущего · R16 Furniture')
# Change module requests for fresh asset/script resources, not functionality.
html=html.replace('v=r15-businessman-v3','v=r16-furniture-v1')
output=repo/'START-HERE-R16-FURNITURE.html'
if output.exists():raise SystemExit(f'Will not overwrite existing version: {output}')
for path in updates.values():
 target=repo/path
 if target.exists():raise SystemExit(f'Will not overwrite model: {target}')
for path in updates.values():
 target=repo/path;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(here/path,target)
output.write_text(html,encoding='utf-8')
print('DONE: '+str(output))
for path in updates.values():print('  '+str(repo/path))
print('Preview URL after publishing: https://aleksey341.github.io/-2026/START-HERE-R16-FURNITURE.html?v=r16-furniture-v1')
