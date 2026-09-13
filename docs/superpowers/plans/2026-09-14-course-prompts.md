# Course Prompt Single Source Implementation Plan

> **For Codex:** Execute this plan with test-driven development. Do not alter the Python Bot, student ZIP, schemas, environment variables, chapter count, or Vercel Drop flow.

**Goal:** Make `assets/prompts.js` the single source of truth for all eight formal course prompts and render the same prompt cards in their chapter locations and the aggregate prompt page.

**Architecture:** A dependency-free browser script exposes immutable prompt records and renders chapter placeholders plus the aggregate index/catalog using DOM APIs and `textContent`. Existing `assets/app.js` remains responsible for clipboard interaction after `prompts.js` renders.

**Tech Stack:** Static HTML, native JavaScript, CSS, Node test runner, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-14-course-prompts-design.md`

**Global Constraints:** Preserve prompt bodies exactly; do not edit Python/ZIP/Base64 logic or redesign the site; work test-first; leave changes uncommitted until the user explicitly requests a commit or push.

---

### Task 1: Lock the prompt data contract with failing tests

**Files:**
- Modify: `tests/content.spec.js`
- Modify: `tests/static-site.spec.js`
- Modify: `tests/site.spec.js`

1. Add a helper that evaluates `assets/prompts.js` without a browser and reads `window.COURSE_PROMPTS`.
2. Add a test requiring exactly eight unique ids, the required metadata fields, correct names/categories/placement labels, core/gift/scheduled-task markings, and absence of the retired weekly terminology.
3. Add SHA-256 expectations for all eight prompt bodies so production text changes fail deterministically.
4. Add chapter-placement tests requiring each id in its approved chapter and no duplicated formal prompt body in HTML.
5. Add static syntax and script-order tests for pages that render prompts.
6. Add browser tests for eight catalog cards, working anchors, chapter/catalog body equality, copy-only-body behavior, success feedback/restoration, and responsive overflow.
7. Run the targeted Node content/static tests and confirm failure occurs because `assets/prompts.js` and placeholders do not exist.

### Task 2: Implement the single prompt source and renderer

**Files:**
- Create: `assets/prompts.js`
- Modify: `assets/app.js`
- Modify: `assets/style.css`

1. Add the eight records with ids, names, categories, placement, purpose, timing, optional badges/notices, and exact bodies.
2. Freeze the exported data and render individual placeholders, the quick index, and the aggregate catalog.
3. Generate unique prompt-body ids and buttons whose copy target contains only the prompt body.
4. Add `data-copy-success="已複製 ✓"` to Prompt buttons.
5. Update the common copy handler to use optional success text and restore the original label after 1.8 seconds.
6. Add minimal responsive styles for prompt cards, metadata, index links, and badges.
7. Run the targeted data/static tests and correct only production code until they pass.

### Task 3: Place prompts in chapters and rebuild the aggregate page

**Files:**
- Modify: `chapters/02-01.html`
- Modify: `chapters/02-02.html`
- Modify: `chapters/03-01.html`
- Modify: `chapters/03-02.html`
- Modify: `chapters/05-01.html`
- Modify: `chapters/06-02.html`
- Modify: `appendices/prompts.html`
- Modify: `assets/app.js`

1. Replace the inline Project Instructions body in 2-1 with prompt 0 placeholder and add prompt 2 next to the real Tactiq reading step.
2. Add prompt 1 after the LINE TXT upload instruction in 2-2.
3. Add prompt 3 to the cross-source merge workflow in 3-1.
4. Add prompt 4 by current-decision rules and prompt 5 by the confirmed project-progress workflow in 3-2.
5. Add prompt 7 after the normal Vercel Drop flow as an optional Codex rescue path in 5-1.
6. Add prompt 6 after end-to-end acceptance in 6-2 and keep the scheduled-task warning visible.
7. Replace aggregate inline prompt bodies with `data-prompt-index` and `data-prompt-catalog` placeholders and rename navigation to `📋 課程提示詞總整理`.
8. Load `assets/prompts.js` before `assets/app.js` on every affected page.
9. Run all Node content/static tests and fix chapter placement or rendering defects.

### Task 4: Browser and final verification

**Files:**
- Verify: all modified files

1. Run Playwright with the available local Chromium executable and workspace Node dependencies.
2. Exercise all eight aggregate anchors and compare each chapter body to the catalog body.
3. Click a Prompt copy button, confirm the clipboard contains only the prompt body, confirm `已複製 ✓`, wait at least 1.8 seconds, and confirm restoration.
4. Check affected pages at desktop and 390px for horizontal overflow.
5. Run the complete Node suite, internal-link checks, forbidden-term searches, JavaScript syntax checks, and `git diff --check`.
6. Inspect `git status --short` and `git diff`; confirm no Python Bot or ZIP file changed.
7. Report exact files, tests, prompt hashes, responsive/copy results, and any remaining manual verification. Do not commit or push without an explicit follow-up request.
