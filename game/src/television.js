import * as T from '../vendor/three.module.js';
import {assetURL} from './assets.js';
export async function makeTelevision(world,config){
 const {width:W,depth:D,height:H}=config.room;
 // Bounds of the display inside the supplied TV-wall texture (not its frame).
 const a=.294,b=.705,top=.229,bottom=.646;
 const textures=[];for(const path of config.television.images){const t=await new T.TextureLoader().loadAsync(assetURL(path));t.colorSpace=T.SRGBColorSpace;textures.push(t);}const texture=textures[0];
 const screen=new T.Mesh(new T.PlaneGeometry((b-a)*D,(bottom-top)*H),new T.MeshBasicMaterial({map:texture}));
 screen.position.set(-W/2+.014,H*(1-(top+bottom)/2),D*(.5-(a+b)/2));screen.rotation.y=Math.PI/2;screen.visible=false;world.add(screen);
 const button=new T.Mesh(new T.CylinderGeometry(.05,.05,.025,24),new T.MeshStandardMaterial({color:'#ed202a',emissive:'#820b10',emissiveIntensity:.5,roughness:.4}));
 button.position.set(-W/2+.028,H*(1-.658),D*(.5-.686));button.rotation.z=-Math.PI/2;button.name='tv-channel-button';world.add(button);
 const hit=new T.Mesh(new T.SphereGeometry(.105,12,8),new T.MeshBasicMaterial({visible:false}));hit.position.copy(button.position);world.add(hit);
 const sw=(b-a)*D,sh=(bottom-top)*H,backing=new T.Mesh(screen.geometry,new T.MeshBasicMaterial({color:'#080b18'}));backing.position.copy(screen.position);backing.position.x-=.003;backing.rotation.copy(screen.rotation);backing.visible=false;world.add(backing);
 let elapsed=0,channel=0;function toggle(){elapsed=0;channel=(channel+1)%(textures.length+1);screen.visible=backing.visible=channel>0;if(channel){const t=textures[channel-1],ratio=t.image.width/t.image.height;screen.material.map=t;screen.scale.set(Math.min(1,ratio*sh/sw),Math.min(1,sw/(ratio*sh)),1);}return channel;}
 function reset(){elapsed=0;channel=0;screen.visible=backing.visible=false;}

 function update(dt){elapsed+=dt;if(elapsed>=(config.television.interval||15))toggle();}
 return {screen,button,hit,toggle,reset,update,getChannel:()=>channel};
}
