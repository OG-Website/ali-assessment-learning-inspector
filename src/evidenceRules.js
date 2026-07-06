const presenceRules = [
  {
    id: "python",
    label: "Python scripts",
    group: "Core programming",
    weight: 12,
    minimum: 1,
    description: "Finds .py files that show functions, modules, decisions, loops, and reusable code.",
    patterns: [/\.py$/i],
    skill: "Unit 1 Python fundamentals",
  },
  {
    id: "notebooks",
    label: "Jupyter notebooks",
    group: "Libraries",
    weight: 12,
    minimum: 1,
    description: "Finds .ipynb notebooks for practical NumPy, Pandas, visualisation, and model evidence.",
    patterns: [/\.ipynb$/i],
    skill: "Unit 3 notebook evidence",
  },
  {
    id: "tabular-data",
    label: "Tabular data",
    group: "Data handling",
    weight: 10,
    minimum: 1,
    description: "Finds CSV, JSON, or spreadsheet data used for analysis and repeatable testing.",
    patterns: [/\.csv$/i, /\.json$/i, /\.xlsx?$/i],
    skill: "Pandas datasets and structured files",
  },
  {
    id: "visual-evidence",
    label: "Screenshot or image evidence",
    group: "Evidence",
    weight: 10,
    minimum: 1,
    description: "Finds PNG/JPG/WebP evidence showing the work running or model output being inspected.",
    patterns: [/\.(png|jpe?g|webp)$/i, /screenshot/i, /evidence/i],
    skill: "Real evidence collection",
  },
  {
    id: "git-evidence",
    label: "Git and version evidence",
    group: "Version control",
    weight: 10,
    minimum: 1,
    description: "Finds README, commit, branch, repository, or Git evidence material.",
    patterns: [/\.git(\/|\\|$)/i, /git/i, /commit/i, /branch/i, /readme/i],
    skill: "Unit 2 Git workflow",
  },
  {
    id: "metrics",
    label: "Validation metrics",
    group: "Model validation",
    weight: 14,
    minimum: 1,
    description: "Finds loss, accuracy, validation, confusion matrix, or metrics outputs.",
    patterns: [/metric/i, /accuracy/i, /loss/i, /validation/i, /confusion/i, /summary\.json$/i],
    skill: "Unit 4 validation and metrics",
  },
  {
    id: "model-output",
    label: "Model outputs and checkpoints",
    group: "Deep learning",
    weight: 12,
    minimum: 1,
    description: "Finds checkpoints, weights, trained models, inference output, or saved model summaries.",
    patterns: [/checkpoint/i, /model/i, /inference/i, /\.(pt|pth|pkl|h5|keras|weights)$/i],
    skill: "Unit 4 training and pretrained networks",
  },
  {
    id: "documentation",
    label: "Documentation",
    group: "Submission quality",
    weight: 10,
    minimum: 2,
    description: "Finds README, DOCX, PDF, Markdown, or text files that explain the work and evidence.",
    patterns: [/readme/i, /\.(md|txt|docx|pdf)$/i, /how.to/i, /guide/i],
    skill: "Assessor-ready communication",
  },
];

const qualityRules = [
  {
    id: "empty-files",
    label: "Empty file check",
    group: "Quality",
    weight: 5,
    description: "Warns if files are present but have zero bytes.",
    skill: "File validation and debugging",
    evaluate(files) {
      const matches = files.filter((file) => file.size === 0);
      return {
        matches,
        status: matches.length ? "warning" : "pass",
        note: matches.length
          ? `${matches.length} empty file(s) need checking before submission.`
          : "No empty files detected in the scanned manifest.",
      };
    },
  },
  {
    id: "secret-names",
    label: "Secret filename check",
    group: "Safety",
    weight: 5,
    description: "Warns if filenames suggest passwords, tokens, API keys, or private keys.",
    skill: "Responsible project hygiene",
    evaluate(files) {
      const matches = files.filter((file) =>
        /(password|secret|api[_-]?key|token|private[_-]?key|credential)/i.test(file.path),
      );
      return {
        matches,
        status: matches.length ? "warning" : "pass",
        note: matches.length
          ? "Potential secret-bearing filenames were detected and should be removed or redacted."
          : "No obvious secret-bearing filenames detected.",
      };
    },
  },
];

export const collegeSampleFiles = [
  { path: "sample-coursework/scripts/assessment_classifier.py", name: "assessment_classifier.py", size: 1840 },
  { path: "sample-coursework/notebooks/unit4_vector_demo.ipynb", name: "unit4_vector_demo.ipynb", size: 2840 },
  { path: "sample-coursework/data/titanic_features.csv", name: "titanic_features.csv", size: 432 },
  { path: "sample-coursework/data/model_metrics.csv", name: "model_metrics.csv", size: 214 },
  { path: "sample-coursework/evidence/coursework-folder-preview.jpg", name: "coursework-folder-preview.jpg", size: 56368 },
  { path: "sample-coursework/model-output/training_metrics.csv", name: "training_metrics.csv", size: 243 },
  { path: "sample-coursework/model-output/assessment_summary.json", name: "assessment_summary.json", size: 601 },
  { path: "sample-coursework/model-output/best_model_checkpoint.pt", name: "best_model_checkpoint.pt", size: 128 },
  { path: "sample-coursework/docs/README.md", name: "README.md", size: 1280 },
  { path: "sample-coursework/docs/git-evidence.md", name: "git-evidence.md", size: 640 },
];

function normaliseFile(file) {
  const path = file.path || file.webkitRelativePath || file.name || "unknown";
  return {
    path,
    name: file.name || path.split(/[\\/]/).pop(),
    size: Number(file.size || 0),
  };
}

function evaluatePresence(rule, files) {
  const matches = files.filter((file) => rule.patterns.some((pattern) => pattern.test(file.path)));
  let status = "pass";
  if (matches.length === 0) {
    status = "missing";
  } else if (matches.length < rule.minimum) {
    status = "warning";
  }

  const note =
    status === "pass"
      ? `${matches.length} matching item(s) found.`
      : status === "warning"
        ? `${matches.length} found, but ${rule.minimum} expected for stronger evidence.`
        : "No matching evidence found.";

  return {
    ...rule,
    matches,
    status,
    note,
  };
}

export function evaluateFiles(inputFiles) {
  const files = inputFiles.map(normaliseFile);
  const findings = [
    ...presenceRules.map((rule) => evaluatePresence(rule, files)),
    ...qualityRules.map((rule) => ({ ...rule, ...rule.evaluate(files) })),
  ];

  const totalWeight = findings.reduce((sum, finding) => sum + finding.weight, 0);
  const earnedWeight = findings.reduce((sum, finding) => {
    if (finding.status === "pass") return sum + finding.weight;
    if (finding.status === "warning") return sum + finding.weight * 0.5;
    return sum;
  }, 0);

  const counts = findings.reduce(
    (acc, finding) => {
      acc[finding.status] += 1;
      return acc;
    },
    { pass: 0, warning: 0, missing: 0 },
  );

  const grouped = findings.reduce((acc, finding) => {
    acc[finding.group] = acc[finding.group] || [];
    acc[finding.group].push(finding);
    return acc;
  }, {});

  return {
    files,
    findings,
    grouped,
    score: Math.round((earnedWeight / totalWeight) * 100),
    totalWeight,
    earnedWeight,
    counts,
  };
}

export function buildReport(analysis) {
  const priority = analysis.findings
    .filter((finding) => finding.status !== "pass")
    .map((finding) => `${finding.label}: ${finding.note}`);

  return {
    generatedAt: new Date().toISOString(),
    product: "A.L.I. - Assessment Learning Inspector",
    score: analysis.score,
    scannedFiles: analysis.files.length,
    summary: analysis.counts,
    priorityActions: priority.length ? priority : ["No immediate evidence gaps detected."],
    findings: analysis.findings.map((finding) => ({
      id: finding.id,
      label: finding.label,
      group: finding.group,
      status: finding.status,
      weight: finding.weight,
      note: finding.note,
      skill: finding.skill,
      matches: finding.matches.slice(0, 8).map((file) => file.path),
    })),
  };
}
