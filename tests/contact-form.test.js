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
  };

  const document = {
    body: { style: {} },
    addEventListener() {},
    getElementById(id) {
      return nodes[id] || null;
    },
  };

  vm.runInNewContext(mainScript, {
    Date,
    document,
    window: {
      addEventListener() {},
      scrollY: 0,
    },
  });

  return {
    generalControls,
    generalSection,
    membershipControls,
    membershipSection,
    reason,
    selectReason(value) {
      assert.equal(
        typeof onReasonChange,
        'function',
        'main.js should register a change listener for Reason for Enquiry'
      );
      reason.value = value;
      onReasonChange();
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
