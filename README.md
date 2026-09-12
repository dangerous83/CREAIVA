# CREAIVA website

Static HTML website published through the repository's existing GitHub Pages deployment.

## Website assistant

The shared assistant runs on all 25 public pages. It uses extractive retrieval over the site's public content, with page context, follow-up topics, FAQ matching, service and solution discovery, and clickable source links. It does not use a generative language model or require an API key or server. Visitor questions stay in the browser; the only content requests load public pages from this site. Conversations are not stored across page navigation.

`assets/site-knowledge.json` indexes public descriptions, deliverables, timelines, FAQs, company information, and contact details. `assets/site-content.mjs` is the common HTML extractor for both the build script and browser. Before replying, the widget refreshes the relevant source pages and company/contact facts. If refreshing fails, it clearly labels its saved information. If the knowledge index cannot load, it offers the contact page and allows retrying.

The internal `sales-pricing.html` portal is deliberately excluded. Published advertising spend and hosting estimates remain tied to the relevant solution; general project pricing comes from the homepage FAQ. The assistant points visitors to the team for unconfirmed information, private details, refunds, discounts, and bookings. It cannot confirm project availability or issue binding quotes. Ambiguous questions prompt for a service or solution.

### Updating content

1. Edit the public HTML pages. New `.html` pages under `services/` or `solutions/` are automatically included in the next build. Other public root pages must be added to the explicit list in `scripts/build-knowledge.mjs`.
2. Run `npm ci` and `npm run build:knowledge`.
3. Run `npm test` and commit both the HTML and regenerated knowledge index. The test command rejects a stale index.
4. For a new offering, add useful visitor terms to `aliases` in `assets/assistant-engine.mjs`, and include the shared assistant assets in the page.

The retrieval assistant favors sourced details and an honest fallback over making up answers. A future generative assistant would need a separately configured private server endpoint and model credentials; never put API keys in static HTML or JavaScript.

## Service and solution heroes

All 14 services and seven solutions use `assets/page-hero.css`: full-section cover images, top and bottom dark fades, centered copy, visible calls to action, and responsive solution bundles. Each page retains its own artwork. The page title is an `h1`, and the content stays visible even if JavaScript is unavailable. Images are decorative because the surrounding heading describes the offering.

## Validation

`npm test` checks content freshness, all 89 published FAQs, visitor paraphrases, context, source attribution, and uncertain or unsupported questions.

For browser checks, install Chromium once with `npx playwright install chromium`, then run `npm run test:browser`. This starts a temporary local server and checks every public page at 1440, 390, and 320 pixels, as well as chat interactions, nested source links, keyboard access, safe text rendering, and failed-request recovery. Screenshots go to ignored `test-results/`.

On Windows, an installed Edge can be selected with `CREAIVA_BROWSER_CHANNEL=msedge`. To check an existing deployment, set `CREAIVA_TEST_URL` to its full root URL, including the trailing slash (for example, `https://dangerous83.github.io/CREAIVA/`).
