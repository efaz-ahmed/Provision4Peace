# Provision4Peace

A responsive website built with HTML, CSS, and JavaScript.

Sister company of New Vision Housing Limited (NVH).

## Structure

- `index.html` — homepage
- `pages/` — additional pages (about, services, contact)
- `css/` — styling files (main, sections, components, animations, responsive)
- `js/` — JavaScript files (main, animations)
- `assets/` — images, icons, videos

## Design notes

_TBD_

## Deployment notes

The contact form is sent through the Vercel serverless function at `api/contact.js`, using Resend. The site must be deployed on Vercel (or run locally with `vercel dev`) for submissions to work; static-only hosting will not run the API route.

Configure these environment variables in the Provision4Peace Vercel project before accepting live enquiries:

- `RESEND_API_KEY` — the Provision4Peace Resend API key.
- `CONTACT_RECIPIENT` — the inbox that should receive enquiries (for example, `Info@provision4peace.org.uk`).
- `RESEND_FROM` — a sender address on a domain verified in Resend.

Add secrets in Vercel project settings, never in website JavaScript or this repository. The email contains applicant and nominee personal details; limit access to the receiving inbox and apply an appropriate retention/deletion process. Proof-of-ID and proof-of-address documents are not uploaded by this form and must be sent separately.
