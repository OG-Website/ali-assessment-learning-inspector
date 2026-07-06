import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileSearch,
  FolderOpen,
  Gauge,
  GraduationCap,
  Layers3,
  Search,
  ShieldCheck,
  UploadCloud,
  XCircle,
} from "lucide-react";
import { buildReport, collegeSampleFiles, evaluateFiles } from "./evidenceRules.js";

const navItems = [
  { id: "scan", label: "Scan", icon: FileSearch },
  { id: "evidence", label: "Evidence", icon: ClipboardCheck },
  { id: "metrics", label: "Metrics", icon: BarChart3 },
  { id: "report", label: "Report", icon: ShieldCheck },
];

const statusConfig = {
  pass: { label: "Pass", icon: CheckCircle2 },
  warning: { label: "Warning", icon: AlertTriangle },
  missing: { label: "Missing", icon: XCircle },
};

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

function UploadPanel({ onFiles, onSample, fileCount }) {
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
        <button className="secondary-button" type="button" onClick={onSample}>
          <GraduationCap size={18} />
          Load college sample
        </button>
      </div>
      <p className="folder-note">{fileCount} file(s) loaded for the current scan.</p>
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
              {item}
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
            {analysis.counts.pass} pass, {analysis.counts.warning} warning, {analysis.counts.missing} missing.
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
  const [activeView, setActiveView] = useState("scan");
  const [files, setFiles] = useState(collegeSampleFiles);
  const [filter, setFilter] = useState("all");
  const analysis = useMemo(() => evaluateFiles(files), [files]);
  const [selectedId, setSelectedId] = useState("python");
  const selectedFinding = analysis.findings.find((finding) => finding.id === selectedId) || analysis.findings[0];
  const report = useMemo(() => buildReport(analysis), [analysis]);

  function handleFiles(event) {
    const nextFiles = Array.from(event.target.files || []).map((file) => ({
      path: file.webkitRelativePath || file.name,
      name: file.name,
      size: file.size,
    }));
    if (nextFiles.length) {
      setFiles(nextFiles);
      setSelectedId("python");
    }
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
          <Search size={24} />
          <div>
            <strong>A.L.I.</strong>
            <span>Assessment Learning Inspector</span>
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
          <span>Evidence-first checking for practical AI Programming work.</span>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <h1>A.L.I. - Assessment Learning Inspector</h1>
            <p>Scan coursework evidence, prove coverage, and surface the weak spots before submission.</p>
          </div>
          <div className="topbar-stats">
            <span>{analysis.files.length} files</span>
            <span>{analysis.findings.length} checks</span>
            <span>{analysis.score}% ready</span>
          </div>
        </header>

        <div className="content-grid">
          <div className="primary-stack">
            {activeView === "scan" && (
              <>
                <UploadPanel
                  fileCount={files.length}
                  onFiles={handleFiles}
                  onSample={() => setFiles(collegeSampleFiles)}
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
