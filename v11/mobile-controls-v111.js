(() => {
  const coarse = matchMedia('(pointer:coarse)').matches || navigator.maxTouchPoints > 0;
  if (!coarse) return;
  document.documentElement.classList.add('mobile-ui');

  const root = document.getElementById('mobileControls');
  const stick = document.getElementById('moveStick');
  const knob = document.getElementById('moveKnob');
  const look = document.getElementById('lookZone');
  const action = document.getElementById('mobileAction');
  const hint = document.getElementById('mobileHint');
  if (!root || !stick || !knob || !look || !action) return;

  root.hidden = false;
  let moveId = null;
  let lookId = null;
  let lookX = 0;

  const emitMove = (forward, turn) => dispatchEvent(new CustomEvent('hrsky:mobilemove', { detail: { forward, turn } }));
  const emitLook = dx => dispatchEvent(new CustomEvent('hrsky:mobilelook', { detail: { dx } }));

  function updateMove(e) {
    const r = stick.getBoundingClientRect();
    let x = (e.clientX - (r.left + r.width / 2)) / (r.width * .34);
    let y = (e.clientY - (r.top + r.height / 2)) / (r.height * .34);
    const len = Math.hypot(x, y);
    if (len > 1) { x /= len; y /= len; }
    knob.style.transform = `translate(${x * 31}px,${y * 31}px)`;
    emitMove(Math.abs(y) < .12 ? 0 : -y, Math.abs(x) < .12 ? 0 : -x);
  }

  function endMove(e) {
    if (e && e.pointerId !== moveId) return;
    moveId = null;
    knob.style.transform = 'translate(0,0)';
    emitMove(0, 0);
  }

  stick.addEventListener('pointerdown', e => {
    moveId = e.pointerId;
    stick.setPointerCapture(moveId);
    updateMove(e);
    hint?.classList.add('fade');
    e.preventDefault();
  });
  stick.addEventListener('pointermove', e => { if (e.pointerId === moveId) updateMove(e); });
  stick.addEventListener('pointerup', endMove);
  stick.addEventListener('pointercancel', endMove);

  look.addEventListener('pointerdown', e => {
    lookId = e.pointerId;
    look.setPointerCapture(lookId);
    lookX = e.clientX;
    hint?.classList.add('fade');
    e.preventDefault();
  });
  look.addEventListener('pointermove', e => {
    if (e.pointerId !== lookId) return;
    const dx = e.clientX - lookX;
    lookX = e.clientX;
    emitLook(dx);
    e.preventDefault();
  });
  const endLook = e => { if (e.pointerId === lookId) lookId = null; };
  look.addEventListener('pointerup', endLook);
  look.addEventListener('pointercancel', endLook);

  action.addEventListener('pointerdown', e => {
    dispatchEvent(new CustomEvent('hrsky:mobileaction'));
    hint?.classList.add('fade');
    e.preventDefault();
  });

  const target = document.getElementById('target');
  const syncAction = () => {
    const text = (target?.textContent || '').replace(/^ЛКМ\s*·\s*/,'').trim();
    const available = !!text;
    action.hidden = !available;
    if (available) action.textContent = `ОТКРЫТЬ · ${text}`;
  };
  if (target) {
    new MutationObserver(syncAction).observe(target, { childList:true, characterData:true, subtree:true });
    syncAction();
  }

  setTimeout(() => hint?.classList.add('fade'), 7000);
})();
