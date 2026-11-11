# Pawsitive Pet Academy

Pawsitive Pet Academy is a static website introducing a pet-care education
academy. Visitors can learn about the academy and its courses, estimate course
fees, and send a general or course-related enquiry.

## Project overview

The site includes:

- Home and academy information pages.
- Seven course detail pages and a course catalogue.
- A fee calculator that shows bundle discounts and VAT estimates.
- A contact form for general and course enrolment enquiries.
- An enquiry service that forwards contact-form submissions to Google Apps
  Script. The backend is intended to record enquiries in Google Sheets and
  send notifications through Gmail.

The website uses HTML, CSS, and browser JavaScript. The enquiry service uses a
Cloudflare Worker as a proxy to Google Apps Script. Google Sheets and Gmail are
used by the external Apps Script backend.

## Project structure

The repository is a static website: its pages and assets are served directly;
there is no build step configured in this repository.

| File or folder | Purpose |
| --- | --- |
| `index.html` | Home page. |
| `about.html` | Academy information page. |
| `courses.html` | Course catalogue. |
| `fees.html` | Course fee calculator page. |
| `contact.html` | Contact details and enquiry form. |
| `canine-obedience-training.html` | Canine Obedience Training course page. |
| `pet-grooming.html` | Pet Grooming course page. |
| `animal-behaviour.html` | Animal Behaviour course page. |
| `pet-business-management.html` | Pet Business Management course page. |
| `puppy-care.html` | Puppy Care course page. |
| `pet-first-aid.html` | Pet First Aid course page. |
| `basic-dog-walking.html` | Basic Dog Walking course page. |
| `styles.css` | Shared site styling. |
| `script.js` | Navigation dropdown, fee calculations, enquiry context, and contact-form behavior. |
| `cloudflare-worker.mjs` | Cloudflare Worker that checks allowed origins and forwards JSON enquiries to the Apps Script endpoint. |
| `images/` | Site logo and course, home, and academy images. |
| `tests/` | Node.js tests for fee calculations, enquiry data, contact submission, and Worker behavior. |

The Google Apps Script source, Google Sheet, Gmail configuration, Cloudflare
deployment settings, and GitHub Pages settings are not included in this
repository.

## Enquiry system architecture

```text
Contact form
    → Cloudflare Worker
        → Google Apps Script
            → Google Sheets (enquiry records)
            → Gmail (academy notification)
```

1. **Website contact form:** `contact.html` collects a name, email, optional
   phone number, subject, message, and contact consent. `script.js` validates
   the form in the browser and sends a JSON request to the Worker URL in the
   form's `data-endpoint` attribute. Course enquiries also include selected
   course IDs.
2. **Cloudflare Worker:** `cloudflare-worker.mjs` allows only origins listed
   in `ALLOWED_ORIGINS`. It handles CORS preflight requests, accepts JSON
   `POST` requests up to 32 KiB, and forwards the request to its configured
   Apps Script URL. It returns the backend's JSON response to the website.
3. **Google Apps Script:** The Worker forwards submissions to a hard-coded
   Apps Script web-app endpoint. The script is external to this repository;
   its implementation, validation rules, and deployment settings cannot be
   verified here.
4. **Google Sheets and Gmail:** The external backend is intended to save
   enquiries in a sheet and send an email notification. The website considers
   an enquiry saved only when the response confirms `success`, `saved`, and a
   non-empty `submissionId`. It separately reports whether `emailSent` is
   `true`.

The contact form confirms an enquiry, not student registration or payment.

## Security and CORS configuration

The Worker reads the `ALLOWED_ORIGINS` environment variable. It must contain
the exact browser origins allowed to call the Worker. The current authorised
production origin is:

```text
https://mudzani.github.io
```

An origin consists of the scheme, host, and (if present) port. It does not
include a page path or trailing slash. The Worker compares the browser's
`Origin` header against the configured list. If the origin is not listed, the
Worker returns HTTP 403 and does not forward the request to Apps Script.

For local development with Live Server:

1. Start Live Server and open the site in a browser.
2. Read the address bar. For example, `http://127.0.0.1:5500/contact.html`
   has the origin `http://127.0.0.1:5500`.
3. Add that exact origin to `ALLOWED_ORIGINS` in the Worker environment used
   for testing. Use the actual host, scheme, and port shown by your browser.
   `localhost` and `127.0.0.1` are different origins, as are different ports.

Separate origins are comma-separated:

```text
https://mudzani.github.io,http://127.0.0.1:5500
```

The Worker trims whitespace around entries, but exact origin matching still
applies. Do not use wildcard origins (`*`) as a shortcut. Remove temporary
local origins when they are no longer needed, especially from production.

CORS is a browser access policy, not authentication. A non-browser client can
make requests without relying on browser CORS enforcement, and an allowed
origin does not prove who submitted the form. Keep backend validation and
appropriate abuse protections in place; do not treat the origin allowlist as
a substitute for them. The Worker currently checks that the body is valid
JSON and within its size limit, but does not validate the enquiry's individual
fields.

## Setup and local development

### Run the website

1. Clone or download the repository.
2. Open the repository folder in your editor.
3. Serve the folder with a local web server such as the Live Server editor
   extension, then open its local URL in your browser.

The site has no dependency-install or build command in the repository. Prefer
a local HTTP server over opening an HTML file directly with `file://`; the
contact form needs a browser origin that the Worker can allow.

### Test the enquiry flow locally

The contact form currently targets the deployed Worker URL configured in
`contact.html`. A local page using that URL will still send submissions to the
configured Apps Script backend. Therefore, a successful test may create a real
sheet record and email notification.

For a browser-based local test, add the exact Live Server origin to the
`ALLOWED_ORIGINS` variable of the Worker being used. The repository does not
include a Wrangler configuration, Wrangler dependency, or a separate staging
Worker, so it does not define a project-specific local Worker command or
isolated test backend. For a safer end-to-end test, use a separately managed
test Worker/backend if one is available, and point the form at that test
Worker. Do not repeatedly submit test enquiries while troubleshooting.

## Deployment

### Cloudflare Worker

The Worker entry-point source is `cloudflare-worker.mjs`. No Wrangler
configuration or deployment workflow is present, so the repository does not
specify a CLI deployment command. Deploy the module using the Cloudflare
Workers deployment method configured for your account (for example, through
the Cloudflare dashboard), and verify that the deployed Worker URL is
reachable.

The Worker code uses one environment variable:

| Variable | Production value |
| --- | --- |
| `ALLOWED_ORIGINS` | `https://mudzani.github.io` |

Set this variable in the deployed Worker's environment. Do not include a path
or trailing slash in the origin. Do not add local development origins to
production unless there is a specific, temporary need.

The Apps Script endpoint is hard-coded in `cloudflare-worker.mjs`; it is not
configured through an environment variable in this project. The Apps Script
deployment itself must be maintained separately.

### Frontend endpoint

`contact.html` currently sets the contact form's `data-endpoint` to:

```text
https://pawsitive-enquiry-api.donald-mudzani.workers.dev
```

If the Worker URL changes, update this attribute to the deployed Worker URL
and publish the updated website. If using a separate test Worker, point a test
copy of the frontend at that Worker rather than unintentionally directing
test submissions to the production backend.

### GitHub Pages

The project files are static HTML, CSS, JavaScript, and images; no build
workflow or Pages configuration is included. Publish the site from the
repository using the appropriate source branch and folder in the repository's
GitHub Pages settings. The current authorised production origin for the
Worker is `https://mudzani.github.io`. Confirm the actual published Pages URL
and source settings in GitHub before changing deployment settings; those
settings cannot be verified from the checked-in files.

## Testing and verification

The existing automated tests use Node.js's built-in test runner. From the
repository root, run:

```powershell
node --test
```

The command was verified against the current repository and passed all tests.
There is no `package.json` or project-specific test script.

For an intentional end-to-end enquiry test:

1. Confirm the Worker allows the exact origin of the page you are testing.
2. Submit one test enquiry with non-sensitive test details.
3. Check the browser's form feedback. A saved response should confirm a
   non-empty submission ID; email delivery is reported separately.
4. Check the configured Google Sheet for the corresponding record and check
   the configured Gmail inbox (including spam) for the notification.
5. If the response says the enquiry was saved but the email notification
   could not be confirmed, do not submit it again; verify the sheet and
   notification path first.

The Apps Script, sheet ID/schema, notification recipient, and Gmail settings
are external to this repository. Verify them in the appropriate Google
account; no private access details are documented here. During
troubleshooting, avoid repeated submissions because they may create duplicate
records or notifications.

## Known limitations

- An enquiry does not automatically register a student.
- The site does not process payments or confirm payment.
- CORS is not authentication.
- Course fees shown by the calculator are estimates, not formal quotations;
  the displayed calculation applies discounts before adding 15% VAT.
- The Worker checks JSON syntax and request size, but does not validate
  individual enquiry fields. The external backend must perform appropriate
  validation.
- The Apps Script implementation and its Sheets/Gmail configuration are
  external and cannot be inspected or verified in this repository.
- `contact.html` states that the displayed location and office hours are
  illustrative. Its map shows central Durban, not a verified street address.

## Deployment checklist

- [ ] Run `node --test` and confirm all tests pass.
- [ ] Verify the Apps Script web app is deployed and the Worker can reach it.
- [ ] Verify the external backend's input validation, Google Sheets access,
      and Gmail notification settings.
- [ ] Deploy `cloudflare-worker.mjs` to the intended Cloudflare Worker.
- [ ] Set production `ALLOWED_ORIGINS` to exactly
      `https://mudzani.github.io`.
- [ ] Confirm the contact form's `data-endpoint` matches the deployed Worker
      URL.
- [ ] Publish the static website through the intended GitHub Pages source and
      confirm the published URL.
- [ ] Perform one controlled enquiry test; verify its sheet record and Gmail
      notification, and avoid repeat submissions.
- [ ] Remove any temporary local origins from production `ALLOWED_ORIGINS`.
- [ ] Confirm no secrets or private access details have been added to the
      repository.
