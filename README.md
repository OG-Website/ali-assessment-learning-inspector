# A.L.I. - Assessment Learning Inspector

A.L.I. is an extracurricular AI Programming project tailored for Ali: an evidence-first assistant that checks whether a coursework folder actually proves the skills it claims.

The app is not another answer sheet. It is a working local tool that scans for scripts, notebooks, data, screenshots, Git evidence, validation metrics, model outputs, and documentation, then produces a readiness score and exportable report.

## Links

- GitHub repo: https://github.com/OG-Website/ali-assessment-learning-inspector
- Live demo: https://og-website.github.io/ali-assessment-learning-inspector/

![A.L.I. dashboard screenshot](docs/ali-dashboard-screenshot.png)

## What it demonstrates

- Unit 1: Python functions, file handling, conditionals, loops, and command-line tooling.
- Unit 2: Git/version-control evidence and clean project documentation.
- Unit 3: NumPy/Pandas-style evidence through notebooks, CSV files, and data outputs.
- Unit 4: vector thinking, validation metrics, model output files, checkpoints, and image evidence.
- Submission practice: evidence-led reporting instead of vague claims.

## Run the web app

```powershell
npm install
npm run dev
```

Open the local Vite URL shown in the terminal. The app starts with a sample scan loaded. Use **Choose folder** to scan another coursework folder from the browser.

## Use the live demo

Open the live demo link above in a browser. The app starts with a built-in sample scan. To test another folder, use **Choose folder** and select a coursework folder from the local machine. The browser reads filenames and file sizes for scoring; it does not upload the folder anywhere.

## What Ali can try

1. Open the live demo.
2. Review the built-in sample scan and the evidence score.
3. Click **Evidence**, **Metrics**, and **Report** to inspect the different assessor views.
4. Use **Choose folder** to scan a local coursework folder.
5. Use **Export report JSON** to download the evidence summary.

## Run the Python scanner

```powershell
python scripts\ali_scan.py sample-coursework --json
python scripts\ali_scan.py sample-coursework --report reports\ali-sample-report.md
```

The Python scanner uses only the standard library. It does not upload files or read private content; it checks filenames, sizes, and evidence patterns.

## Project layout

- `src/` - React/Vite app and evidence scoring rules.
- `scripts/ali_scan.py` - dependency-free local scanner.
- `sample-coursework/` - small demonstration evidence set.
- `design/ali-dashboard-concept.png` - generated UI concept used before implementation.

## Assessor-facing purpose

A.L.I. gives Ali a quick view of whether the work contains practical evidence, not just written explanation. It highlights missing proof before submission: no notebook, no metrics, no screenshots, no model output, weak documentation, empty files, or risky secret-looking filenames.
