"""Render real GLB bind-pose views and inspect structure without browser WebGL.

Dependencies: trimesh, pyrender, pygltflib, numpy, Pillow.
Usage: PYOPENGL_PLATFORM=egl python render_character_r8.py MODEL.glb NEW_OUTPUT_DIR
Does not rig, animate, retexture or modify the input GLB.
"""
import os
os.environ.setdefault('PYOPENGL_PLATFORM', 'egl')
import json
import sys
from pathlib import Path
import numpy as np
import trimesh
import pyrender
from pygltflib import GLTF2
from PIL import Image

def camera_pose(position, target):
    position, target = np.array(position, float), np.array(target, float)
    back = position-target; back /= np.linalg.norm(back)
    right = np.cross([0,1,0], back); right /= np.linalg.norm(right)
    up = np.cross(back, right)
    pose = np.eye(4); pose[:3,:3] = np.column_stack([right, up, back]); pose[:3,3] = position
    return pose

def render(path, output):
    path, output = Path(path), Path(output)
    if output.exists():
        raise ValueError('Use a new output directory; existing results are preserved.')
    document = GLTF2().load(str(path))
    if document.asset.version != '2.0':
        raise ValueError('Expected GLB/glTF 2.0')
    source = trimesh.load_scene(path, process=False)
    bounds = source.bounds
    height = float(bounds[1,1]-bounds[0,1])
    if not np.isfinite(height) or height <= 0:
        raise ValueError('Invalid model height')
    center = (bounds[0]+bounds[1])/2
    translation = np.eye(4); translation[:3,3] = [-center[0],-bounds[0,1],-center[2]]
    scale = np.eye(4); scale[:3,:3] *= 1.7/height
    scene = pyrender.Scene(bg_color=[.12,.15,.2,1], ambient_light=[.6,.6,.6])
    mesh_report=[]
    for name in source.graph.nodes_geometry:
        transform, geometry_name = source.graph[name]
        mesh = source.geometry[geometry_name].copy()
        mesh_report.append({'node':name,'vertices':len(mesh.vertices),'triangles':len(mesh.faces),
                            'watertight':bool(mesh.is_watertight),'finiteVertices':bool(np.isfinite(mesh.vertices).all())})
        mesh.apply_transform(scale @ translation @ transform)
        scene.add(pyrender.Mesh.from_trimesh(mesh, smooth=True))
    camera=pyrender.PerspectiveCamera(yfov=np.deg2rad(38));camera_node=scene.add(camera)
    key=scene.add(pyrender.DirectionalLight(color=np.ones(3),intensity=2))
    renderer=pyrender.OffscreenRenderer(768,768)
    output.mkdir(parents=True)
    views={'front':([0,.95,3.4],[0,.9,0]),'side':([3.4,.95,0],[0,.9,0]),
           'back':([0,.95,-3.4],[0,.9,0]),'face':([0,1.58,.65],[0,1.58,0])}
    try:
        for name,(position,target) in views.items():
            pose=camera_pose(position,target);scene.set_pose(camera_node,pose);scene.set_pose(key,pose)
            image,depth=renderer.render(scene)
            if not (depth>0).any():raise ValueError('Empty rendered view: '+name)
            Image.fromarray(image).save(output/(name+'.png'))
    finally:renderer.delete()
    report={'file':path.name,'bytes':path.stat().st_size,'originalBounds':bounds.tolist(),
            'displayHeight':1.7,'meshes':mesh_report,'materials':len(document.materials),
            'textures':len(document.textures),'skins':[{'joints':len(s.joints),'names':[document.nodes[i].name for i in s.joints]} for s in document.skins],
            'animations':[{'name':a.name,'channels':len(a.channels)} for a in document.animations],
            'limitations':['Views show bind pose, not skin deformation.','Front is defined as +Z; inspect orientation before acceptance.',
                          'Face target assumes normal humanoid proportions.','Rendering does not prove similarity, UV quality or animation quality.']}
    (output/'inspection.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'output':str(output),'skins':len(document.skins),'animations':len(document.animations),'views':list(views)}))

if __name__=='__main__':
    if len(sys.argv)!=3:raise SystemExit('Usage: render_character_r8.py MODEL.glb NEW_OUTPUT_DIR')
    render(sys.argv[1],sys.argv[2])
