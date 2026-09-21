from pathlib import Path
import numpy as np
from pygltflib import GLTF2,Accessor,BufferView,Node,Skin,Animation,AnimationSampler,AnimationChannel,AnimationChannelTarget
from scipy.spatial.transform import Rotation as R
import sys
P=Path(sys.argv[1]);g=GLTF2().load(str(P));blob=bytearray(g.binary_blob())
def arr(i):
 a=g.accessors[i];b=g.bufferViews[a.bufferView];dt={5126:'<f4',5125:'<u4',5123:'<u2'}[a.componentType];n={'VEC3':3,'VEC2':2,'SCALAR':1,'VEC4':4,'MAT4':16}[a.type];return np.ndarray((a.count,n),dtype=dt,buffer=blob,offset=(b.byteOffset or 0)+(a.byteOffset or 0),strides=(b.byteStride or n*np.dtype(dt).itemsize,np.dtype(dt).itemsize)).copy()
def add(a,typ,ct=5126):
 a=np.asarray(a,dtype={5126:'<f4',5123:'<u2'}[ct]);blob.extend(b'\0'*((-len(blob))%4));off=len(blob);blob.extend(a.tobytes());bv=len(g.bufferViews);g.bufferViews.append(BufferView(buffer=0,byteOffset=off,byteLength=a.nbytes));i=len(g.accessors);g.accessors.append(Accessor(bufferView=bv,componentType=ct,count=len(a),type=typ,min=a.min(axis=0).tolist(),max=a.max(axis=0).tolist()));return i
for m in g.meshes:
 for p in m.primitives:
  for key in ['POSITION','NORMAL']:
   a=arr(getattr(p.attributes,key));a=a[:,[0,2,1]];a[:,1]*=-1;setattr(p.attributes,key,add(a,'VEC3'))
for node in g.nodes:
 if node.mesh is not None:node.matrix=None;node.rotation=None;node.translation=None;node.scale=None
v=arr(g.meshes[0].primitives[0].attributes.POSITION);H=float(v[:,1].max())
joints=[('Hips',None,[0,.53,0]),('Spine',0,[0,.66,0]),('Chest',1,[0,.76,0]),('Head',2,[0,.89,0])]
for side,s in [('Left',1),('Right',-1)]:
 base=len(joints);joints.extend([(side+'UpperArm',2,[s*.12,.775,0]),(side+'ForeArm',base,[s*.17,.645,0]),(side+'Hand',base+1,[s*.20,.53,.015])])
for side,s in [('Left',1),('Right',-1)]:
 base=len(joints);joints.extend([(side+'Thigh',0,[s*.075,.53,0]),(side+'Shin',base,[s*.077,.285,0]),(side+'Foot',base+1,[s*.078,.065,.025])])
pos=np.array([q[2] for q in joints])*H;base=len(g.nodes)
for i,(name,parent,_) in enumerate(joints):g.nodes.append(Node(name=name,translation=(pos[i]-(pos[parent] if parent is not None else 0)).tolist(),children=[]))
for i,(_,pa,_) in enumerate(joints):
 if pa is not None:g.nodes[base+pa].children.append(base+i)
g.scenes[g.scene or 0].nodes.append(base);inv=np.tile(np.eye(4),(len(joints),1,1));inv[:,:3,3]=-pos
ib=add(inv.transpose(0,2,1).reshape(-1,16),'MAT4');g.skins=[Skin(inverseBindMatrices=ib,joints=list(range(base,base+len(joints))),skeleton=base)]
for n in g.nodes:
 if n.mesh is not None:n.skin=0
for mesh in g.meshes:
 for prim in mesh.primitives:
  q=arr(prim.attributes.POSITION)/H;x,y,z=q.T;ax=abs(x);w=np.zeros((len(q),len(joints)));legs=y<.55;upper=np.clip((y-.25)/.07,0,1);foot=np.clip((.115-y)/.065,0,1)
  for s,start in [(1,10),(-1,13)]:
   mask=legs&(x*s>=0);w[mask,start]=upper[mask];w[mask,start+1]=(1-upper[mask])*(1-foot[mask]);w[mask,start+2]=(1-upper[mask])*foot[mask]
  torso=~legs;chest=np.clip((y-.68)/.07,0,1);w[torso,1]=1-chest[torso];w[torso,2]=chest[torso];head=np.clip((y-.82)/.04,0,1);w*=1-head[:,None];w[:,3]+=head
  arm=np.clip((ax-(.105+np.clip(.74-y,0,.23)*.12))/.015,0,1)*(y>.35)*(y<.81)
  for s,start in [(1,4),(-1,7)]:
   a=arm*(x*s>0);w*=1-a[:,None];fore=np.clip((.69-y)/.075,0,1);hand=np.clip((.565-y)/.04,0,1);w[:,start]+=a*(1-fore);w[:,start+1]+=a*fore*(1-hand);w[:,start+2]+=a*fore*hand
  ids=np.argsort(w,axis=1)[:,-4:];ww=np.take_along_axis(w,ids,axis=1);ww/=ww.sum(axis=1,keepdims=True);prim.attributes.JOINTS_0=add(ids,'VEC4',5123);prim.attributes.WEIGHTS_0=add(ww,'VEC4')
def between(a,b):
 a=a/np.linalg.norm(a);b=b/np.linalg.norm(b);c=np.cross(a,b);d=np.dot(a,b)
 return R.identity() if np.linalg.norm(c)<1e-6 else R.from_rotvec(c/np.linalg.norm(c)*np.arccos(np.clip(d,-1,1)))
def arm_pose(start,target):
 sh=pos[start]/H;el=pos[start+1]/H;hand=pos[start+2]/H;L1=np.linalg.norm(el-sh);L2=np.linalg.norm(hand-el);vec=target-sh;d=min(np.linalg.norm(vec),L1+L2-.002);axis=vec/np.linalg.norm(vec);a=(L1*L1-L2*L2+d*d)/(2*d);h=np.sqrt(max(0,L1*L1-a*a));out=np.array([np.sign(sh[0]),-.1,0.]);out-=axis*np.dot(out,axis);out/=np.linalg.norm(out);ep=sh+axis*a+out*h;q1=between(el-sh,ep-sh);q2=between(hand-el,q1.inv().apply(target-ep));return q1,q2
g.animations=[]
for name,duration in [('Walk',1)]:
 times=np.linspace(0,duration,49);rot={i:[] for i in range(len(joints))}
 for t in times:
  rr=[R.identity() for _ in joints]
  if name=='Walk':
   a=np.sin(t*np.pi*2);rr[10]=R.from_euler('x',-.36*a);rr[13]=R.from_euler('x',.36*a);rr[11]=R.from_euler('x',.48*max(0,-a));rr[14]=R.from_euler('x',.48*max(0,a))
   for start,s in [(4,1),(7,-1)]:rr[start]=R.from_euler('xz',[s*.27*a,-s*.22]);rr[start+1]=R.from_euler('x',-.12)
  elif name=='Idle':rr[1]=R.from_euler('z',.012*np.sin(t*np.pi/2));rr[4],rr[5]=arm_pose(4,np.array([.13,.55,.055]));rr[7]=R.from_euler('z',.22)
  else:
   knots=[0,.45,1.05,1.9,2.15,2.4];ys=[.53,.52,.68,.90,.90,.54];zs=[.015,.31,.30,.14,.14,.025];xs=[.235,.10,.10,.105,.105,.22]
   for start,s in [(4,1),(7,-1)]:rr[start],rr[start+1]=arm_pose(start,np.array([s*np.interp(t,knots,xs),np.interp(t,knots,ys),np.interp(t,knots,zs)]))
  for i,r in enumerate(rr):rot[i].append(r.as_quat())
 an=Animation(name=name,samplers=[],channels=[]);ti=add(times[:,None],'SCALAR')
 for i,qs in rot.items():
  si=len(an.samplers);an.samplers.append(AnimationSampler(input=ti,output=add(qs,'VEC4'),interpolation='LINEAR'));an.channels.append(AnimationChannel(sampler=si,target=AnimationChannelTarget(node=base+i,path='rotation')))
 g.animations.append(an)
g.buffers[0].byteLength=len(blob);g.set_binary_blob(bytes(blob));g.save_binary(sys.argv[2]);print('Rigged:',len(joints),'joints',H)
