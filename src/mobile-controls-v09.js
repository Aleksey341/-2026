(() => {
  const root = document.getElementById('mobileControls');
  if (!root) return;

  const active = new Map();

  function fire(type, code) {
    window.dispatchEvent(new KeyboardEvent(type, {
      code,
      key: code,
      bubbles: true,
      cancelable: true
    }));
  }

  function press(button, code) {
    if (!code || active.has(button)) return;
    active.set(button, code);
    button.classList.add('pressed');
    fire('keydown', code);
    if (navigator.vibrate) navigator.vibrate(12);
  }

  function release(button) {
    const code = active.get(button);
    if (!code) return;
    fire('keyup', code);
    active.delete(button);
    button.classList.remove('pressed');
  }

  root.querySelectorAll('[data-key]').forEach((button) => {
    const code = button.dataset.key;

    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      button.setPointerCapture?.(event.pointerId);
      press(button, code);
    }, { passive: false });

    ['pointerup', 'pointercancel', 'lostpointercapture', 'pointerleave'].forEach((type) => {
      button.addEventListener(type, (event) => {
        event.preventDefault();
        release(button);
      }, { passive: false });
    });

    button.addEventListener('contextmenu', (event) => event.preventDefault());
  });

  // Release held directions if the browser loses focus or the page is hidden.
  function releaseAll() {
    [...active.keys()].forEach(release);
  }
  window.addEventListener('blur', releaseAll);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) releaseAll();
  });

  // Add a body flag for CSS/debugging when touch input is available.
  if (matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0) {
    document.body.classList.add('touch-device');
  }
})();
