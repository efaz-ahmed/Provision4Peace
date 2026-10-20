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

Configure these environment variables in the Provision4Peace Vercel project. Following the NVH setup, only the API key is required; recipient and sender defaults are provided:

- `RESEND_API_KEY` — required; the Provision4Peace Resend API key.
- `CONTACT_RECIPIENT` — optional; defaults to `Info@provision4peace.org.uk`.
- `RESEND_FROM` — optional; defaults to `Provision4Peace Website <onboarding@resend.dev>` for testing. Resend's shared sender may only deliver to the email address associated with the Resend account. For live enquiries, verify `provision4peace.org.uk` in Resend and set this to a sender address on that domain.

Add secrets in Vercel project settings, never in website JavaScript or this repository. The email contains applicant and nominee personal details; limit access to the receiving inbox and apply an appropriate retention/deletion process. Proof-of-ID and proof-of-address documents are not uploaded by this form and must be sent separately.
