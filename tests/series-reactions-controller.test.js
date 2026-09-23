import test from 'node:test';
import assert from 'node:assert/strict';

test('the case rail and paired-load slider update the exhibit from its opening state', async () => {
  class FakeElement {
    constructor(id = '', dataset = {}) {
      this.id = id;
      this.dataset = dataset;
      this.attributes = {};
      this.listeners = {};
      this.textContent = '';
      this.value = '';
      this.hidden = false;
      this.open = false;
    }
    setAttribute(name, value) { this.attributes[name] = value; }
    addEventListener(event, callback) { this.listeners[event] = callback; }
    fire(event, value) { this.listeners[event]?.({ currentTarget: this, target: { value }, preventDefault() {} }); }
    querySelector() { return new FakeElement(); }
    focus() {}
    scrollIntoView() {}
  }

  const ids = ['loadPlot', 'momentPlot', 'deflectionPlot', 'caseNumber', 'caseName', 'caseReading', 'peakMoment', 'midDeflection', 'pairTool', 'pairOutput', 'staticPreview', 'interactive', 'announcement', 'theme', 'pairPosition', 'study-notes', 'readingLink', 'referenceLegend'];
  const elements = Object.fromEntries(ids.map(id => [id, new FakeElement(id)]));
  const buttons = ['center', 'pair', 'uniform'].map(value => new FakeElement('', { case: value }));
  globalThis.Element = FakeElement;
  globalThis.document = {
    documentElement: { dataset: {} },
    getElementById: id => elements[id],
    querySelectorAll: selector => selector === '[data-case]' ? buttons : [],
    querySelector: () => ({ contains: () => false }),
    addEventListener() {},
  };
  globalThis.localStorage = { getItem: () => null, setItem() {} };

  try {
    await import('../public/series/assets/same-reactions.js');
    assert.equal(elements.peakMoment.textContent, '1/8');
    assert.equal(elements.midDeflection.textContent, '11/768');
    assert.equal(elements.interactive.hidden, false);
    assert.match(elements.momentPlot.innerHTML, /Bending moment on a fixed scale/);
    buttons[2].fire('click');
    assert.equal(elements.midDeflection.textContent, '5/384');
    assert.equal(elements.pairTool.hidden, true);
    buttons[0].fire('click');
    assert.equal(elements.peakMoment.textContent, '1/4');
    buttons[1].fire('click');
    elements.pairPosition.fire('input', '0.50');
    assert.equal(elements.midDeflection.textContent, '0.02083');
    assert.equal(elements.pairOutput.value, '0.50');
    assert.equal(elements.pairTool.hidden, false);
  } finally {
    delete globalThis.Element;
    delete globalThis.document;
    delete globalThis.localStorage;
  }
});
