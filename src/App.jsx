import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileSearch,
  FileCheck2,
  FileText,
  FolderOpen,
  Gauge,
  GraduationCap,
  Layers3,
  ListChecks,
  LockKeyhole,
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  UploadCloud,
  XCircle,
} from "lucide-react";
import {
  buildReport,
  defaultCriteriaText,
  evidenceCategories,
  evaluateFiles,
  evaluateMarkingMatrix,
  getSensitiveFileIssue,
  summarizeBlockedFiles,
} from "./evidenceRules.js";
import { assessmentIndex, assessmentSources, defaultAssessmentSourceId } from "./assessmentCriteria.js";
import { collegeEvidenceSets, defaultCollegeEvidenceSetId } from "./collegeEvidenceManifest.js";

const navItems = [
  { id: "marking", label: "Marking", icon: Scale },
  { id: "scan", label: "Scan", icon: FileSearch },
  { id: "evidence", label: "Evidence", icon: ClipboardCheck },
  { id: "metrics", label: "Metrics", icon: BarChart3 },
  { id: "report", label: "Report", icon: ShieldCheck },
];

const statusConfig = {
  pass: { label: "Pass", icon: CheckCircle2 },
  warning: { label: "Warning", icon: AlertTriangle },
  missing: { label: "Needs review", icon: XCircle },
};

const statusFilterLabels = {
  all: "all",
  pass: "pass",
  warning: "warning",
  missing: "needs review",
};

const textScanLimit = 250_000;
const readableEvidencePattern =
  /\.(py|ipynb|md|txt|csv|json|js|jsx|ts|tsx|html|css|yml|yaml|toml|ini|cfg|xml|log)$/i;

const defaultAssessmentSource =
  assessmentSources.find((source) => source.id === defaultAssessmentSourceId) || assessmentSources[0];
const defaultCollegeEvidenceSet =
  collegeEvidenceSets.find((set) => set.id === defaultCollegeEvidenceSetId) || collegeEvidenceSets[0];
const initialCriteriaText = defaultCollegeEvidenceSet?.criteriaText || defaultAssessmentSource?.criteriaText || defaultCriteriaText;
const initialEvidenceText = defaultCollegeEvidenceSet?.evidenceText || "";
const initialCriteriaSourceId = defaultCollegeEvidenceSet?.criteriaSourceIds?.[0] || defaultAssessmentSource?.id || "";

function criteriaLines(source) {
  return source?.criteriaText?.split(/\r?\n/).filter(Boolean) || [];
}

function canReadTextForSearch(file, path) {
  return file.size <= 2_000_000 && readableEvidencePattern.test(path);
}

async function buildEvidenceEntry(file) {
  const path = file.webkitRelativePath || file.name;
  const entry = {
    path,
    name: file.name,
    size: file.size,
    type: file.type || "",
    searchText: "",
    contentScanned: false,
    contentTruncated: false,
  };

  if (!canReadTextForSearch(file, path)) return entry;

  try {
    entry.searchText = await file.slice(0, textScanLimit).text();
    entry.contentScanned = true;
    entry.contentTruncated = file.size > textScanLimit;
  } catch {
    entry.searchText = "";
  }

  return entry;
}

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function StatusBadge({ status }) {
  const Icon = statusConfig[status].icon;
  return (
    <span className={`status-badge ${status}`}>
      <Icon size={15} />
      {statusConfig[status].label}
    </span>
  );
}

function ScoreRing({ score }) {
  return (
    <div className="score-ring" style={{ "--score": `${score * 3.6}deg` }} aria-label={`Evidence score ${score}%`}>
      <div>
        <strong>{score}</strong>
        <span>%</span>
      </div>
    </div>
  );
}

function BlockedFilesAlert({ blockedFiles }) {
  if (!blockedFiles.length) return null;
  const summary = summarizeBlockedFiles(blockedFiles);

  return (
    <div className="safety-alert">
      <LockKeyhole size={18} />
      <div>
        <strong>{blockedFiles.length} sensitive file(s) blocked</strong>
        <p>Excluded before scoring, file listing, and report export.</p>
        <ul>
          {Object.entries(summary).map(([reason, count]) => (
            <li key={reason}>
              {count} x {reason}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function UploadPanel({
  onFiles,
  onLoadCollegeSet,
  fileCount,
  blockedFiles,
  evidenceSets,
  selectedEvidenceSetId,
  onEvidenceSetChange,
}) {
  return (
    <section className="upload-panel">
      <div className="upload-copy">
        <UploadCloud size={28} />
        <div>
          <h2>Inspect a coursework folder</h2>
          <p>
            A.L.I. checks for scripts, notebooks, data, screenshots, Git evidence, validation metrics,
            checkpoints, and documentation.
          </p>
        </div>
      </div>
      <div className="upload-actions">
        <label className="primary-button">
          <FolderOpen size={18} />
          Choose folder
          <input type="file" webkitdirectory="" directory="" multiple onChange={onFiles} />
        </label>
        <label className="evidence-set-picker">
          <span>Real College evidence set</span>
          <select value={selectedEvidenceSetId} onChange={(event) => onEvidenceSetChange(event.target.value)}>
            {evidenceSets.map((set) => (
              <option key={set.id} value={set.id}>
                {set.relativePath}
              </option>
            ))}
          </select>
        </label>
        <button className="secondary-button" type="button" onClick={onLoadCollegeSet}>
          <GraduationCap size={18} />
          Load selected evidence
        </button>
      </div>
      <p className="folder-note">{fileCount} file(s) loaded for the current scan.</p>
      <BlockedFilesAlert blockedFiles={blockedFiles} />
    </section>
  );
}

function CriteriaSourcePanel({ sourceId, source, onSourceChange, onLoadSource }) {
  const previewLines = criteriaLines(source).slice(0, 7);

  return (
    <div className="criteria-library">
      <div className="criteria-library-top">
        <div>
          <div className="hero-label">
            <ListChecks size={16} />
            Criteria library
          </div>
          <h3>{assessmentIndex.indexedSourceCount} criteria sources indexed</h3>
          <p>
            {assessmentIndex.scannedSourceCount} local AI Programming source document(s) scanned into a compact
            criteria index.
          </p>
        </div>
        <div className="criteria-actions">
          <label>
            <span>Assessment source</span>
            <select value={sourceId} onChange={(event) => onSourceChange(event.target.value)}>
              <option value="">No criteria source selected</option>
              {assessmentSources.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.unit} - {item.title}
                </option>
              ))}
            </select>
          </label>
          <button className="secondary-button" type="button" onClick={onLoadSource}>
            <FileText size={18} />
            Load criteria
          </button>
        </div>
      </div>

      {source ? (
        <div className="criteria-source-card">
          <strong>{source.title}</strong>
          <small>
            {source.unit} / {source.type.toUpperCase()} / {source.criteriaCount} criteria / {source.path}
          </small>
          <ul>
            {previewLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="criteria-source-card">
          <strong>No indexed source loaded</strong>
          <small>The evidence folder can still be scanned, but A.L.I. will not infer criteria from another unit.</small>
        </div>
      )}
    </div>
  );
}

function AuditLogPanel({ evidenceSet, analysis, marking }) {
  return (
    <div className="audit-log-panel">
      <div>
        <strong>Current marking log</strong>
        <span>{evidenceSet ? evidenceSet.relativePath : "Manual folder upload"}</span>
      </div>
      <ul>
        <li>{analysis.files.length} accepted file(s) loaded.</li>
        <li>{analysis.blockedFiles?.length || 0} sensitive file(s) blocked before scoring.</li>
        <li>{marking.rows.length} criteria row(s) active in the matrix.</li>
        <li>
          {evidenceSet?.criteriaSourceTitles?.length
            ? `Criteria source(s): ${evidenceSet.criteriaSourceTitles.join("; ")}`
            : "No indexed criteria source is attached to this evidence folder."}
        </li>
      </ul>
    </div>
  );
}

function MarkingView({
  analysis,
  marking,
  criteriaText,
  evidenceText,
  onCriteriaChange,
  onEvidenceChange,
  onLoadPreset,
  criteriaSourceId,
  criteriaSource,
  onCriteriaSourceChange,
  onLoadCriteriaSource,
  selectedEvidenceSet,
}) {
  return (
    <section className="marking-section">
      <div className="marking-hero">
        <img src={`${import.meta.env.BASE_URL}og-logo.png`} alt="OG logo" />
        <div>
          <div className="hero-label">
            <Sparkles size={16} />
            OG branded assessor support
          </div>
          <h2>OG A.L.I. Marking Matrix</h2>
          <p>
            Paste assessment criteria, scan the evidence folder, and A.L.I. produces a transparent
            draft mark for each criterion with confidence and human-review notes.
          </p>
        </div>
        <div className="marking-score">
          <span>Draft matrix score</span>
          <strong>{marking.overallScore}%</strong>
        </div>
      </div>

      <CriteriaSourcePanel
        sourceId={criteriaSourceId}
        source={criteriaSource}
        onSourceChange={onCriteriaSourceChange}
        onLoadSource={onLoadCriteriaSource}
      />

      <AuditLogPanel evidenceSet={selectedEvidenceSet} analysis={analysis} marking={marking} />

      <div className="marking-inputs">
        <label>
          <span>Assessment criteria</span>
          <textarea value={criteriaText} onChange={(event) => onCriteriaChange(event.target.value)} />
        </label>
        <label>
          <span>Learner evidence notes</span>
          <textarea value={evidenceText} onChange={(event) => onEvidenceChange(event.target.value)} />
        </label>
      </div>

      <div className="matrix-toolbar">
        <button className="secondary-button" type="button" onClick={onLoadPreset}>
          <FileCheck2 size={18} />
          Load default AC2.3 criteria
        </button>
        <span>
          Uses {analysis.findings.length} evidence checks and {marking.rows.length} criteria rows.
        </span>
      </div>

      <div className="marking-matrix" role="table">
        <div className="matrix-row matrix-head" role="row">
          <span>Criterion</span>
          <span>Mapped evidence</span>
          <span>Draft mark</span>
          <span>Confidence</span>
        </div>
        {marking.rows.map((row) => (
          <article className="matrix-row" key={`${row.id}-${row.text}`} role="row">
            <span>
              <strong>{row.id}</strong>
              <small>{row.text}</small>
            </span>
            <span>
              <strong>{row.rationale}</strong>
              <small>{row.humanReview}</small>
            </span>
            <span>
              <StatusBadge status={row.score >= 75 ? "pass" : row.score >= 45 ? "warning" : "missing"} />
              <small>{row.score}% evidence match</small>
            </span>
            <span>
              <strong>{row.confidence}%</strong>
              <small>draft confidence</small>
            </span>
          </article>
        ))}
      </div>

      <p className="assessor-disclaimer">
        <ShieldCheck size={17} />
        {marking.assessorNote}
      </p>
    </section>
  );
}

function FileReviewPanel({ files, analysis, manualTags, onRemoveFile, onSetManualTag }) {
  const [query, setQuery] = useState("");
  const matchesByPath = useMemo(() => {
    const map = new Map();
    const categoryIds = new Set(evidenceCategories.map((category) => category.id));

    analysis.findings
      .filter((finding) => categoryIds.has(finding.id))
      .forEach((finding) => {
        finding.matches.forEach((file) => {
          const matches = map.get(file.path) || [];
          matches.push(finding.label);
          map.set(file.path, matches);
        });
      });

    return map;
  }, [analysis.findings]);

  const filteredFiles = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return files;
    return files.filter((file) => {
      const tags = (matchesByPath.get(file.path) || []).join(" ").toLowerCase();
      return `${file.path} ${file.name} ${tags}`.toLowerCase().includes(needle);
    });
  }, [files, matchesByPath, query]);

  return (
    <section className="file-review-section">
      <div className="section-heading">
        <div>
          <h2>Selected evidence files</h2>
          <p>Review every accepted file, remove the wrong ones, or override the evidence type.</p>
        </div>
        <label className="file-search">
          <Search size={16} />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search files or evidence types"
          />
        </label>
      </div>

      <div className="file-review-table" role="table">
        <div className="file-review-row file-review-head" role="row">
          <span>File</span>
          <span>Auto evidence</span>
          <span>Override</span>
          <span>Action</span>
        </div>
        {filteredFiles.map((file) => {
          const autoMatches = matchesByPath.get(file.path) || [];
          return (
            <div className="file-review-row" role="row" key={file.path}>
              <span>
                <strong>{file.name}</strong>
                <small>
                  {file.path} / {formatBytes(file.size)}
                  {file.contentScanned ? " / content scanned" : " / name only"}
                  {file.contentTruncated ? " / truncated" : ""}
                </small>
              </span>
              <span>
                {autoMatches.length ? (
                  autoMatches.slice(0, 4).map((match) => <em key={match}>{match}</em>)
                ) : (
                  <small>No automatic match</small>
                )}
              </span>
              <span>
                <select value={manualTags[file.path] || ""} onChange={(event) => onSetManualTag(file.path, event.target.value)}>
                  <option value="">Auto</option>
                  {evidenceCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </span>
              <span>
                <button className="icon-button danger" type="button" onClick={() => onRemoveFile(file.path)} title="Remove file">
                  <Trash2 size={17} />
                </button>
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function EvidenceTable({ findings, filter, onFilter, selectedId, onSelect }) {
  const filtered = filter === "all" ? findings : findings.filter((finding) => finding.status === filter);

  return (
    <section className="table-section">
      <div className="section-heading">
        <div>
          <h2>Evidence checks</h2>
          <p>Each row maps one course skill to a concrete proof requirement.</p>
        </div>
        <div className="filter-group" aria-label="Filter evidence checks">
          {["all", "pass", "warning", "missing"].map((item) => (
            <button
              key={item}
              className={filter === item ? "selected" : ""}
              type="button"
              onClick={() => onFilter(item)}
            >
              {statusFilterLabels[item]}
            </button>
          ))}
        </div>
      </div>
      <div className="evidence-table" role="table">
        <div className="table-row table-head" role="row">
          <span>Check</span>
          <span>Skill</span>
          <span>Matches</span>
          <span>Status</span>
        </div>
        {filtered.map((finding) => (
          <button
            key={finding.id}
            className={`table-row ${selectedId === finding.id ? "active" : ""}`}
            type="button"
            onClick={() => onSelect(finding.id)}
            role="row"
          >
            <span>
              <strong>{finding.label}</strong>
              <small>{finding.group}</small>
            </span>
            <span>{finding.skill}</span>
            <span>{finding.matches.length}</span>
            <span>
              <StatusBadge status={finding.status} />
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function EvidenceView({ files }) {
  const byFolder = files.reduce((acc, file) => {
    const folder = file.path.split(/[\\/]/).slice(0, -1).join("/") || "root";
    acc[folder] = acc[folder] || [];
    acc[folder].push(file);
    return acc;
  }, {});

  return (
    <section className="evidence-list">
      <div className="section-heading">
        <div>
          <h2>Loaded evidence</h2>
          <p>The current scan is grouped by folder so weak areas are easy to spot.</p>
        </div>
      </div>
      <div className="folder-grid">
        {Object.entries(byFolder).map(([folder, folderFiles]) => (
          <article className="folder-panel" key={folder}>
            <div>
              <FolderOpen size={18} />
              <strong>{folder}</strong>
            </div>
            <ul>
              {folderFiles.slice(0, 5).map((file) => (
                <li key={file.path}>
                  <span>{file.name}</span>
                  <small>{formatBytes(file.size)}</small>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

function MetricsView({ analysis }) {
  return (
    <section className="metrics-section">
      <div className="section-heading">
        <div>
          <h2>Coverage metrics</h2>
          <p>Weighted scoring rewards evidence that proves practical skill, not just file count.</p>
        </div>
      </div>
      <div className="metric-bars">
        {analysis.findings.map((finding) => {
          const width = finding.status === "pass" ? 100 : finding.status === "warning" ? 50 : 0;
          return (
            <div className="metric-bar" key={finding.id}>
              <div>
                <strong>{finding.label}</strong>
                <span>{finding.weight} pts</span>
              </div>
              <div className="bar-track">
                <span className={finding.status} style={{ width: `${width}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ReportView({ report }) {
  return (
    <section className="report-section">
      <div className="section-heading">
        <div>
          <h2>Ali view</h2>
          <p>A concise assessor-facing summary of what the folder proves and what needs attention.</p>
        </div>
      </div>
      <div className="report-copy">
        <p>
          A.L.I. scanned <strong>{report.scannedFiles}</strong> files and produced an evidence score of{" "}
          <strong>{report.score}%</strong>.
        </p>
        {report.blockedFiles > 0 && (
          <p>
            <strong>{report.blockedFiles}</strong> sensitive file(s) were blocked before scoring and excluded from
            this export.
          </p>
        )}
        <h3>Priority actions</h3>
        <ul>
          {report.priorityActions.map((action) => (
            <li key={action}>{action}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function RightRail({ analysis, selectedFinding, onExport }) {
  return (
    <aside className="right-rail">
      <div className="rail-top">
        <ScoreRing score={analysis.score} />
        <div>
          <h2>Evidence score</h2>
          <p>
            {analysis.counts.pass} pass, {analysis.counts.warning} warning, {analysis.counts.missing} need review.
          </p>
        </div>
      </div>
      <button className="export-button" type="button" onClick={onExport}>
        <Download size={18} />
        Export report JSON
      </button>
      <div className="selected-finding">
        <div>
          <Gauge size={18} />
          <strong>{selectedFinding.label}</strong>
        </div>
        <StatusBadge status={selectedFinding.status} />
        <p>{selectedFinding.description}</p>
        <p className="finding-note">{selectedFinding.note}</p>
        <ul>
          {selectedFinding.matches.slice(0, 4).map((file) => (
            <li key={file.path}>{file.path}</li>
          ))}
        </ul>
      </div>
      <div className="skills-panel">
        <div>
          <Layers3 size={18} />
          <strong>Course skills covered</strong>
        </div>
        <span>Python</span>
        <span>Git</span>
        <span>NumPy</span>
        <span>Pandas</span>
        <span>Vectors</span>
        <span>Metrics</span>
        <span>Deep learning</span>
        <span>Image evidence</span>
      </div>
    </aside>
  );
}

export default function App() {
  const [activeView, setActiveView] = useState("marking");
  const [evidenceSetId, setEvidenceSetId] = useState(defaultCollegeEvidenceSet?.id || "");
  const [files, setFiles] = useState(defaultCollegeEvidenceSet?.files || []);
  const [blockedFiles, setBlockedFiles] = useState(
    Array.from({ length: defaultCollegeEvidenceSet?.blockedFiles || 0 }, () => ({
      reason: "Blocked during local audit",
      size: 0,
    })),
  );
  const [manualTags, setManualTags] = useState({});
  const [filter, setFilter] = useState("all");
  const [criteriaSourceId, setCriteriaSourceId] = useState(initialCriteriaSourceId);
  const [criteriaText, setCriteriaText] = useState(initialCriteriaText);
  const [evidenceText, setEvidenceText] = useState(initialEvidenceText);
  const selectedEvidenceSet = collegeEvidenceSets.find((set) => set.id === evidenceSetId) || null;
  const criteriaSource = assessmentSources.find((source) => source.id === criteriaSourceId) || null;
  const evidenceFiles = useMemo(
    () => files.map((file) => ({ ...file, manualCategory: manualTags[file.path] || "" })),
    [files, manualTags],
  );
  const analysis = useMemo(
    () => ({ ...evaluateFiles(evidenceFiles), blockedFiles }),
    [evidenceFiles, blockedFiles],
  );
  const [selectedId, setSelectedId] = useState("python");
  const selectedFinding = analysis.findings.find((finding) => finding.id === selectedId) || analysis.findings[0];
  const report = useMemo(() => buildReport(analysis), [analysis]);
  const marking = useMemo(
    () => evaluateMarkingMatrix(analysis, criteriaText, evidenceText),
    [analysis, criteriaText, evidenceText],
  );

  async function handleFiles(event) {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = "";
    if (!selectedFiles.length) return;

    const pathSafeFiles = [];
    const nextBlockedFiles = [];

    selectedFiles.forEach((file) => {
      const entry = {
        path: file.webkitRelativePath || file.name,
        name: file.name,
        size: file.size,
        type: file.type || "",
      };
      const reason = getSensitiveFileIssue(entry);
      if (reason) {
        nextBlockedFiles.push({ reason, size: entry.size });
      } else {
        pathSafeFiles.push(file);
      }
    });

    const enrichedFiles = await Promise.all(pathSafeFiles.map((file) => buildEvidenceEntry(file)));
    const safeFiles = [];

    enrichedFiles.forEach((file) => {
      const reason = getSensitiveFileIssue(file, true);
      if (reason) {
        nextBlockedFiles.push({ reason, size: file.size });
      } else {
        safeFiles.push(file);
      }
    });

    setFiles(safeFiles);
    setBlockedFiles(nextBlockedFiles);
    setManualTags({});
    setSelectedId("python");
    setFilter("all");
    setEvidenceSetId("");
  }

  function loadCollegeEvidenceSet() {
    const nextSet = collegeEvidenceSets.find((set) => set.id === evidenceSetId) || defaultCollegeEvidenceSet;
    if (!nextSet) return;

    setEvidenceSetId(nextSet.id);
    setFiles(nextSet.files || []);
    setBlockedFiles(
      Array.from({ length: nextSet.blockedFiles || 0 }, () => ({
        reason: "Blocked during local audit",
        size: 0,
      })),
    );
    setCriteriaSourceId(nextSet.criteriaSourceIds?.[0] || "");
    setCriteriaText(nextSet.criteriaText || "");
    setEvidenceText(nextSet.evidenceText || "");
    setManualTags({});
    setSelectedId("python");
    setFilter("all");
  }

  function removeFile(path) {
    setFiles((current) => current.filter((file) => file.path !== path));
    setManualTags((current) => {
      const next = { ...current };
      delete next[path];
      return next;
    });
  }

  function setManualTag(path, category) {
    setManualTags((current) => {
      const next = { ...current };
      if (category) {
        next[path] = category;
      } else {
        delete next[path];
      }
      return next;
    });
  }

  function loadCriteriaSource() {
    if (criteriaSource?.criteriaText) {
      setCriteriaText(criteriaSource.criteriaText);
    }
  }

  function loadDefaultCriteria() {
    setCriteriaSourceId(defaultAssessmentSource?.id || "");
    setCriteriaText(defaultAssessmentSource?.criteriaText || defaultCriteriaText);
  }

  function exportReport() {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ali-evidence-report-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-mark">
          <img src={`${import.meta.env.BASE_URL}og-logo.png`} alt="OG logo" />
          <div>
            <strong>OG A.L.I.</strong>
            <span>Marking Matrix</span>
          </div>
        </div>
        <nav>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={activeView === item.id ? "selected" : ""}
                type="button"
                onClick={() => setActiveView(item.id)}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="ali-note">
          <strong>For Ali</strong>
          <span>Evidence-first marking support for practical AI Programming work.</span>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <div className="topbar-product">
              <BrainCircuit size={24} />
              <span>OG branded assessor tool</span>
            </div>
            <h1>OG A.L.I. - Marking Matrix</h1>
            <p>Scan coursework evidence, map it to criteria, and produce transparent draft marks for human review.</p>
          </div>
          <div className="topbar-stats">
            <span>{analysis.files.length} files</span>
            <span>{analysis.findings.length} checks</span>
            <span>{marking.overallScore}% matrix</span>
            {blockedFiles.length > 0 && <span>{blockedFiles.length} blocked</span>}
          </div>
        </header>

        <div className="content-grid">
          <div className="primary-stack">
            {activeView === "marking" && (
              <MarkingView
                analysis={analysis}
                marking={marking}
                criteriaText={criteriaText}
                evidenceText={evidenceText}
                onCriteriaChange={setCriteriaText}
                onEvidenceChange={setEvidenceText}
                onLoadPreset={loadDefaultCriteria}
                criteriaSourceId={criteriaSourceId}
                criteriaSource={criteriaSource}
                onCriteriaSourceChange={setCriteriaSourceId}
                onLoadCriteriaSource={loadCriteriaSource}
                selectedEvidenceSet={selectedEvidenceSet}
              />
            )}
            {activeView === "scan" && (
              <>
                <UploadPanel
                  fileCount={files.length}
                  blockedFiles={blockedFiles}
                  onFiles={handleFiles}
                  onLoadCollegeSet={loadCollegeEvidenceSet}
                  evidenceSets={collegeEvidenceSets}
                  selectedEvidenceSetId={evidenceSetId || defaultCollegeEvidenceSet?.id || ""}
                  onEvidenceSetChange={setEvidenceSetId}
                />
                <FileReviewPanel
                  files={evidenceFiles}
                  analysis={analysis}
                  manualTags={manualTags}
                  onRemoveFile={removeFile}
                  onSetManualTag={setManualTag}
                />
                <EvidenceTable
                  findings={analysis.findings}
                  filter={filter}
                  onFilter={setFilter}
                  selectedId={selectedFinding.id}
                  onSelect={setSelectedId}
                />
              </>
            )}
            {activeView === "evidence" && <EvidenceView files={analysis.files} />}
            {activeView === "metrics" && <MetricsView analysis={analysis} />}
            {activeView === "report" && <ReportView report={report} />}
          </div>
          <RightRail analysis={analysis} selectedFinding={selectedFinding} onExport={exportReport} />
        </div>
      </main>
    </div>
  );
}
