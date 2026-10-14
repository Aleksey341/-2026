"""Recover the published R7 baseline without changing R7 or game/src.

Usage: python3 game/tools/extract_r7.py OUTPUT_DIRECTORY
The output contains the original offline HTML plus editable modules and assets.
"""
from pathlib import Path
import base64
import hashlib
import json
import re
import sys

repo = Path(__file__).resolve().parents[2]
source = repo / 'START-HERE-R7.html'
destination = Path(sys.argv[1]).resolve()
if destination.exists():
    raise SystemExit('Use a new output directory to preserve previous work.')
html = source.read_text(encoding='utf-8')
match = re.search(r'window.ROOM_CONFIG=(.*?);window.ROOM_EMBEDDED=(.*?);</script>', html, re.S)
if not match:
    raise SystemExit('R7 configuration or asset map missing.')
config, assets = (json.loads(part) for part in match.groups())
maps = re.findall(r'<script\s+type="importmap">(.*?)</script>', html, re.S)
if len(maps) != 1:
    raise SystemExit('Expected exactly one R7 import map.')
modules = json.loads(maps[0])['imports']
files = {}

def decode(uri):
    header, payload = uri.split(',', 1)
    if not header.startswith('data:') or not header.endswith(';base64'):
        raise ValueError('Expected embedded base64 data.')
    return base64.b64decode(payload, validate=True)

def add(name, data):
    path = destination / name
    if not path.resolve().is_relative_to(destination):
        raise ValueError('Unsafe embedded path.')
    files[path] = data

for name, uri in modules.items():
    if not name.startswith('room-module/'):
        raise ValueError('Unexpected module name: ' + name)
    add(name[len('room-module/'):], decode(uri))
for name, uri in assets.items():
    add(name, decode(uri))
add('config/room.json', (json.dumps(config, ensure_ascii=False, indent=2)+'\n').encode())
add('baseline-R7.html', source.read_bytes())
manifest = {str(path.relative_to(destination)): hashlib.sha256(data).hexdigest() for path, data in files.items()}
add('baseline-manifest.json', (json.dumps(manifest, indent=2)+'\n').encode())
for path, data in files.items():
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    if path.read_bytes() != data:
        raise RuntimeError('Write verification failed: ' + str(path))
print(json.dumps({'directory': str(destination), 'files': len(files), 'modules': len(modules), 'assets': len(assets), 'r7_sha256': hashlib.sha256(source.read_bytes()).hexdigest()}, indent=2))
