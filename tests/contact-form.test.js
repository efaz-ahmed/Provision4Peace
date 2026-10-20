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

function runContactForm(fetchResponse) {
  let onReasonChange;
  let onSubmit;
  const requests = [];
  const form = {
    reset() {},
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
  const membershipControls = Array.from({ length: 9 }, () => createControl());
  const generalControls = [createControl(), createControl(), createControl()];
  const membershipSection = createSection(membershipControls);
  const generalSection = createSection(generalControls);
  const nodes = {
    'contact-reason': reason,
    'membership-enquiry-fields': membershipSection,
    'general-enquiry-fields': generalSection,
    'contact-form': form,
    'contact-name': { value: 'Amina Rahman' },
    'contact-email': { value: 'amina@example.com' },
    'contact-phone': { value: '07123456789' },
    'contact-company': { value: '' },
    'membership-dob': { value: '1980-05-12' },
    'membership-plan': { value: 'Standard' },
    'membership-address': { value: '12 High Street, London' },
    'nominee-name': { value: 'Omar Rahman' },
    'nominee-dob': { value: '1982-03-04' },
    'nominee-address': { value: '14 High Street, London' },
    'nominee-phone': { value: '07987654321' },
    'nominee-email': { value: 'omar@example.com' },
    'nominee-relationship': { value: 'Brother' },
    'contact-message': { value: 'Please call me.' },
    'contact-form-status': { textContent: '', hidden: true },
    'contact-form-submit': { textContent: 'Send enquiry', disabled: false },
  };
  const checkedContactMethod = { value: 'Phone' };
  const document = {
    body: { style: {} },
    addEventListener() {},
    getElementById(id) {
      return nodes[id] || null;
    },
    querySelector(selector) {
      if (selector === 'input[name="contactMethod"]:checked') return checkedContactMethod;
      return null;
    },
  };
  const window = {
    addEventListener() {},
    fetch(url, options) {
      requests.push({ url, options, payload: JSON.parse(options.body) });
      return fetchResponse
        ? fetchResponse()
        : Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) });
    },
    scrollY: 0,
  };

  vm.runInNewContext(mainScript, { Date, document, window });

  return {
    generalControls,
    generalSection,
    membershipControls,
    membershipSection,
    reason,
    nodes,
    requests,
    selectReason(value) {
      assert.equal(typeof onReasonChange, 'function');
      reason.value = value;
      onReasonChange();
    },
    async submit() {
      assert.equal(typeof onSubmit, 'function');
      let prevented = false;
      await onSubmit({ preventDefault() { prevented = true; } });
      assert.equal(prevented, true);
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
    Array.from({ length: 9 }, () => ({ disabled: false, required: true }))
  );
  assert.deepEqual(
    form.generalControls.map(({ disabled, required }) => ({ disabled, required })),
    Array.from({ length: 3 }, () => ({ disabled: true, required: false }))
  );
});

test('selecting general enquiry shows and requires only the general fields', () => {
  const form = runContactForm();
  form.selectReason('general');

  assert.equal(form.generalSection.hidden, false);
  assert.equal(form.membershipSection.hidden, true);
  assert.deepEqual(
    form.generalControls.map(({ disabled, required }) => ({ disabled, required })),
    Array.from({ length: 3 }, () => ({ disabled: false, required: true }))
  );
  assert.deepEqual(
    form.membershipControls.map(({ disabled, required }) => ({ disabled, required })),
    Array.from({ length: 9 }, () => ({ disabled: true, required: false }))
  );
});

test('membership application is posted to the site endpoint with applicant and nominee details', async () => {
  const form = runContactForm();
  form.selectReason('membership');
  await form.submit();

  assert.equal(form.requests.length, 1);
  assert.equal(form.requests[0].url, '/api/contact');
  assert.equal(form.requests[0].options.method, 'POST');
  assert.equal(form.requests[0].payload.reason, 'membership');
  assert.equal(form.requests[0].payload.phone, '07123456789');
  assert.equal(form.requests[0].payload.nominee.name, 'Omar Rahman');
  assert.equal(form.requests[0].payload.nominee.dateOfBirth, '1982-03-04');
  assert.equal(form.requests[0].payload.nominee.address, '14 High Street, London');
  assert.equal(form.requests[0].payload.nominee.phone, '07987654321');
  assert.equal(form.requests[0].payload.nominee.email, 'omar@example.com');
  assert.equal(form.requests[0].payload.nominee.relationship, 'Brother');
  assert.match(form.nodes['contact-form-status'].textContent, /sent successfully/i);
});

test('general enquiry is posted with message and does not include membership data', async () => {
  const form = runContactForm();
  form.selectReason('general');
  await form.submit();

  const payload = form.requests[0].payload;
  assert.equal(payload.reason, 'general');
  assert.equal(payload.contactMethod, 'Phone');
  assert.equal(payload.message, 'Please call me.');
  assert.equal(payload.nominee, undefined);
  assert.match(form.nodes['contact-form-status'].textContent, /sent successfully/i);
});

test('failed enquiry submission keeps the entered values and shows an error', async () => {
  const form = runContactForm(() => Promise.reject(new Error('Network unavailable')));
  form.selectReason('general');
  await form.submit();

  assert.match(form.nodes['contact-form-status'].textContent, /couldn.t send/i);
  assert.equal(form.nodes['contact-name'].value, 'Amina Rahman');
});
