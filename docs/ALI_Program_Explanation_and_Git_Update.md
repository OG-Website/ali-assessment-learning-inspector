# OG A.L.I. - Assessment Learning Inspector

## What A.L.I. Is

A.L.I. stands for Assessment Learning Inspector. It is an OG branded assessor support tool built as an extra project for the AI Programming programme. It is designed to inspect assessment evidence against assessment criteria and show a clear marking matrix for human review.

It is not intended to replace an assessor. It is intended to support assessment review by showing what evidence is present, what criteria it appears to support, what may need checking, and what has been blocked for safety.

## What It Does

A.L.I. loads an evidence folder and assessment criteria, then produces a structured marking view. The marking matrix shows:

- the assessment criterion being checked
- the evidence categories mapped to that criterion
- the draft criterion score
- the audit confidence for that evidence mapping
- a short rationale explaining why the evidence was mapped
- a review note explaining whether assessor confirmation is still needed

The app also includes separate views for scanning, evidence review, metrics, and reports. The evidence review view lets a user inspect accepted files, remove files that should not be included, and override evidence categories when a file has been named differently.

## What It Checks

The evidence rules look for common AI Programming evidence types:

- Python scripts
- Jupyter notebooks
- tabular data such as CSV, JSON, and spreadsheet files
- screenshots and image evidence
- Git and GitHub evidence
- validation metrics such as accuracy, loss, precision, recall, F1, and confusion matrix evidence
- model outputs, checkpoints, inference outputs, and trained model files
- documentation such as README, Markdown, text, DOCX, and PDF evidence
- empty files
- secret-looking filenames and secret-looking content

Sensitive files are blocked before scoring. Files that look like environment variable files, passwords, API keys, private keys, tokens, credentials, or cloud auth files are not accepted into the scoring evidence set.

## How It Uses The Criteria

The app uses a generated criteria index built from the local AI Programming assessment and guidance folders. The index is stored in `src/assessmentCriteria.js`.

The real coursework audit manifest is stored in `src/collegeEvidenceManifest.js`. This manifest contains the local evidence folder summaries, criteria text, safe file lists, blocked-file counts, evidence findings, and marking matrix rows used by the default demo.

When a criteria source is selected, A.L.I. splits the criteria into rows and maps each row against the evidence categories. The matrix is therefore criterion based rather than just a general file scan.

## How It Uses Evidence

For each safe file, A.L.I. checks both filename/path evidence and readable text content where possible. This means a file can still be found even if it is named differently, provided the content contains useful evidence terms.

The scan produces evidence findings such as `Git evidence: pass`, `Validation metrics: warning`, or `Model outputs: needs review`. Those findings are then mapped into the marking matrix row by row.

## Marking Matrix Correction

The marking matrix now separates two different values:

- Criterion score: the evidence match score for that criterion.
- Audit confidence: how confident the tool is in the automatic mapping.

Previously, the confidence calculation used a high cap and many strong evidence rows landed on 95 percent. That made the confidence column look like a repeated mark, which was misleading.

The updated logic now calculates audit confidence from:

- the row's evidence score
- how many evidence categories were mapped
- how many matching files were found
- how strongly the criterion wording matched the evidence category
- whether there were warnings
- whether any mapped evidence category was missing
- how specific the criterion wording is

This means the matrix no longer shows repeated 95 percent confidence values across unrelated criteria. For example, the AC2.3 submission now shows row scores of 100, 100, 85, and 100, with audit confidence values of 80, 76, 71, and 83.

## What Technologies It Uses

A.L.I. uses:

- React for the web interface
- JavaScript for evidence logic, scoring, state, and report generation
- Vite for local development and production builds
- Node.js and npm for running and building the project
- Git and GitHub for version control
- GitHub Pages for the live hosted demo
- JSON-style structured data for reports and manifests
- Markdown audit reports for readable evidence summaries
- CSS for the OG branded interface, responsive layout, and marking matrix design

## Where The Main Parts Are

- `src/App.jsx` - main React interface and page views
- `src/evidenceRules.js` - evidence checks, sensitive-file blocking, reporting logic, and marking matrix scoring
- `src/assessmentCriteria.js` - generated criteria index
- `src/collegeEvidenceManifest.js` - generated real coursework audit manifest
- `scripts/run_real_coursework_audit.js` - scans real coursework folders and regenerates reports/manifests
- `scripts/build_assessment_index.py` - builds the assessment criteria index from source material
- `public/og-logo.png` - OG A.L.I. branding
- `dist/` - production build output

## GitHub And Live Demo

Repository:
https://github.com/OG-Website/ali-assessment-learning-inspector

Live demo:
https://og-website.github.io/ali-assessment-learning-inspector/

Latest change:
The marking matrix confidence calculation was corrected so the tool no longer repeats 95 percent confidence across unrelated rows, and the UI now labels criterion score separately from audit confidence.

