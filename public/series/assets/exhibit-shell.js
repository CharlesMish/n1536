/* Presentation navigation; no study models or values are changed here. */
(() => {
  const notes = document.getElementById('study-notes');
  let readingTrigger = null;
  for (const link of document.querySelectorAll('a[href="#study-notes"]')) {
    link.addEventListener('click', event => {
      if (!notes || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      readingTrigger = link;
      notes.open = true;
      notes.querySelector('summary')?.focus({ preventScroll: true });
      notes.scrollIntoView({ block: 'start' });
    });
  }
  notes?.addEventListener('toggle', () => {
    if (!notes.open && readingTrigger) {
      readingTrigger.focus();
      readingTrigger = null;
    }
  });

  document.addEventListener('keydown', event => {
    if (event.defaultPrevented || event.repeat || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    const target = event.target;
    if (!(target instanceof Element) || target.closest('input,select,textarea,[contenteditable],canvas,svg,[role="img"],dialog')) return;
    if (notes?.open && notes.contains(target)) return;
    const rail = document.querySelector('.exhibit-switcher');
    if (!rail) return;
    const buttons = [...rail.querySelectorAll('button')].filter(button => !button.disabled && button.getClientRects().length);
    let next = Number(event.key) - 1;
    if (/^[1-4]$/.test(event.key) && next < buttons.length) {
      event.preventDefault();
      buttons[next].click();
      return;
    }
    if (!rail.contains(target) || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const current = Math.max(0, buttons.indexOf(target.closest('button')));
    next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 :
      (current + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
    if (buttons[next]) {
      event.preventDefault();
      buttons[next].focus();
      buttons[next].click();
    }
  });
})();
