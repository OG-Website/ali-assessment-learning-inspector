const presenceRules = [
  {
    id: "python",
    label: "Python scripts",
    group: "Core programming",
    weight: 12,
    minimum: 1,
    description: "Finds .py files that show functions, modules, decisions, loops, and reusable code.",
    patterns: [/\.py$/i],
    contentPatterns: [/\bdef\s+\w+\s*\(/i, /\bclass\s+\w+/i, /\bimport\s+\w+/i, /\bfor\s+\w+\s+in\b/i],
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
    contentPatterns: [/"cells"\s*:/i, /"cell_type"\s*:\s*"code"/i, /\bjupyter\b/i, /\bnotebook\b/i],
    skill: "Unit 3 notebook evidence",
  },
  {
    id: "tabular-data",
    label: "Tabular data",
    group: "Data handling",
    weight: 10,
    minimum: 1,
    description: "Finds CSV, JSON, or spreadsheet data used for analysis and repeatable testing.",
    patterns: [/\.csv$/i, /\.json$/i, /\.xlsx?$/i, /\.parquet$/i, /\.tsv$/i],
    contentPatterns: [/\bdataframe\b/i, /\bfeatures?\b/i, /\bcolumns?\b/i, /\bdataset\b/i],
    skill: "Pandas datasets and structured files",
  },
  {
    id: "visual-evidence",
    label: "Screenshot or image evidence",
    group: "Evidence",
    weight: 10,
    minimum: 1,
    description: "Finds PNG/JPG/WebP evidence showing the work running or model output being inspected.",
    patterns: [/\.(png|jpe?g|webp|gif|bmp)$/i, /screen[\s_-]?shot/i, /evidence/i, /proof/i, /capture/i],
    contentPatterns: [/\bscreenshot\b/i, /\bproof\b/i, /\bevidence\b/i],
    skill: "Real evidence collection",
  },
  {
    id: "git-evidence",
    label: "Git and version evidence",
    group: "Version control",
    weight: 10,
    minimum: 1,
    description: "Finds README, commit, branch, repository, or Git evidence material.",
    patterns: [/\.git(\/|\\|$)/i, /git/i, /commit/i, /branch/i, /readme/i, /github/i, /repository/i],
    contentPatterns: [/\bgit\s+(commit|push|status|log)\b/i, /\bcommit\s+[a-f0-9]{7,40}\b/i, /\bbranch\b/i],
    skill: "Unit 2 Git workflow",
  },
  {
    id: "metrics",
    label: "Validation metrics",
    group: "Model validation",
    weight: 14,
    minimum: 1,
    description: "Finds loss, accuracy, validation, confusion matrix, or metrics outputs.",
    patterns: [
      /metric/i,
      /accuracy/i,
      /loss/i,
      /validat/i,
      /eval/i,
      /confusion/i,
      /classification[\s_-]?report/i,
      /precision/i,
      /recall/i,
      /\bf1\b/i,
      /scores?/i,
      /summary\.json$/i,
    ],
    contentPatterns: [
      /\baccuracy\b/i,
      /\bvalidation\b/i,
      /\bprecision\b/i,
      /\brecall\b/i,
      /\bf1\b/i,
      /\bconfusion\s+matrix\b/i,
      /\bloss\b/i,
    ],
    skill: "Unit 4 validation and metrics",
  },
  {
    id: "model-output",
    label: "Model outputs and checkpoints",
    group: "Deep learning",
    weight: 12,
    minimum: 1,
    description: "Finds checkpoints, weights, trained models, inference output, or saved model summaries.",
    patterns: [
      /check[\s_-]*outputs?(?:[\s_-]*v?\d+)?/i,
      /checkpoint/i,
      /model/i,
      /inference/i,
      /predictions?/i,
      /outputs?/i,
      /results?/i,
      /runs?[\\/]/i,
      /saved[\s_-]?model/i,
      /best[\s_-]?model/i,
      /training[\s_-]?(output|run|result|log)/i,
      /\.(pt|pth|pkl|h5|keras|weights|onnx|safetensors|joblib|pb|tflite)$/i,
    ],
    contentPatterns: [
      /\bcheckpoint\b/i,
      /\binference\b/i,
      /\bpredictions?\b/i,
      /\bsaved_model\b/i,
      /\bstate_dict\b/i,
      /\bmodel[_\s-]?version\b/i,
      /\btrained\s+model\b/i,
    ],
    skill: "Unit 4 training and pretrained networks",
  },
  {
    id: "documentation",
    label: "Documentation",
    group: "Submission quality",
    weight: 10,
    minimum: 2,
    description: "Finds README, DOCX, PDF, Markdown, or text files that explain the work and evidence.",
    patterns: [/readme/i, /\.(md|txt|docx|pdf)$/i, /how.to/i, /guide/i, /write[\s_-]?up/i, /assessment/i],
    contentPatterns: [/\bassessment\b/i, /\bevidence\b/i, /\bcriteria\b/i, /\bexplain/i, /^#/m],
    skill: "Assessor-ready communication",
  },
];

export const evidenceCategories = presenceRules.map(({ id, label }) => ({ id, label }));

const sensitiveRules = [
  {
    reason: "Environment variable file",
    patterns: [/(^|[\\/])\.env(?:[.\w-]*)?$/i],
  },
  {
    reason: "Private key or certificate",
    patterns: [/(^|[\\/])id_(rsa|dsa|ecdsa|ed25519)$/i, /\.(pem|p12|pfx|key)$/i, /private[_\s-]?key/i],
  },
  {
    reason: "Credential, password, token, or API key",
    patterns: [
      /password/i,
      /secret/i,
      /api[_\s-]?key/i,
      /token/i,
      /credential/i,
      /client[_\s-]?secret/i,
      /service[_\s-]?account/i,
    ],
  },
  {
    reason: "Cloud or auth credential file",
    patterns: [/(google|firebase|aws|azure|gcp).*(credential|secret|key|token)/i, /credentials?\.json$/i],
  },
];

const sensitiveContentPatterns = [
  /\b(api[_-]?key|secret|token|password|private[_-]?key)\b\s*[:=]\s*["']?[A-Za-z0-9_\-./+=]{12,}/i,
  /-----BEGIN (RSA |DSA |EC |OPENSSH )?PRIVATE KEY-----/i,
  /\bAKIA[0-9A-Z]{16}\b/,
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
      const matches = files.filter((file) => getSensitiveFileIssue(file));
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

export const defaultCriteriaText = `AC2.3 - Use version control software to commit, push and evidence changes to a project.
AC3.1 - Write Python code that uses functions, structured logic and reusable scripts.
AC3.2 - Use Python libraries such as NumPy or Pandas to process data and produce outputs.
AC4.1 - Provide model evidence including validation metrics, training outputs or checkpoints.
AC4.2 - Explain the evidence clearly with documentation, screenshots and assessor-readable notes.`;

export const defaultEvidenceText = `The sample submission includes a Python script, a Jupyter notebook, CSV datasets, Git evidence notes, validation metrics, a model checkpoint, a JSON model summary, screenshot evidence and README documentation.`;

const criteriaMatrix = [
  {
    evidenceId: "git-evidence",
    label: "Git evidence",
    keywords: ["git", "commit", "push", "branch", "merge", "version", "repository", "github"],
  },
  {
    evidenceId: "python",
    label: "Python scripts",
    keywords: ["python", "script", "code", "function", "loop", "logic", "module", "program"],
  },
  {
    evidenceId: "notebooks",
    label: "Notebook evidence",
    keywords: ["notebook", "jupyter", "numpy", "pandas", "library", "libraries", "dataframe", "series"],
  },
  {
    evidenceId: "tabular-data",
    label: "Data files",
    keywords: ["csv", "data", "dataset", "table", "json", "spreadsheet", "features"],
  },
  {
    evidenceId: "metrics",
    label: "Validation metrics",
    keywords: [
      "metric",
      "accuracy",
      "loss",
      "validation",
      "confusion",
      "precision",
      "recall",
      "evaluate",
      "evaluation",
      "f1",
      "score",
    ],
  },
  {
    evidenceId: "model-output",
    label: "Model outputs",
    keywords: [
      "model",
      "checkpoint",
      "check output",
      "outputs",
      "results",
      "prediction",
      "training",
      "trained",
      "inference",
      "weights",
      "pretrained",
      "deep",
      "gpu",
    ],
  },
  {
    evidenceId: "visual-evidence",
    label: "Screenshot evidence",
    keywords: ["screenshot", "image", "output", "evidence", "proof", "result", "diagram"],
  },
  {
    evidenceId: "documentation",
    label: "Documentation",
    keywords: ["document", "documentation", "readme", "explain", "report", "notes", "guide", "assessor"],
  },
];

function normaliseFile(file) {
  const path = file.path || file.webkitRelativePath || file.name || "unknown";
  return {
    path,
    name: file.name || path.split(/[\\/]/).pop(),
    size: Number(file.size || 0),
    type: file.type || "",
    searchText: file.searchText || "",
    contentScanned: Boolean(file.contentScanned),
    contentTruncated: Boolean(file.contentTruncated),
    manualCategory: file.manualCategory || "",
  };
}

function fileSearchCorpus(file, includeContent = true) {
  return [file.path, file.name, includeContent ? file.searchText : ""].filter(Boolean).join("\n");
}

export function getSensitiveFileIssue(file, includeContent = false) {
  const path = file.path || file.webkitRelativePath || file.name || "";
  const pathRule = sensitiveRules.find((rule) => rule.patterns.some((pattern) => pattern.test(path)));
  if (pathRule) return pathRule.reason;

  if (includeContent && file.searchText) {
    const hasSensitiveContent = sensitiveContentPatterns.some((pattern) => pattern.test(file.searchText));
    if (hasSensitiveContent) return "Secret-looking value inside readable file";
  }

  return "";
}

export function splitSafeFiles(inputFiles, includeContent = false) {
  return inputFiles.reduce(
    (acc, file) => {
      const normalised = normaliseFile(file);
      const reason = getSensitiveFileIssue(normalised, includeContent);
      if (reason) {
        acc.blocked.push({
          reason,
          size: normalised.size,
        });
      } else {
        acc.accepted.push(normalised);
      }
      return acc;
    },
    { accepted: [], blocked: [] },
  );
}

export function summarizeBlockedFiles(blockedFiles) {
  return blockedFiles.reduce((summary, file) => {
    const reason = file.reason || "Sensitive file";
    summary[reason] = (summary[reason] || 0) + 1;
    return summary;
  }, {});
}

function evaluatePresence(rule, files) {
  const matches = files.filter((file) => {
    if (file.manualCategory === rule.id) return true;
    const pathCorpus = fileSearchCorpus(file, false);
    if (rule.patterns.some((pattern) => pattern.test(pathCorpus))) return true;
    if (!file.contentScanned || !rule.contentPatterns?.length) return false;
    return rule.contentPatterns.some((pattern) => pattern.test(file.searchText));
  });
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
    product: "OG A.L.I. - Marking Matrix",
    score: analysis.score,
    scannedFiles: analysis.files.length,
    blockedFiles: analysis.blockedFiles?.length || 0,
    blockedSummary: summarizeBlockedFiles(analysis.blockedFiles || []),
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

function splitCriteria(criteriaText) {
  return criteriaText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const match = line.match(/^([A-Z]*\s*\d+(?:\.\d+)?)[\s:)-]+(.+)$/i);
      return {
        id: match ? match[1].replace(/\s+/g, "").toUpperCase() : `C${index + 1}`,
        text: match ? match[2].trim() : line,
        raw: line,
      };
    });
}

function statusValue(status) {
  if (status === "pass") return 1;
  if (status === "warning") return 0.55;
  return 0;
}

export function evaluateMarkingMatrix(analysis, criteriaText, evidenceText) {
  const lowerEvidence = evidenceText.toLowerCase();
  const criteria = splitCriteria(criteriaText);
  const findingById = Object.fromEntries(analysis.findings.map((finding) => [finding.id, finding]));

  const rows = criteria.map((criterion) => {
    const lowerCriterion = `${criterion.id} ${criterion.text}`.toLowerCase();
    const mapped = criteriaMatrix
      .map((matrixItem) => {
        const criterionHits = matrixItem.keywords.filter((keyword) => lowerCriterion.includes(keyword));
        const evidenceHits = matrixItem.keywords.filter((keyword) => lowerEvidence.includes(keyword));
        const finding = findingById[matrixItem.evidenceId];
        const relevance = criterionHits.length * 2 + Math.min(evidenceHits.length, 2);
        return {
          ...matrixItem,
          finding,
          criterionHits,
          evidenceHits,
          relevance,
          value: finding ? statusValue(finding.status) : 0,
        };
      })
      .filter((item) => item.relevance > 0);

    const fallback = mapped.length
      ? mapped
      : criteriaMatrix.slice(0, 4).map((matrixItem) => ({
          ...matrixItem,
          finding: findingById[matrixItem.evidenceId],
          criterionHits: [],
          evidenceHits: [],
          relevance: 1,
          value: findingById[matrixItem.evidenceId] ? statusValue(findingById[matrixItem.evidenceId].status) : 0,
        }));

    const totalWeight = fallback.reduce((sum, item) => sum + item.relevance, 0);
    const earned = fallback.reduce((sum, item) => sum + item.value * item.relevance, 0);
    const score = Math.round((earned / totalWeight) * 100);
    const confidence = Math.min(95, Math.round(45 + Math.min(totalWeight, 10) * 5 + analysis.score * 0.2));
    const draftMark = score >= 75 ? "Met" : score >= 45 ? "Partially evidenced" : "Not evidenced";
    const humanReview =
      confidence < 70 || score < 75
        ? "Human review required before this can be treated as a mark."
        : "Strong evidence match, still requires assessor confirmation.";

    return {
      ...criterion,
      mappedEvidence: fallback,
      score,
      confidence,
      draftMark,
      humanReview,
      rationale:
        fallback
          .slice(0, 4)
          .map((item) => `${item.label}: ${item.finding?.status || "missing"}`)
          .join("; ") || "No evidence categories mapped.",
    };
  });

  const overallScore = rows.length
    ? Math.round(rows.reduce((sum, row) => sum + row.score, 0) / rows.length)
    : 0;

  return {
    rows,
    overallScore,
    assessorNote:
      "Draft marks are produced from evidence presence and keyword mapping. A tutor must confirm quality, authenticity and sufficiency.",
  };
}
