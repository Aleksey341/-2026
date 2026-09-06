(() => {
  const H=window.HR4; if(!H?.character||!H?.world)return;
  const {data,state,character,world}=H;
  const board=document.getElementById('board'),finale=document.getElementById('finale'),sectionNo=document.getElementById('sectionNo'),progressBar=document.getElementById('progressBar'),pauseBtn=document.getElementById('pauseAuto'),nextBtn=document.getElementById('nextAuto');
  let index=0,stage='idle',phase='problem',phaseTime=0,freeShown=null,paused=false;
  const phaseDur={problem:12,action:16,result:22};
  const mainTarget=section=>new BABYLON.Vector3(0,0,Math.max(0,section.room.z-3.0));

  function setHud(section){
    const i=Math.max(0,data.sections.indexOf(section));
    sectionNo.textContent=section?.final?'06 / 06':String(i+1).padStart(2,'0')+' / 06';
    const z=character.root.position.z;progressBar.style.width=`${BABYLON.Scalar.Clamp((z/76)*100,0,100)}%`;
  }
  function showBoard(section,p='result'){
    if(!section||section.final)return;
    phase=p;const label=p==='problem'?'ЗАДАЧА':p==='action'?'ЧТО СДЕЛАЛИ':'РЕЗУЛЬТАТ';
    const text=p==='problem'?section.problem:p==='action'?section.action:section.result;
    board.style.setProperty('--accent',section.accent);
    board.innerHTML=`<div class="meta">SECTION ${section.no} · DEMO ${data.demoYear}</div><h2>${section.title}</h2><h3>${label}</h3><p>${text}</p>${p==='result'?`<div class="metrics">${section.metrics.map(m=>`<div class="metric"><b>${m[0]}</b><span>${m[1]}</span></div>`).join('')}</div>`:''}`;
    board.classList.remove('hidden');H.emit('board:show',{section,phase:p});
  }
  function hideBoard(){board.classList.add('hidden');H.emit('board:hide');}
  function showFinale(){hideBoard();finale.classList.remove('hidden');H.emit('finale');}
  function hideFinale(){finale.classList.add('hidden');}

  function issueTarget(){
    const s=data.sections[index];if(!s)return;
    if(stage==='toMain')character.goTo(mainTarget(s),2.45);
    if(stage==='toRoom')character.goTo(world.targets[s.id],2.2);
    if(stage==='return')character.goTo(new BABYLON.Vector3(0,0,s.room.z),2.35);
  }
  function beginAuto(){
    index=0;stage='toMain';phaseTime=0;paused=false;hideBoard();hideFinale();character.setPose(new BABYLON.Vector3(0,0,-3.2),0);issueTarget();
  }
  function beginFree(){index=0;stage='idle';paused=false;hideBoard();hideFinale();character.cancelAuto();}
  H.on('mode',mode=>mode==='auto'?beginAuto():beginFree());

  pauseBtn?.addEventListener('click',()=>{
    if(state.mode!=='auto')return;paused=!paused;state.autoPaused=paused;pauseBtn.textContent=paused?'ПРОДОЛЖИТЬ':'ПАУЗА';
    if(paused)character.cancelAuto();else issueTarget();
  });
  nextBtn?.addEventListener('click',()=>{
    if(state.mode!=='auto')return;
    if(stage==='board'){if(phase==='problem'){phase='action';phaseTime=0;showBoard(data.sections[index],'action');}else if(phase==='action'){phase='result';phaseTime=0;showBoard(data.sections[index],'result');}else{hideBoard();stage='return';issueTarget();}}
  });

  H.registerUpdate(dt=>{
    if(!state.running)return;
    const current=data.sections[Math.min(index,data.sections.length-1)];setHud(current);
    if(state.mode==='auto'){
      if(paused)return;
      const s=data.sections[index];if(!s)return;
      if(stage==='toMain' && character.isAt(mainTarget(s),.55)){stage='toRoom';issueTarget();return;}
      if(stage==='toRoom' && character.isAt(world.targets[s.id],.55)){
        character.cancelAuto();
        if(s.final){stage='final';showFinale();return;}
        stage='board';phase='problem';phaseTime=0;showBoard(s,'problem');return;
      }
      if(stage==='board'){
        phaseTime+=dt;
        if(phaseTime>=phaseDur[phase]){
          phaseTime=0;
          if(phase==='problem'){phase='action';showBoard(s,'action');}
          else if(phase==='action'){phase='result';showBoard(s,'result');}
          else{hideBoard();stage='return';issueTarget();}
        }
        return;
      }
      if(stage==='return' && character.isAt(new BABYLON.Vector3(0,0,s.room.z),.65)){
        index++; if(index>=data.sections.length){stage='final';return;} stage='toMain';issueTarget();
      }
    } else if(state.mode==='free'){
      let nearest=null,best=999;
      for(const s of data.sections){const d=BABYLON.Vector3.Distance(character.root.position,world.targets[s.id]);if(d<best){best=d;nearest=s;}}
      if(nearest?.final && best<2.4){showFinale();freeShown='future';}
      else if(nearest && !nearest.final && best<3.0){if(freeShown!==nearest.id){hideFinale();showBoard(nearest,'result');freeShown=nearest.id;}}
      else if(best>5.0 && freeShown){hideBoard();hideFinale();freeShown=null;}
    }
  });

  H.presentation={showBoard,hideBoard,showFinale};
})();