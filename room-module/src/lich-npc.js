import * as T from 'room-module/vendor/three.module.js';
import {GLTFLoader} from 'room-module/vendor/loaders/GLTFLoader.js';
import {assetURL} from 'room-module/src/assets.js';

export function createLichNPC({hall,onModalChange=()=>{},modelURL='assets/characters/stained-glass-lich/lich_kp12_video_textured.glb'}){
 const root=new T.Group();root.name='NPC_stained_glass_lich';
 const initialZ=hall.reactor.g.position.z;
 root.position.set(-4.05,0,initialZ+3.45);hall.group.add(root);
 const state={ready:false,opened:false,loading:true,error:null};
 const overlay=document.createElement('div');overlay.id='lich-npc-dialog';overlay.hidden=true;
 Object.assign(overlay.style,{position:'fixed',inset:'0',zIndex:'120',background:'rgba(5,7,20,.7)',display:'none',placeItems:'center',padding:'22px'});
 const panel=document.createElement('section');Object.assign(panel.style,{width:'min(520px,94vw)',background:'#161a31',border:'1px solid #b590e2',borderRadius:'18px',padding:'22px',color:'#fff',font:'16px system-ui'});
 panel.innerHTML='<div style="display:flex;justify-content:space-between;gap:12px;align-items:center"><b style="font-size:22px">Витражный лич</b><button data-close aria-label="Закрыть диалог" style="padding:8px 12px;color:#fff;background:#29304f;border:1px solid #b590e2;border-radius:10px">×</button></div><p data-line style="line-height:1.6"></p><div data-choices style="display:grid;gap:8px"></div>';
 overlay.append(panel);document.body.append(overlay);
 const line=panel.querySelector('[data-line]'),choices=panel.querySelector('[data-choices]');
 const replies=[['Кто вы?','Я хранитель этого зала, сотканный из света, памяти и цифровых витражей.'],['Расскажите о зале','Здесь представлены проекты HR-трансформации. Исследуйте четыре витрины и активируйте реактор.'],['Для чего реактор?','Каждая завершённая витрина передаёт реактору энергию. После активации всех четырёх откроется путь в Офис будущего.'],['До встречи','Пусть каждый шаг приближает вас к будущему.']];
 let actor=null,mixer=null,t=0;
 function near(pos){return state.ready&&hall.group.visible&&Math.hypot(pos.x-root.position.x,pos.z-root.position.z)<2.4}
 function close(){if(!state.opened)return;state.opened=false;overlay.hidden=true;overlay.style.display='none';onModalChange(false)}
 function open(){if(!state.ready||state.opened)return false;state.opened=true;overlay.hidden=false;overlay.style.display='grid';onModalChange(true);line.textContent='Приветствую тебя в Зале активации. Здесь собираются смыслы, технологии и будущее.';choices.replaceChildren();for(const [title,response] of replies){const b=document.createElement('button');b.textContent=title;Object.assign(b.style,{padding:'12px',color:'#fff',background:'#303557',border:'1px solid #67639a',borderRadius:'11px',textAlign:'left'});b.onclick=()=>{line.textContent=response;if(title==='До встречи')close()};choices.append(b)}panel.querySelector('[data-close]').focus();return true}
 panel.querySelector('[data-close]').onclick=close;overlay.addEventListener('pointerdown',e=>{if(e.target===overlay)close()});
 async function load(){try{const gltf=await new GLTFLoader().loadAsync(assetURL(modelURL));actor=gltf.scene;const box=new T.Box3().setFromObject(actor),h=box.getSize(new T.Vector3()).y;if(h<.01)throw Error('invalid mesh height');actor.scale.setScalar(2.7/h);const aligned=new T.Box3().setFromObject(actor);actor.position.set(-(aligned.min.x+aligned.max.x)/2,-aligned.min.y,-(aligned.min.z+aligned.max.z)/2);actor.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});root.add(actor);state.ready=true;if(gltf.animations.length){mixer=new T.AnimationMixer(actor);const idle=gltf.animations.find(a=>/idle|rest|breath/i.test(a.name))||gltf.animations[0];mixer.clipAction(idle).play()}}catch(e){state.error=String(e);console.warn('[LICH NPC] 3D file missing or invalid',e)}finally{state.loading=false}}
 function update(dt,playerPos,visible=true){t+=dt;if(!state.ready||!visible)return;if(mixer)mixer.update(dt);else actor.position.y=.006*Math.sin(t*1.4);if(near(playerPos)){const a=Math.atan2(playerPos.x-root.position.x,playerPos.z-root.position.z);root.rotation.y+=Math.atan2(Math.sin(a-root.rotation.y),Math.cos(a-root.rotation.y))*Math.min(1,dt*2.2)}}
 function reset(){close();t=0}
 load();return {root,state,near,open,close,reset,update,get isOpen(){return state.opened}};
}