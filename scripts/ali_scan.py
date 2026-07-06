"""A.L.I. command-line evidence scanner.

This mirrors the browser app with a local scanner that checks coursework
evidence against the same practical evidence categories. Sensitive files are
blocked before scoring or export, and readable safe files are searched locally
so renamed evidence can still be found.
"""

from __future__ import annotations

import argparse
import html
import json
import re
import zipfile
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable


SKIP_DIRS = {"node_modules", ".venv", "venv", "__pycache__", "dist", ".next", ".git"}
TEXT_SCAN_LIMIT = 250_000
TEXT_EXTENSIONS = {
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
}
OFFICE_EXTENSIONS = {".docx", ".pptx", ".xlsx"}


@dataclass(frozen=True)
class Rule:
    id: str
    label: str
    group: str
    weight: int
    skill: str
    description: str
    patterns: tuple[re.Pattern[str], ...]
    content_patterns: tuple[re.Pattern[str], ...] = ()
    minimum: int = 1


PRESENCE_RULES = [
    Rule(
        "python",
        "Python scripts",
        "Core programming",
        12,
        "Unit 1 Python fundamentals",
        "Finds Python source files.",
        (re.compile(r"\.py$", re.I),),
        (
            re.compile(r"\bdef\s+\w+\s*\(", re.I),
            re.compile(r"\bclass\s+\w+", re.I),
            re.compile(r"\bimport\s+\w+", re.I),
            re.compile(r"\bfor\s+\w+\s+in\b", re.I),
        ),
    ),
    Rule(
        "notebooks",
        "Jupyter notebooks",
        "Libraries",
        12,
        "Unit 3 notebook evidence",
        "Finds practical notebook evidence.",
        (re.compile(r"\.ipynb$", re.I),),
        (
            re.compile(r'"cells"\s*:', re.I),
            re.compile(r'"cell_type"\s*:\s*"code"', re.I),
            re.compile(r"\bjupyter\b", re.I),
            re.compile(r"\bnotebook\b", re.I),
        ),
    ),
    Rule(
        "tabular-data",
        "Tabular data",
        "Data handling",
        10,
        "Pandas datasets and structured files",
        "Finds CSV, JSON, spreadsheet, TSV, or Parquet files.",
        (
            re.compile(r"\.csv$", re.I),
            re.compile(r"\.json$", re.I),
            re.compile(r"\.xlsx?$", re.I),
            re.compile(r"\.parquet$", re.I),
            re.compile(r"\.tsv$", re.I),
        ),
        (
            re.compile(r"\bdataframe\b", re.I),
            re.compile(r"\bfeatures?\b", re.I),
            re.compile(r"\bcolumns?\b", re.I),
            re.compile(r"\bdataset\b", re.I),
        ),
    ),
    Rule(
        "visual-evidence",
        "Screenshot or image evidence",
        "Evidence",
        10,
        "Real evidence collection",
        "Finds screenshot or image proof.",
        (
            re.compile(r"\.(png|jpe?g|webp|gif|bmp)$", re.I),
            re.compile(r"screen[\s_-]?shot", re.I),
            re.compile(r"evidence", re.I),
            re.compile(r"proof", re.I),
            re.compile(r"capture", re.I),
        ),
        (
            re.compile(r"\bscreenshot\b", re.I),
            re.compile(r"\bproof\b", re.I),
            re.compile(r"\bevidence\b", re.I),
        ),
    ),
    Rule(
        "git-evidence",
        "Git and version evidence",
        "Version control",
        10,
        "Unit 2 Git workflow",
        "Finds Git, commit, branch, README, or repository evidence.",
        (
            re.compile(r"\.git([/\\]|$)", re.I),
            re.compile(r"git", re.I),
            re.compile(r"commit", re.I),
            re.compile(r"branch", re.I),
            re.compile(r"readme", re.I),
            re.compile(r"github", re.I),
            re.compile(r"repository", re.I),
        ),
        (
            re.compile(r"\bgit\s+(commit|push|status|log)\b", re.I),
            re.compile(r"\bcommit\s+[a-f0-9]{7,40}\b", re.I),
            re.compile(r"\bbranch\b", re.I),
        ),
    ),
    Rule(
        "metrics",
        "Validation metrics",
        "Model validation",
        14,
        "Unit 4 validation and metrics",
        "Finds loss, accuracy, validation, confusion matrix, or metrics outputs.",
        (
            re.compile(r"metric", re.I),
            re.compile(r"accuracy", re.I),
            re.compile(r"loss", re.I),
            re.compile(r"validat", re.I),
            re.compile(r"eval", re.I),
            re.compile(r"confusion", re.I),
            re.compile(r"classification[\s_-]?report", re.I),
            re.compile(r"precision", re.I),
            re.compile(r"recall", re.I),
            re.compile(r"\bf1\b", re.I),
            re.compile(r"scores?", re.I),
            re.compile(r"summary\.json$", re.I),
        ),
        (
            re.compile(r"\baccuracy\b", re.I),
            re.compile(r"\bvalidation\b", re.I),
            re.compile(r"\bprecision\b", re.I),
            re.compile(r"\brecall\b", re.I),
            re.compile(r"\bf1\b", re.I),
            re.compile(r"\bconfusion\s+matrix\b", re.I),
            re.compile(r"\bloss\b", re.I),
        ),
    ),
    Rule(
        "model-output",
        "Model outputs and checkpoints",
        "Deep learning",
        12,
        "Unit 4 training and pretrained networks",
        "Finds trained model outputs and checkpoint evidence.",
        (
            re.compile(r"check[\s_-]*outputs?(?:[\s_-]*v?\d+)?", re.I),
            re.compile(r"checkpoint", re.I),
            re.compile(r"model", re.I),
            re.compile(r"inference", re.I),
            re.compile(r"predictions?", re.I),
            re.compile(r"outputs?", re.I),
            re.compile(r"results?", re.I),
            re.compile(r"runs?[/\\]", re.I),
            re.compile(r"saved[\s_-]?model", re.I),
            re.compile(r"best[\s_-]?model", re.I),
            re.compile(r"training[\s_-]?(output|run|result|log)", re.I),
            re.compile(r"\.(pt|pth|pkl|h5|keras|weights|onnx|safetensors|joblib|pb|tflite)$", re.I),
        ),
        (
            re.compile(r"\bcheckpoint\b", re.I),
            re.compile(r"\binference\b", re.I),
            re.compile(r"\bpredictions?\b", re.I),
            re.compile(r"\bsaved_model\b", re.I),
            re.compile(r"\bstate_dict\b", re.I),
            re.compile(r"\bmodel[_\s-]?version\b", re.I),
            re.compile(r"\btrained\s+model\b", re.I),
        ),
    ),
    Rule(
        "documentation",
        "Documentation",
        "Submission quality",
        10,
        "Assessor-ready communication",
        "Finds supporting written documentation.",
        (
            re.compile(r"readme", re.I),
            re.compile(r"\.(md|txt|docx|pdf)$", re.I),
            re.compile(r"how.to", re.I),
            re.compile(r"guide", re.I),
            re.compile(r"write[\s_-]?up", re.I),
            re.compile(r"assessment", re.I),
        ),
        (
            re.compile(r"\bassessment\b", re.I),
            re.compile(r"\bevidence\b", re.I),
            re.compile(r"\bcriteria\b", re.I),
            re.compile(r"\bexplain", re.I),
            re.compile(r"^#", re.I | re.M),
        ),
        minimum=2,
    ),
]


SENSITIVE_NAME_RULES = [
    (
        "Environment variable file",
        (re.compile(r"(^|[/\\])\.env(?:[.\w-]*)?$", re.I),),
    ),
    (
        "Private key or certificate",
        (
            re.compile(r"(^|[/\\])id_(rsa|dsa|ecdsa|ed25519)$", re.I),
            re.compile(r"\.(pem|p12|pfx|key)$", re.I),
            re.compile(r"private[_\s-]?key", re.I),
        ),
    ),
    (
        "Credential, password, token, or API key",
        (
            re.compile(r"password", re.I),
            re.compile(r"secret", re.I),
            re.compile(r"api[_\s-]?key", re.I),
            re.compile(r"token", re.I),
            re.compile(r"credential", re.I),
            re.compile(r"client[_\s-]?secret", re.I),
            re.compile(r"service[_\s-]?account", re.I),
        ),
    ),
    (
        "Cloud or auth credential file",
        (
            re.compile(r"(google|firebase|aws|azure|gcp).*(credential|secret|key|token)", re.I),
            re.compile(r"credentials?\.json$", re.I),
        ),
    ),
]

SENSITIVE_CONTENT_PATTERNS = (
    re.compile(r"\b(api[_-]?key|secret|token|password|private[_-]?key)\b\s*[:=]\s*[\"']?[A-Za-z0-9_\-./+=]{12,}", re.I),
    re.compile(r"-----BEGIN (RSA |DSA |EC |OPENSSH )?PRIVATE KEY-----", re.I),
    re.compile(r"\bAKIA[0-9A-Z]{16}\b"),
)


def iter_files(root: Path) -> Iterable[Path]:
    for path in root.rglob("*"):
        if any(part.lower() in SKIP_DIRS for part in path.parts):
            continue
        if path.is_file():
            yield path


def strip_xml(text: str) -> str:
    no_tags = re.sub(r"<[^>]+>", " ", text)
    return re.sub(r"\s+", " ", html.unescape(no_tags)).strip()


def read_plain_text(path: Path) -> tuple[str, bool]:
    data = path.read_bytes()[: TEXT_SCAN_LIMIT + 1]
    truncated = len(data) > TEXT_SCAN_LIMIT
    data = data[:TEXT_SCAN_LIMIT]
    try:
        return data.decode("utf-8"), truncated
    except UnicodeDecodeError:
        return data.decode("latin-1", errors="replace"), truncated


def read_office_text(path: Path) -> tuple[str, bool]:
    suffix = path.suffix.lower()
    prefixes = {
        ".docx": ("word/document.xml", "word/header", "word/footer"),
        ".pptx": ("ppt/slides/", "ppt/notesSlides/"),
        ".xlsx": ("xl/sharedStrings.xml", "xl/worksheets/"),
    }.get(suffix, ())

    chunks: list[str] = []
    truncated = False
    with zipfile.ZipFile(path) as archive:
        for name in archive.namelist():
            if not name.endswith(".xml") or not any(name.startswith(prefix) for prefix in prefixes):
                continue
            remaining = TEXT_SCAN_LIMIT - sum(len(chunk) for chunk in chunks)
            if remaining <= 0:
                truncated = True
                break
            with archive.open(name) as handle:
                data = handle.read(remaining + 1)
            if len(data) > remaining:
                truncated = True
                data = data[:remaining]
            chunks.append(strip_xml(data.decode("utf-8", errors="replace")))
    return "\n".join(chunks), truncated


def read_pdf_text(path: Path) -> tuple[str, bool]:
    try:
        from pypdf import PdfReader  # type: ignore
    except ImportError:
        return "", False

    chunks: list[str] = []
    truncated = False
    reader = PdfReader(str(path))
    for page in reader.pages[:20]:
        remaining = TEXT_SCAN_LIMIT - sum(len(chunk) for chunk in chunks)
        if remaining <= 0:
            truncated = True
            break
        text = page.extract_text() or ""
        if len(text) > remaining:
            truncated = True
            text = text[:remaining]
        chunks.append(text)
    return "\n".join(chunks), truncated


def read_search_text(path: Path) -> tuple[str, bool, bool]:
    suffix = path.suffix.lower()
    try:
        if suffix in TEXT_EXTENSIONS:
            text, truncated = read_plain_text(path)
        elif suffix in OFFICE_EXTENSIONS:
            text, truncated = read_office_text(path)
        elif suffix == ".pdf":
            text, truncated = read_pdf_text(path)
        else:
            return "", False, False
    except (OSError, UnicodeError, zipfile.BadZipFile):
        return "", False, False

    return text, bool(text), truncated


def sensitive_name_issue(relative_path: str) -> str:
    for reason, patterns in SENSITIVE_NAME_RULES:
        if any(pattern.search(relative_path) for pattern in patterns):
            return reason
    return ""


def sensitive_content_issue(text: str) -> str:
    if text and any(pattern.search(text) for pattern in SENSITIVE_CONTENT_PATTERNS):
        return "Secret-looking value inside readable file"
    return ""


def file_entry(root: Path, path: Path) -> tuple[dict[str, object] | None, dict[str, object] | None]:
    relative_path = path.relative_to(root).as_posix()
    size = path.stat().st_size

    name_reason = sensitive_name_issue(relative_path)
    if name_reason:
        return None, {"reason": name_reason, "size": size}

    search_text, content_scanned, content_truncated = read_search_text(path)
    content_reason = sensitive_content_issue(search_text)
    if content_reason:
        return None, {"reason": content_reason, "size": size}

    return (
        {
            "path": relative_path,
            "name": path.name,
            "size": size,
            "searchText": search_text,
            "contentScanned": content_scanned,
            "contentTruncated": content_truncated,
        },
        None,
    )


def file_search_corpus(file: dict[str, object], include_content: bool = True) -> str:
    parts = [str(file.get("path", "")), str(file.get("name", ""))]
    if include_content:
        parts.append(str(file.get("searchText", "")))
    return "\n".join(part for part in parts if part)


def evaluate_presence(rule: Rule, files: list[dict[str, object]]) -> dict[str, object]:
    matches = []
    for file in files:
        path_corpus = file_search_corpus(file, include_content=False)
        if any(pattern.search(path_corpus) for pattern in rule.patterns):
            matches.append(file)
            continue
        if file.get("contentScanned") and any(pattern.search(str(file.get("searchText", ""))) for pattern in rule.content_patterns):
            matches.append(file)

    if not matches:
        status = "missing"
        note = "No matching evidence found."
    elif len(matches) < rule.minimum:
        status = "warning"
        note = f"{len(matches)} found, but {rule.minimum} expected for stronger evidence."
    else:
        status = "pass"
        note = f"{len(matches)} matching item(s) found."

    return {
        "id": rule.id,
        "label": rule.label,
        "group": rule.group,
        "weight": rule.weight,
        "skill": rule.skill,
        "description": rule.description,
        "status": status,
        "note": note,
        "matches": [str(match["path"]) for match in matches[:10]],
    }


def evaluate_quality(files: list[dict[str, object]]) -> list[dict[str, object]]:
    empty = [file for file in files if file["size"] == 0]
    secret_names = [file for file in files if sensitive_name_issue(str(file["path"]))]
    return [
        {
            "id": "empty-files",
            "label": "Empty file check",
            "group": "Quality",
            "weight": 5,
            "skill": "File validation and debugging",
            "description": "Warns if files are present but have zero bytes.",
            "status": "warning" if empty else "pass",
            "note": f"{len(empty)} empty file(s) need checking." if empty else "No empty files detected.",
            "matches": [file["path"] for file in empty[:10]],
        },
        {
            "id": "secret-names",
            "label": "Secret filename check",
            "group": "Safety",
            "weight": 5,
            "skill": "Responsible project hygiene",
            "description": "Confirms secret-looking files were excluded before scoring.",
            "status": "warning" if secret_names else "pass",
            "note": "Potential secret-bearing filenames detected." if secret_names else "No secret-bearing accepted files detected.",
            "matches": [file["path"] for file in secret_names[:10]],
        },
    ]


def summarize_blocked_files(blocked_files: list[dict[str, object]]) -> dict[str, int]:
    summary: dict[str, int] = {}
    for file in blocked_files:
        reason = str(file.get("reason", "Sensitive file"))
        summary[reason] = summary.get(reason, 0) + 1
    return summary


def public_file(file: dict[str, object]) -> dict[str, object]:
    return {
        "path": file["path"],
        "name": file["name"],
        "size": file["size"],
        "contentScanned": file["contentScanned"],
        "contentTruncated": file["contentTruncated"],
    }


def build_report(root: Path) -> dict[str, object]:
    files: list[dict[str, object]] = []
    blocked_files: list[dict[str, object]] = []
    for path in iter_files(root):
        accepted, blocked = file_entry(root, path)
        if accepted:
            files.append(accepted)
        if blocked:
            blocked_files.append(blocked)

    findings = [evaluate_presence(rule, files) for rule in PRESENCE_RULES]
    findings.extend(evaluate_quality(files))

    total_weight = sum(int(finding["weight"]) for finding in findings)
    earned_weight = 0.0
    counts = {"pass": 0, "warning": 0, "missing": 0}
    for finding in findings:
        status = str(finding["status"])
        counts[status] += 1
        if status == "pass":
            earned_weight += int(finding["weight"])
        elif status == "warning":
            earned_weight += int(finding["weight"]) * 0.5

    priority_actions = [
        f"{finding['label']}: {finding['note']}"
        for finding in findings
        if finding["status"] != "pass"
    ]
    if blocked_files:
        priority_actions.insert(0, f"Safety: {len(blocked_files)} sensitive file(s) were blocked before scoring or export.")

    return {
        "product": "OG A.L.I. - Marking Matrix",
        "root": str(root),
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "score": round((earned_weight / total_weight) * 100),
        "scannedFiles": len(files),
        "blockedFiles": len(blocked_files),
        "blockedSummary": summarize_blocked_files(blocked_files),
        "summary": counts,
        "priorityActions": priority_actions or ["No immediate evidence gaps detected."],
        "findings": findings,
        "files": [public_file(file) for file in files],
    }


def write_markdown(report: dict[str, object], out_path: Path) -> None:
    lines = [
        "# A.L.I. Evidence Report",
        "",
        f"Root: `{report['root']}`",
        f"Generated: `{report['generatedAt']}`",
        f"Score: **{report['score']}%**",
        f"Files scanned: **{report['scannedFiles']}**",
        f"Sensitive files blocked: **{report['blockedFiles']}**",
        "",
    ]
    blocked_summary = report.get("blockedSummary", {})
    if blocked_summary:
        lines.extend(["## Safety Blocks", ""])
        for reason, count in blocked_summary.items():
            lines.append(f"- {reason}: {count}")
        lines.append("")

    lines.extend(["## Priority Actions", ""])
    for action in report["priorityActions"]:
        lines.append(f"- {action}")
    lines.extend(["", "## Findings", ""])
    for finding in report["findings"]:
        lines.append(f"- **{finding['label']}** - {finding['status']}: {finding['note']}")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Scan coursework evidence with A.L.I.")
    parser.add_argument("root", nargs="?", default="sample-coursework", help="Coursework folder to scan")
    parser.add_argument("--json", action="store_true", help="Print JSON report to stdout")
    parser.add_argument("--report", type=Path, help="Write a Markdown report to this path")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    root = Path(args.root).resolve()
    if not root.exists() or not root.is_dir():
        raise SystemExit(f"Folder not found: {root}")

    report = build_report(root)
    if args.report:
        write_markdown(report, args.report)
    if args.json:
        print(json.dumps(report, indent=2))
    else:
        print(f"A.L.I. scanned {report['scannedFiles']} safe files at {root}")
        print(f"Blocked sensitive files: {report['blockedFiles']}")
        print(f"Evidence score: {report['score']}%")
        for action in report["priorityActions"]:
            print(f"- {action}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
