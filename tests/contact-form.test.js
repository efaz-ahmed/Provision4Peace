const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const mainScript = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'main.js'),
  'utf8'
);

function createControl(requiredWhenVisible = true) {
  return {
    dataset: requiredWhenVisible ? { requiredWhenVisible: 'true' } : {},
    disabled: true,
    required: false,
  };
}

function createSection(controls) {
  return {
    hidden: true,
    querySelectorAll() {
      return controls;
    },
  };
}

function runContactForm() {
  let onReasonChange;
  let onSubmit;
  const location = { href: '' };
  const form = {
    addEventListener(type, callback) {
      if (type === 'submit') onSubmit = callback;
    },
  };
  const reason = {
    value: '',
    addEventListener(type, callback) {
      if (type === 'change') onReasonChange = callback;
    },
  };

  const membershipControls = [createControl(), createControl(), createControl()];
  const generalControls = [createControl(), createControl(false)];
  const membershipSection = createSection(membershipControls);
  const generalSection = createSection(generalControls);
  const nodes = {
    'contact-reason': reason,
    'membership-enquiry-fields': membershipSection,
    'general-enquiry-fields': generalSection,
    'contact-form': form,
    'contact-name': { value: 'Amina Rahman' },
    'contact-email': { value: 'amina@example.com' },
    'membership-dob': { value: '1980-05-12' },
    'membership-plan': { value: 'Standard' },
    'membership-address': { value: '12 High Street, London' },
    'contact-phone': { value: '07123456789' },
    'contact-message': { value: 'Please call me.' },
    'contact-method': { value: 'Phone' },
    'contact-email-draft': { href: '', hidden: true },
    'contact-email-status': { hidden: true },
    'contact-email-copy': { value: '', hidden: true },
  };

  const document = {
    body: { style: {} },
    addEventListener() {},
    getElementById(id) {
      return nodes[id] || null;
    },
    querySelector(selector) {
      if (selector === 'input[name="ContactMethod"]:checked') return nodes['contact-method'];
      return null;
    },
  };

  vm.runInNewContext(mainScript, {
    Date,
    document,
    window: {
      addEventListener() {},
      location,
      scrollY: 0,
    },
  });

  return {
    generalControls,
    generalSection,
    membershipControls,
    membershipSection,
    reason,
    location,
    nodes,
    selectReason(value) {
      assert.equal(
        typeof onReasonChange,
        'function',
        'main.js should register a change listener for Reason for Enquiry'
      );
      reason.value = value;
      onReasonChange();
    },
    submit() {
      assert.equal(typeof onSubmit, 'function');
      let prevented = false;
      onSubmit({ preventDefault() { prevented = true; } });
      assert.equal(prevented, true);
      return new URL(location.href);
    },
  };
}

test('selecting membership shows and requires only the membership fields', () => {
  const form = runContactForm();

  form.selectReason('membership');

  assert.equal(form.membershipSection.hidden, false);
  assert.equal(form.generalSection.hidden, true);
  assert.deepEqual(
    form.membershipControls.map(({ disabled, required }) => ({ disabled, required })),
    [
      { disabled: false, required: true },
      { disabled: false, required: true },
      { disabled: false, required: true },
    ]
  );
  assert.deepEqual(
    form.generalControls.map(({ disabled, required }) => ({ disabled, required })),
    [
      { disabled: true, required: false },
      { disabled: true, required: false },
    ]
  );
});

test('selecting general enquiry shows and requires only the general fields', () => {
  const form = runContactForm();

  form.selectReason('general');

  assert.equal(form.generalSection.hidden, false);
  assert.equal(form.membershipSection.hidden, true);
  assert.deepEqual(
    form.generalControls.map(({ disabled, required }) => ({ disabled, required })),
    [
      { disabled: false, required: true },
      { disabled: false, required: false },
    ]
  );
  assert.deepEqual(
    form.membershipControls.map(({ disabled, required }) => ({ disabled, required })),
    [
      { disabled: true, required: false },
      { disabled: true, required: false },
      { disabled: true, required: false },
    ]
  );
});

test('membership application creates an email draft with details and attachment instructions', () => {
  const form = runContactForm();
  form.selectReason('membership');

  const draft = form.submit();

  assert.equal(draft.protocol, 'mailto:');
  assert.equal(draft.pathname, 'Info@provision4peace.org.uk');
  assert.match(draft.searchParams.get('subject'), /membership fund plan/i);
  const body = draft.searchParams.get('body');
  for (const detail of ['Amina Rahman', 'amina@example.com', '1980-05-12', 'Standard', '12 High Street, London']) {
    assert.ok(body.includes(detail), `Expected email draft to include ${detail}`);
  }
  assert.match(body, /attach.*proof of ID.*proof of address/is);
  assert.equal(form.nodes['contact-email-draft'].href, form.location.href);
  assert.equal(form.nodes['contact-email-status'].hidden, false);
  assert.equal(form.nodes['contact-email-copy'].hidden, false);
  assert.match(form.nodes['contact-email-copy'].value, /To: Info@provision4peace\.org\.uk/);
  assert.match(form.nodes['contact-email-copy'].value, /attach proof of ID and proof of address/i);
});

test('general enquiry draft includes its message and preferred contact method', () => {
  const form = runContactForm();
  form.selectReason('general');

  const draft = form.submit();
  const body = draft.searchParams.get('body');

  assert.equal(draft.searchParams.get('subject'), 'General enquiry');
  assert.match(body, /Phone number: 07123456789/);
  assert.match(body, /Preferred contact method: Phone/);
  assert.match(body, /Please call me\./);
  assert.doesNotMatch(body, /Date of birth|proof of ID/);
});
