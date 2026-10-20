const MEMBERSHIP_PLANS = new Set(['Basic', 'Standard', 'Comprehensive']);
const CONTACT_METHODS = new Set(['Email', 'Phone']);

function text(value, maxLength = 500) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function isEmail(value) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidBirthDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) return false;
  const today = new Date().toISOString().slice(0, 10);
  return value <= today;
}

function parseBody(body) {
  if (typeof body !== 'string') return body || {};
  try {
    return JSON.parse(body);
  } catch (error) {
    return {};
  }
}

function invalid(res, message) {
  return res.status(400).json({ success: false, message });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, message: 'Method not allowed.' });
  }

  const body = parseBody(req.body);
  if (text(body._honey, 200)) {
    return res.status(200).json({ success: true });
  }

  const reason = text(body.reason, 30);
  const fullName = text(body.fullName, 120);
  const email = text(body.email, 254);
  const phone = text(body.phone, 40);
  if (!['membership', 'general'].includes(reason)) {
    return invalid(res, 'Please select a reason for your enquiry.');
  }
  if (!fullName || !email || !phone) {
    return invalid(res, 'Please provide your full name, email address, and phone number.');
  }
  if (!isEmail(email)) return invalid(res, 'Please enter a valid email address.');

  const fields = [
    `Full name: ${fullName}`,
    `Email address: ${email}`,
    `Phone number: ${phone}`,
  ];

  if (reason === 'membership') {
    const dateOfBirth = text(body.dateOfBirth, 10);
    const plan = text(body.plan, 30);
    const address = text(body.address, 1000);
    const nomineeData = body.nominee || {};
    const nominee = {
      name: text(nomineeData.name || body.nomineeName, 120),
      dateOfBirth: text(nomineeData.dateOfBirth || body.nomineeDateOfBirth, 10),
      address: text(nomineeData.address || body.nomineeAddress, 1000),
      phone: text(nomineeData.phone || body.nomineePhone, 40),
      email: text(nomineeData.email || body.nomineeEmail, 254),
      relationship: text(nomineeData.relationship || body.nomineeRelationship, 100),
    };

    if (!dateOfBirth || !plan || !address || Object.values(nominee).some((value) => !value)) {
      return invalid(res, 'Please complete all membership and nominee details.');
    }
    if (!isValidBirthDate(dateOfBirth) || !isValidBirthDate(nominee.dateOfBirth)) {
      return invalid(res, 'Please enter valid dates of birth that are not in the future.');
    }
    if (!MEMBERSHIP_PLANS.has(plan)) return invalid(res, 'Please choose a valid membership fund plan.');
    if (!isEmail(nominee.email)) return invalid(res, 'Please enter a valid nominee email address.');

    fields.push(
      '',
      'Membership application details:',
      `Date of birth: ${dateOfBirth}`,
      `Preferred membership fund plan: ${plan}`,
      `Full address: ${address}`,
      '',
      'Nominee details:',
      `Name: ${nominee.name}`,
      `Date of birth: ${nominee.dateOfBirth}`,
      `Address: ${nominee.address}`,
      `Phone: ${nominee.phone}`,
      `Email: ${nominee.email}`,
      `Relationship to applicant: ${nominee.relationship}`,
      '',
      'Proof of identity and proof of address will be sent separately by the applicant.'
    );
  } else {
    const contactMethod = text(body.contactMethod, 20);
    const message = text(body.message, 4000);
    if (!CONTACT_METHODS.has(contactMethod) || !message) {
      return invalid(res, 'Please choose a contact method and enter your message.');
    }
    fields.push('', `Preferred contact method: ${contactMethod}`, '', 'Message:', message);
  }

  const apiKey = process.env.RESEND_API_KEY;
  const recipient = process.env.CONTACT_RECIPIENT;
  const from = process.env.RESEND_FROM;
  if (!apiKey || !recipient || !from) {
    console.error('[Provision4Peace contact] Missing email service configuration.');
    return res.status(500).json({
      success: false,
      message: 'The enquiry service is not configured yet. Please contact us by phone.',
    });
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [recipient],
        reply_to: email,
        subject: reason === 'membership' ? 'Membership fund plan application' : 'General enquiry',
        text: [
          reason === 'membership'
            ? 'New membership fund plan application from the Provision4Peace website.'
            : 'New general enquiry from the Provision4Peace website.',
          '',
          ...fields,
        ].join('\n'),
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      console.error('[Provision4Peace contact] Resend request failed:', response.status, details);
      return res.status(502).json({
        success: false,
        message: 'We could not send your enquiry right now. Please try again or contact us by phone.',
      });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[Provision4Peace contact] Email service request failed:', error);
    return res.status(502).json({
      success: false,
      message: 'We could not send your enquiry right now. Please try again or contact us by phone.',
    });
  }
};
