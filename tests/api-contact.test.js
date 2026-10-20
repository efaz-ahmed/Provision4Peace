const assert = require('node:assert/strict');
const test = require('node:test');
const handler = require('../api/contact');

function mockResponse() {
  return {
    statusCode: 200,
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

function validMembership() {
  return {
    reason: 'membership',
    fullName: 'Amina Rahman',
    email: 'amina@example.com',
    phone: '07123456789',
    dateOfBirth: '1980-05-12',
    plan: 'Standard',
    address: '12 High Street, London',
    nominee: {
      name: 'Omar Rahman',
      dateOfBirth: '1982-03-04',
      address: '14 High Street, London',
      phone: '07987654321',
      email: 'omar@example.com',
      relationship: 'Brother',
    },
    _honey: '',
  };
}

async function withEmailConfig(run) {
  const names = ['RESEND_API_KEY', 'CONTACT_RECIPIENT', 'RESEND_FROM'];
  const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  Object.assign(process.env, {
    RESEND_API_KEY: 're_test_key',
    CONTACT_RECIPIENT: 'Info@provision4peace.org.uk',
    RESEND_FROM: 'Provision4Peace <contact@provision4peace.org.uk>',
  });
  try {
    return await run();
  } finally {
    for (const name of names) {
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
    }
  }
}

test('membership submission sends applicant and nominee data to Resend', async () => {
  await withEmailConfig(async () => {
    const originalFetch = global.fetch;
    let request;
    global.fetch = async (url, options) => {
      request = { url, options, payload: JSON.parse(options.body) };
      return { ok: true, status: 200, text: async () => '{"id":"email_123"}' };
    };
    try {
      const res = mockResponse();
      await handler({ method: 'POST', body: validMembership() }, res);

      assert.equal(res.statusCode, 200);
      assert.equal(res.body.success, true);
      assert.equal(request.url, 'https://api.resend.com/emails');
      assert.equal(request.payload.to[0], 'Info@provision4peace.org.uk');
      assert.equal(request.payload.reply_to, 'amina@example.com');
      for (const value of ['Amina Rahman', '07123456789', '1980-05-12', 'Omar Rahman', '07987654321', 'Brother']) {
        assert.ok(request.payload.text.includes(value), `Expected notification to contain ${value}`);
      }
    } finally {
      global.fetch = originalFetch;
    }
  });
});

test('email configuration follows NVH defaults when only the Resend API key is set', async () => {
  const names = ['RESEND_API_KEY', 'CONTACT_RECIPIENT', 'RESEND_FROM'];
  const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  process.env.RESEND_API_KEY = 're_test_key';
  delete process.env.CONTACT_RECIPIENT;
  delete process.env.RESEND_FROM;

  const originalFetch = global.fetch;
  let payload;
  global.fetch = async (url, options) => {
    payload = JSON.parse(options.body);
    return { ok: true, status: 200, text: async () => '{"id":"email_defaults"}' };
  };

  try {
    const res = mockResponse();
    await handler({ method: 'POST', body: validMembership() }, res);

    assert.equal(res.statusCode, 200);
    assert.equal(payload.to[0], 'Info@provision4peace.org.uk');
    assert.equal(payload.from, 'Provision4Peace Website <onboarding@resend.dev>');
  } finally {
    global.fetch = originalFetch;
    for (const name of names) {
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
    }
  }
});

test('general enquiry is accepted without membership or nominee data', async () => {
  await withEmailConfig(async () => {
    const originalFetch = global.fetch;
    let sentBody = '';
    global.fetch = async (url, options) => {
      sentBody = JSON.parse(options.body).text;
      return { ok: true, status: 200, text: async () => '{"id":"email_456"}' };
    };
    try {
      const res = mockResponse();
      await handler({
        method: 'POST',
        body: {
          reason: 'general',
          fullName: 'Amina Rahman',
          email: 'amina@example.com',
          phone: '07123456789',
          contactMethod: 'Phone',
          message: 'Please call me.',
        },
      }, res);

      assert.equal(res.statusCode, 200);
      assert.match(sentBody, /general enquiry/i);
      assert.match(sentBody, /Please call me\./);
      assert.doesNotMatch(sentBody, /Nominee|membership plan/i);
    } finally {
      global.fetch = originalFetch;
    }
  });
});

test('membership submission rejects missing nominee details before sending', async () => {
  await withEmailConfig(async () => {
    const originalFetch = global.fetch;
    let sent = false;
    global.fetch = async () => { sent = true; };
    try {
      const body = validMembership();
      delete body.nominee.email;
      const res = mockResponse();
      await handler({ method: 'POST', body }, res);

      assert.equal(res.statusCode, 400);
      assert.equal(sent, false);
    } finally {
      global.fetch = originalFetch;
    }
  });
});

test('honeypot submissions are silently discarded without sending email', async () => {
  await withEmailConfig(async () => {
    const originalFetch = global.fetch;
    let sent = false;
    global.fetch = async () => { sent = true; };
    try {
      const res = mockResponse();
      await handler({ method: 'POST', body: { _honey: 'bot' } }, res);
      assert.equal(res.statusCode, 200);
      assert.equal(res.body.success, true);
      assert.equal(sent, false);
    } finally {
      global.fetch = originalFetch;
    }
  });
});
