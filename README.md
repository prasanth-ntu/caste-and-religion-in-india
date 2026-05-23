# decoded.prasanth.io

Interactive, evidence-tiered exploration of caste and religion in India — with a personal deep-dive into the Kongu Vellala Gounder / Kadai Kootam lineage.

Stack: Astro 6 + D3 + Tailwind v4 + React (islands) · static export to GitHub Pages.

## Develop

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # static export → dist/
```

## After cloning — enable repo git hooks

```bash
git config core.hooksPath .githooks
```

This points git at the repo's `.githooks/` directory so the **pre-commit** check fires on every commit. It blocks staging of transient test artifacts (Playwright screenshots, `.playwright-mcp/` logs, etc.). Bypass with `--no-verify` only if you really mean it.

To clean transient artifacts at any time:

```bash
./scripts/clean-test-artifacts.sh
```

## Epistemic system

Every factual claim is tagged with a confidence tier:

- 🟢 **green** — well-established (multiple independent academic sources)
- 🟡 **yellow** — plausible / debated (some scholarly support but contested)
- 🔴 **red** — myth / unverified (folk claim, no historical or scientific backing)
- ⚖️ **rational** — practical basis (a rational reason behind a tradition, distinct from the folk explanation)

Sources are linked inline. See [Methodology](https://decoded.prasanth.io/about) once deployed.
