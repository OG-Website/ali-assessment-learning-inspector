import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

import {
  buildReport,
  evaluateFiles,
  evaluateMarkingMatrix,
  getSensitiveFileIssue,
  summarizeBlockedFiles,
} from "../src/evidenceRules.js";
import { assessmentIndex, assessmentSources, defaultAssessmentSourceId } from "../src/assessmentCriteria.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const defaultAiProgrammingRoot = path.resolve(repoRoot, "..", "..");

const skipDirs = new Set([".git", "venv", "node_modules", "dist", "__pycache__", ".next", ".ipynb_checkpoints"]);
const textScanLimit = 250_000;
const readableExtensions = new Set([
  ".cfg",
  ".css",
  ".csv",
  ".html",
  ".ini",
  ".ipynb",
  ".js",
  ".json",
  ".jsx",
  ".log",
  ".md",
  ".py",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".xml",
  ".yaml",
  ".yml",
]);
const officeExtensions = new Set([".docx", ".pptx", ".xlsx"]);

const defaultAuditFolders = [
  "Unit 1/assessment 1",
  "Unit 1/assessment 2",
  "Unit 1/Assessment 3",
  "Unit 2 Git/AC2.3 Commit Version Control Evidence/AC2.3 Submission Pack - Rob Johnston",
  "Unit 2 Git/Assessment 3/Assessment 3 - OG Web.site Submission Pack",
  "Unit 3 - Libraries for python/Assessment 3 - NumPy ndarray Evidence",
  "Unit 3 - Libraries for python/Assessment 4 - Pandas Evidence",
  "Unit 3 - Libraries for python/Assessment 5 - Visualisation Answer Sheet",
  "Unit 4 - Linear Algebra Essentials for Deep Learning/Assessment 1 - Deep Learning",
  "Unit 4 - Linear Algebra Essentials for Deep Learning/Assessment 2 - Validation Datasets and Metrics",
  "Unit 4 - Linear Algebra Essentials for Deep Learning/Assessment 3 - Vectors",
  "Unit 4 - Linear Algebra Essentials for Deep Learning/Assessment 4 - Linear Algebra and Matrices",
  "Unit 4 - Linear Algebra Essentials for Deep Learning/Assessment 5 - Deep Learning Training Project",
  "Unit 4 - Linear Algebra Essentials for Deep Learning/Assessment 6 - Pretrained Networks and Image Processing Project",
];

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    root: defaultAiProgrammingRoot,
    out: path.resolve(repoRoot, "real-coursework-audit"),
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--root") {
      options.root = path.resolve(args[index + 1]);
      index += 1;
    } else if (arg === "--out") {
      options.out = path.resolve(args[index + 1]);
      index += 1;
    } else if (arg === "--help") {
      console.log("Usage: node scripts/run_real_coursework_audit.js [--root <AI Programming root>] [--out <report folder>]");
      process.exit(0);
    }
  }

  return options;
}

function normaliseText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/rob johnston/g, "")
    .replace(/og web\.site/g, "og website")
    .replace(/[^a-z0-9.]+/g, " ")
    .trim();
}

function slugify(value) {
  return normaliseText(value).replace(/\./g, "-").replace(/\s+/g, "-").slice(0, 90) || "audit";
}

function unitNumber(value) {
  return value.match(/unit\s*[-_ ]?(\d+)/i)?.[1] || "";
}

function assessmentNumber(value) {
  const acMatch = value.match(/\bac\s*(\d+(?:\.\d+)?)/i);
  if (acMatch) return acMatch[1];
  return value.match(/assessment\s*[-_ ]?(\d+)/i)?.[1] || "";
}

function sourceScore(auditPath, source) {
  const audit = normaliseText(auditPath);
  const haystack = normaliseText(`${source.unit} ${source.title} ${source.path} ${source.criteriaText}`);
  const auditUnit = unitNumber(auditPath);
  const auditAssessment = assessmentNumber(auditPath);
  let score = 0;

  if (auditUnit && (haystack.includes(`unit ${auditUnit}`) || haystack.includes(`unit-${auditUnit}`))) score += 5;
  if (auditAssessment && haystack.includes(auditAssessment)) score += 6;
  if (audit.includes("ac2.3") && source.id === defaultAssessmentSourceId) score += 12;

  for (const word of audit.split(/\s+/).filter((item) => item.length >= 5)) {
    if (haystack.includes(word)) score += 1;
  }

  return score;
}

function chooseCriteriaSources(auditPath) {
  const chosen = [];
  const seenTitles = new Set();
  const scored = assessmentSources
    .map((source) => ({ source, score: sourceScore(auditPath, source) }))
    .filter(({ score }) => score > 4)
    .sort((a, b) => b.score - a.score)
    .map(({ source }) => source);

  for (const source of scored) {
    const titleKey = normaliseText(source.title);
    if (!seenTitles.has(titleKey)) {
      chosen.push(source);
      seenTitles.add(titleKey);
    }
    if (chosen.length === 4) break;
  }

  if (chosen.length) return chosen;
  return assessmentSources.filter((source) => source.id === defaultAssessmentSourceId);
}

function uniqueCriteriaText(sources) {
  const seen = new Set();
  const lines = [];

  for (const source of sources) {
    for (const line of source.criteriaText.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)) {
      const key = normaliseText(line);
      if (!seen.has(key)) {
        seen.add(key);
        lines.push(line);
      }
    }
  }

  return lines.join("\n");
}

function readTextFile(filePath) {
  const buffer = fs.readFileSync(filePath);
  const slice = buffer.subarray(0, Math.min(buffer.length, textScanLimit));
  return {
    text: slice.toString("utf8"),
    truncated: buffer.length > textScanLimit,
  };
}

function stripXml(value) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function readZipXml(filePath, prefixes) {
  const buffer = fs.readFileSync(filePath);
  const entries = [];
  let offset = 0;
  let totalLength = 0;
  let truncated = false;

  while (offset + 30 <= buffer.length) {
    const signature = buffer.readUInt32LE(offset);
    if (signature !== 0x04034b50) break;
    const flags = buffer.readUInt16LE(offset + 6);
    const method = buffer.readUInt16LE(offset + 8);
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const fileNameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const dataStart = nameStart + fileNameLength + extraLength;
    const name = buffer.subarray(nameStart, nameStart + fileNameLength).toString("utf8");
    const dataEnd = dataStart + compressedSize;

    if (compressedSize === 0xffffffff || flags & 0x08) break;
    if (dataEnd > buffer.length) break;

    if (name.endsWith(".xml") && prefixes.some((prefix) => name.startsWith(prefix))) {
      const raw = buffer.subarray(dataStart, dataEnd);
      let text = "";
      if (method === 0) {
        text = raw.toString("utf8");
      } else if (method === 8) {
        text = zlib.inflateRawSync(raw).toString("utf8");
      }

      if (text) {
        const remaining = textScanLimit - totalLength;
        if (remaining <= 0) {
          truncated = true;
          break;
        }
        if (text.length > remaining) {
          text = text.slice(0, remaining);
          truncated = true;
        }
        entries.push(stripXml(text));
        totalLength += text.length;
      }
    }

    offset = dataEnd;
  }

  return { text: entries.join("\n"), truncated };
}

function readSearchText(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  try {
    if (readableExtensions.has(ext)) return readTextFile(filePath);
    if (officeExtensions.has(ext)) {
      const prefixes =
        ext === ".docx"
          ? ["word/document.xml", "word/header", "word/footer"]
          : ext === ".pptx"
            ? ["ppt/slides/", "ppt/notesSlides/"]
            : ["xl/sharedStrings.xml", "xl/worksheets/"];
      return readZipXml(filePath, prefixes);
    }
  } catch {
    return { text: "", truncated: false };
  }

  return { text: "", truncated: false };
}

function walkFiles(root) {
  const results = [];
  const stack = [root];

  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        const lowerName = entry.name.toLowerCase();
        if (!skipDirs.has(lowerName) && !lowerName.startsWith(".venv")) stack.push(path.join(current, entry.name));
      } else if (entry.isFile()) {
        results.push(path.join(current, entry.name));
      }
    }
  }

  return results;
}

function buildEvidenceEntries(root) {
  const files = [];
  const blockedFiles = [];

  for (const filePath of walkFiles(root)) {
    const relativePath = path.relative(root, filePath).replaceAll(path.sep, "/");
    const stat = fs.statSync(filePath);
    const baseEntry = {
      path: relativePath,
      name: path.basename(filePath),
      size: stat.size,
      searchText: "",
      contentScanned: false,
      contentTruncated: false,
    };

    const pathIssue = getSensitiveFileIssue(baseEntry);
    if (pathIssue) {
      blockedFiles.push({ reason: pathIssue, size: stat.size });
      continue;
    }

    const { text, truncated } = readSearchText(filePath);
    const entry = {
      ...baseEntry,
      searchText: text,
      contentScanned: Boolean(text),
      contentTruncated: truncated,
    };

    const contentIssue = getSensitiveFileIssue(entry, true);
    if (contentIssue) {
      blockedFiles.push({ reason: contentIssue, size: stat.size });
    } else {
      files.push(entry);
    }
  }

  return { files, blockedFiles };
}

function buildEvidenceText(files, findings) {
  const names = files.map((file) => file.path).join("\n");
  const findingLines = findings
    .map((finding) => `${finding.label}: ${finding.status}; ${finding.matches.map((file) => file.path).join(", ")}`)
    .join("\n");
  return `${names}\n${findingLines}`;
}

function markdownTable(rows) {
  return rows.join("\n");
}

function compactMarking(marking) {
  return {
    overallScore: marking.overallScore,
    assessorNote: marking.assessorNote,
    rows: marking.rows.map((row) => ({
      id: row.id,
      raw: row.raw,
      draftMark: row.draftMark,
      score: row.score,
      confidence: row.confidence,
      rationale: row.rationale,
      humanReview: row.humanReview,
      mappedEvidence: row.mappedEvidence.map((item) => ({
        evidenceId: item.evidenceId,
        label: item.label,
        relevance: item.relevance,
        status: item.finding?.status || "missing",
        matchCount: item.finding?.matches?.length || 0,
      })),
    })),
  };
}

function writeAssessmentReport({ outDir, label, relativePath, criteriaSources, analysis, marking, report }) {
  const baseName = slugify(label);
  const jsonPath = path.join(outDir, `${baseName}.json`);
  const mdPath = path.join(outDir, `${baseName}.md`);
  const blockedSummary = summarizeBlockedFiles(analysis.blockedFiles || []);
  const compact = compactMarking(marking);

  fs.writeFileSync(
    jsonPath,
    `${JSON.stringify({ label, relativePath, criteriaSources, report, marking: compact }, null, 2)}\n`,
    "utf8",
  );

  const lines = [
    `# A.L.I. Real Coursework Audit - ${label}`,
    "",
    `Source folder: \`${relativePath}\``,
    `Generated: \`${report.generatedAt}\``,
    `Draft evidence score: **${report.score}%**`,
    `Safe files scanned: **${report.scannedFiles}**`,
    `Sensitive files blocked: **${report.blockedFiles}**`,
    "",
    "## Criteria Sources Used",
    "",
    ...criteriaSources.map(
      (source) => `- ${source.title} (${source.unit}, ${source.type.toUpperCase()}, ${source.criteriaCount} criteria) - ${source.path}`,
    ),
    "",
    "## Draft Marking Matrix",
    "",
    "| Criterion | Draft mark | Score | Confidence | Rationale |",
    "| --- | --- | ---: | ---: | --- |",
    ...marking.rows.map(
      (row) =>
        `| ${row.raw.replaceAll("|", "\\|")} | ${row.draftMark} | ${row.score}% | ${row.confidence}% | ${row.rationale.replaceAll("|", "\\|")} |`,
    ),
    "",
    "## Evidence Findings",
    "",
    "| Evidence check | Status | Matches | Note |",
    "| --- | --- | ---: | --- |",
    ...analysis.findings.map(
      (finding) =>
        `| ${finding.label} | ${finding.status} | ${finding.matches.length} | ${finding.note.replaceAll("|", "\\|")} |`,
    ),
    "",
  ];

  if (Object.keys(blockedSummary).length) {
    lines.push("## Safety Blocks", "");
    for (const [reason, count] of Object.entries(blockedSummary)) {
      lines.push(`- ${reason}: ${count}`);
    }
    lines.push("");
  }

  lines.push(
    "## Assessor Note",
    "",
    marking.assessorNote,
    "This is evidence mapping only. It is not a final official mark.",
    "",
  );

  fs.writeFileSync(mdPath, `${lines.join("\n")}\n`, "utf8");
  return { jsonPath, mdPath };
}

function runAudit(options) {
  const outDir = options.out;
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  const summaries = [];
  for (const relativePath of defaultAuditFolders) {
    const absolutePath = path.join(options.root, relativePath);
    if (!fs.existsSync(absolutePath)) {
      summaries.push({ label: relativePath, relativePath, missing: true });
      continue;
    }

    const label = relativePath.split(/[\\/]/).pop();
    const criteriaSources = chooseCriteriaSources(relativePath);
    const criteriaText = uniqueCriteriaText(criteriaSources);
    const { files, blockedFiles } = buildEvidenceEntries(absolutePath);
    const analysis = { ...evaluateFiles(files), blockedFiles };
    const evidenceText = buildEvidenceText(files, analysis.findings);
    const marking = evaluateMarkingMatrix(analysis, criteriaText, evidenceText);
    const report = buildReport(analysis);
    const paths = writeAssessmentReport({ outDir, label, relativePath, criteriaSources, analysis, marking, report });

    summaries.push({
      label,
      relativePath,
      score: report.score,
      overallCriteriaScore: marking.overallScore,
      scannedFiles: report.scannedFiles,
      blockedFiles: report.blockedFiles,
      pass: analysis.counts.pass,
      warning: analysis.counts.warning,
      missingChecks: analysis.counts.missing,
      criteriaSources: criteriaSources.map((source) => source.title),
      markdownReport: path.basename(paths.mdPath),
      jsonReport: path.basename(paths.jsonPath),
    });
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    aiProgrammingRoot: options.root,
    assessmentIndex: {
      scannedSourceCount: assessmentIndex.scannedSourceCount,
      indexedSourceCount: assessmentIndex.indexedSourceCount,
      defaultSourceId: assessmentIndex.defaultSourceId,
    },
    audits: summaries,
  };

  fs.writeFileSync(path.join(outDir, "audit-summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");

  const summaryLines = [
    "# A.L.I. Real Coursework Audit Summary",
    "",
    `Generated: \`${summary.generatedAt}\``,
    `Criteria index: **${assessmentIndex.indexedSourceCount}** criteria-bearing sources from **${assessmentIndex.scannedSourceCount}** scanned local source files.`,
    "",
    "These reports use the same evidence rules and criteria mapping as the A.L.I. web app. They are draft evidence audits for assessor review, not final official marks.",
    "",
    "## Results",
    "",
    markdownTable([
      "| Work folder | Evidence score | Criteria score | Safe files | Blocked | Report |",
      "| --- | ---: | ---: | ---: | ---: | --- |",
      ...summaries.map((item) =>
        item.missing
          ? `| ${item.label} | missing | missing | 0 | 0 | folder not found |`
          : `| ${item.label} | ${item.score}% | ${item.overallCriteriaScore}% | ${item.scannedFiles} | ${item.blockedFiles} | ${item.markdownReport} |`,
      ),
    ]),
    "",
    "## Criteria Coverage",
    "",
    ...summaries
      .filter((item) => !item.missing)
      .map((item) => `- ${item.label}: ${item.criteriaSources.join("; ")}`),
    "",
  ];

  fs.writeFileSync(path.join(outDir, "audit-summary.md"), `${summaryLines.join("\n")}\n`, "utf8");
  return summary;
}

const options = parseArgs();
const summary = runAudit(options);
console.log(`A.L.I. real coursework audit written to ${options.out}`);
console.log(`Audited ${summary.audits.filter((item) => !item.missing).length} folders with ${assessmentIndex.indexedSourceCount} indexed criteria sources.`);
