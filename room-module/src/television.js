import * as T from 'room-module/vendor/three.module.js';
import {assetURL} from 'room-module/src/assets.js';

export async function makeTelevision(world,config){
 const {width:W,depth:D,height:H}=config.room;
 // Bounds of the display inside the supplied TV-wall texture (not its frame).
 const a=.294,b=.705,top=.229,bottom=.646;
 const sw=(b-a)*D,sh=(bottom-top)*H;

 const textures=[];
 for(const path of (config.television.images||[])){
  const t=await new T.TextureLoader().loadAsync(assetURL(path));
  t.colorSpace=T.SRGBColorSpace;textures.push(t);
 }

 let video=null,videoTex=null;
 const videoPath=config.television.video;
 if(videoPath){
  video=document.createElement('video');
  video.src=assetURL(videoPath);
  video.crossOrigin='anonymous';
  video.loop=true;
  video.muted=true;
  video.playsInline=true;
  video.setAttribute('playsinline','');
  video.setAttribute('muted','');
  video.preload='auto';
  videoTex=new T.VideoTexture(video);
  videoTex.colorSpace=T.SRGBColorSpace;
  videoTex.minFilter=T.LinearFilter;
  videoTex.magFilter=T.LinearFilter;
  videoTex.generateMipmaps=false;
 }

 const firstMap=videoTex||textures[0]||null;
 const screen=new T.Mesh(
  new T.PlaneGeometry(sw,sh),
  new T.MeshBasicMaterial({map:firstMap,toneMapped:false})
 );
 screen.position.set(-W/2+.014,H*(1-(top+bottom)/2),D*(.5-(a+b)/2));
 screen.rotation.y=Math.PI/2;
 screen.visible=false;
 world.add(screen);

 const button=new T.Mesh(
  new T.CylinderGeometry(.05,.05,.025,24),
  new T.MeshStandardMaterial({color:'#ed202a',emissive:'#820b10',emissiveIntensity:.5,roughness:.4})
 );
 button.position.set(-W/2+.028,H*(1-.658),D*(.5-.686));
 button.rotation.z=-Math.PI/2;
 button.name='tv-channel-button';
 world.add(button);

 const hit=new T.Mesh(new T.SphereGeometry(.105,12,8),new T.MeshBasicMaterial({visible:false}));
 hit.position.copy(button.position);
 world.add(hit);

 const backing=new T.Mesh(screen.geometry,new T.MeshBasicMaterial({color:'#080b18'}));
 backing.position.copy(screen.position);backing.position.x-=.003;
 backing.rotation.copy(screen.rotation);backing.visible=false;world.add(backing);

 // channel 0 = off; 1 = video (if any); then still images
 const hasVideo=Boolean(videoTex);
 const total= (hasVideo?1:0)+textures.length;
 let elapsed=0,channel=0;

 function fitMap(map){
  const img=map.image;
  const iw=img?.videoWidth||img?.width||1;
  const ih=img?.videoHeight||img?.height||1;
  const ratio=iw/Math.max(1,ih);
  screen.scale.set(Math.min(1,ratio*sh/sw),Math.min(1,sw/(ratio*sh)),1);
 }

 function playVideo(){
  if(!video)return;
  const p=video.play();
  if(p&&typeof p.catch==='function')p.catch(()=>{});
 }
 function pauseVideo(){
  if(!video)return;
  try{video.pause();}catch{}
 }

 function applyChannel(){
  const on=channel>0;
  screen.visible=backing.visible=on;
  if(!on){pauseVideo();return;}
  if(hasVideo&&channel===1){
   screen.material.map=videoTex;
   screen.material.needsUpdate=true;
   if(video.readyState>=2)fitMap(videoTex);
   else video.addEventListener('loadeddata',()=>fitMap(videoTex),{once:true});
   playVideo();
   return;
  }
  pauseVideo();
  const idx=channel-1-(hasVideo?1:0);
  const t=textures[idx];
  if(!t)return;
  screen.material.map=t;
  screen.material.needsUpdate=true;
  fitMap(t);
 }

 function toggle(){
  elapsed=0;
  channel=total?(channel+1)%(total+1):0;
  applyChannel();
  return channel;
 }
 function reset(){
  elapsed=0;channel=0;applyChannel();
 }
 function update(dt){
  elapsed+=dt;
  if(videoTex)videoTex.needsUpdate=true;
  // Keep muted looping video on by default once room is ready; still allow cycle via button.
  if(hasVideo&&channel===0&&elapsed>.4){channel=1;applyChannel();}
  else if(channel>0&&!hasVideo&&elapsed>=(config.television.interval||15))toggle();
  else if(channel>1&&elapsed>=(config.television.interval||15))toggle();
 }

 // Auto-start muted video shortly after load (also covered in update).
 if(hasVideo){
  video.addEventListener('canplay',()=>{if(channel===1)playVideo();},{once:true});
 }

 return {screen,button,hit,toggle,reset,update,getChannel:()=>channel,video};
}
