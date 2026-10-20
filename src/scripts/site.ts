function initializeSite() {
  const header = document.querySelector<HTMLElement>('[data-header]');
  if (!header) return;

  let pending = false;
  let lastY = Math.max(0, scrollY);
  let direction = 0;
  let distance = 0;
  let keyboardNavigation = false;

  function revealHeader() {
    header?.classList.remove('scroll-hidden');
    if (header) header.inert = false;
    lastY = Math.max(0, scrollY);
    direction = 0;
    distance = 0;
  }

  function updateScroll() {
    pending = false;
    if (!header) return;
    const currentY = Math.max(0, Math.min(scrollY, document.documentElement.scrollHeight - innerHeight));
    const delta = currentY - lastY;
    lastY = currentY;
    if (currentY < 80 || keyboardNavigation || header.contains(document.activeElement)) {
      revealHeader();
    } else if (Math.abs(delta) >= 1) {
      const nextDirection = Math.sign(delta);
      if (nextDirection !== direction) distance = 0;
      direction = nextDirection;
      distance += Math.abs(delta);
      if (distance >= (direction > 0 ? 32 : 10)) {
        const hide = direction > 0;
        header.classList.toggle('scroll-hidden', hide);
        header.inert = hide;
      }
    }
  }

  function updateLayout() {
    if (!header) return;
    document.documentElement.style.setProperty('--chapter-offset', `${header.offsetTop + header.offsetHeight + 16}px`);
  }

  window.addEventListener('scroll', () => {
    if (!pending) {
      pending = true;
      requestAnimationFrame(updateScroll);
    }
  }, { passive: true });
  window.addEventListener('resize', updateLayout);
  new ResizeObserver(updateLayout).observe(header);
  document.addEventListener('keydown', event => {
    if (event.key === 'Tab') {
      keyboardNavigation = true;
      revealHeader();
    }
  });
  window.addEventListener('pointerdown', () => { keyboardNavigation = false; }, { passive: true });
  window.addEventListener('wheel', () => { keyboardNavigation = false; }, { passive: true });

  updateLayout();
  document.fonts.ready.then(() => {
    updateLayout();
    const chapter = document.getElementById(location.hash.slice(1));
    if (chapter?.classList.contains('chapter')) {
      chapter.scrollIntoView({ behavior: 'instant' });
      revealHeader();
    }
  });
}

initializeSite();
