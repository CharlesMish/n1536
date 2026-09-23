/* Shared reading presentation. Scientific content and controls stay in their
   original DOM nodes; without JavaScript, authored details remain readable. */
(() => {
  function setup() {
    const notes = document.getElementById('study-notes');
    let dialog = document.querySelector('dialog.study-dialog');
    let returnFocus;
    if (notes && !dialog && typeof window.HTMLDialogElement?.prototype.showModal === 'function') {
      dialog = document.createElement('dialog');
      dialog.className = 'study-dialog';
      dialog.id = 'study-reading-dialog';
      dialog.setAttribute('aria-labelledby', 'study-reading-title');
      const close = document.createElement('button');
      close.type = 'button'; close.className = 'close-reading'; close.textContent = 'Close';
      const heading = document.createElement('h2');
      heading.id = 'study-reading-title';
      heading.textContent = document.querySelector('h1')?.textContent.replace(/\s+/g, ' ').trim() || 'Read the study';
      notes.before(dialog);
      dialog.append(close, heading, notes);
      notes.classList.add('dialog-notes');
      const open = trigger => {
        if (trigger && !dialog.contains(trigger)) returnFocus = trigger;
        notes.open = true;
        if (!dialog.open) dialog.showModal();
        dialog.scrollTop = 0;
        close.focus({ preventScroll: true });
      };
      for (const link of document.querySelectorAll('a[href="#study-notes"]')) {
        link.setAttribute('aria-haspopup', 'dialog');
        link.setAttribute('aria-controls', dialog.id);
        link.addEventListener('click', event => {
          if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
          event.preventDefault(); open(link);
        });
      }
      for (const link of document.querySelectorAll('a[href^="#"]')) {
        const target = document.getElementById(link.hash.slice(1));
        if (!target || target === notes || !notes.contains(target) || dialog.contains(link)) continue;
        link.setAttribute('aria-haspopup', 'dialog');
        link.setAttribute('aria-controls', dialog.id);
        link.addEventListener('click', event => {
          if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
          event.preventDefault();
          open(link);
          if (target instanceof HTMLDetailsElement) target.open = true;
          target.scrollIntoView({ block: 'start' });
        });
      }
      // Direct note links and in-study audit links remain valid entry points.
      notes.addEventListener('toggle', () => { if (notes.open && !dialog.open) open(document.activeElement); });
      if (notes.open || location.hash === '#study-notes') open(document.querySelector('a[href="#study-notes"]'));
    }
    if (!dialog) return;
    dialog.dataset.sharedReading = '';
    const close = dialog.querySelector('.close-reading');
    close?.setAttribute('aria-label', 'Close study explanation');
    close?.addEventListener('click', () => dialog.close());
    dialog.addEventListener('keydown', event => event.stopPropagation());
    // A click in the reading panel's padding is not a backdrop click.
    dialog.addEventListener('click', event => {
      const rect = dialog.getBoundingClientRect();
      if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
    });
    dialog.addEventListener('close', () => {
      if (notes?.classList.contains('dialog-notes')) notes.open = false;
      returnFocus?.focus({ preventScroll: true });
    });
    for (const trigger of document.querySelectorAll('.read-study, a[href="#study-notes"], #readBtn')) {
      trigger.dataset.studyReadingTrigger = '';
      trigger.textContent = 'Read the study';
      trigger.addEventListener('click', () => { returnFocus = trigger; }, { capture: true });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup, { once: true });
  else setup();
})();
