"""A.L.I. command-line evidence scanner.

This script mirrors the browser demo with a local, dependency-free scanner. It
checks a coursework folder for practical evidence patterns without reading or
uploading private file contents.
"""

from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable


SKIP_DIRS = {"node_modules", ".venv", "venv", "__pycache__", "dist", ".next", ".git"}


@dataclass(frozen=True)
class Rule:
    id: str
    label: str
    group: str
    weight: int
    skill: str
    description: str
    patterns: tuple[re.Pattern[str], ...]
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
    ),
    Rule(
        "notebooks",
        "Jupyter notebooks",
        "Libraries",
        12,
        "Unit 3 notebook evidence",
        "Finds practical notebook evidence.",
        (re.compile(r"\.ipynb$", re.I),),
    ),
    Rule(
        "tabular-data",
        "Tabular data",
        "Data handling",
        10,
        "Pandas datasets and structured files",
        "Finds CSV, JSON, or spreadsheet files.",
        (re.compile(r"\.csv$", re.I), re.compile(r"\.json$", re.I), re.compile(r"\.xlsx?$", re.I)),
    ),
    Rule(
        "visual-evidence",
        "Screenshot or image evidence",
        "Evidence",
        10,
        "Real evidence collection",
        "Finds screenshot or image proof.",
        (re.compile(r"\.(png|jpe?g|webp)$", re.I), re.compile(r"screenshot", re.I), re.compile(r"evidence", re.I)),
    ),
    Rule(
        "git-evidence",
        "Git and version evidence",
        "Version control",
        10,
        "Unit 2 Git workflow",
        "Finds Git, commit, branch, README, or repository evidence.",
        (re.compile(r"git", re.I), re.compile(r"commit", re.I), re.compile(r"branch", re.I), re.compile(r"readme", re.I)),
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
            re.compile(r"validation", re.I),
            re.compile(r"confusion", re.I),
            re.compile(r"summary\.json$", re.I),
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
            re.compile(r"checkpoint", re.I),
            re.compile(r"model", re.I),
            re.compile(r"inference", re.I),
            re.compile(r"\.(pt|pth|pkl|h5|keras|weights)$", re.I),
        ),
    ),
    Rule(
        "documentation",
        "Documentation",
        "Submission quality",
        10,
        "Assessor-ready communication",
        "Finds supporting written documentation.",
        (re.compile(r"readme", re.I), re.compile(r"\.(md|txt|docx|pdf)$", re.I), re.compile(r"guide", re.I)),
        minimum=2,
    ),
]


def iter_files(root: Path) -> Iterable[Path]:
    for path in root.rglob("*"):
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        if path.is_file():
            yield path


def file_entry(root: Path, path: Path) -> dict[str, object]:
    return {
        "path": path.relative_to(root).as_posix(),
        "name": path.name,
        "size": path.stat().st_size,
    }


def evaluate_presence(rule: Rule, files: list[dict[str, object]]) -> dict[str, object]:
    matches = [
        file
        for file in files
        if any(pattern.search(str(file["path"])) for pattern in rule.patterns)
    ]
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
        "matches": [match["path"] for match in matches[:10]],
    }


def evaluate_quality(files: list[dict[str, object]]) -> list[dict[str, object]]:
    empty = [file for file in files if file["size"] == 0]
    secret_pattern = re.compile(r"(password|secret|api[_-]?key|token|private[_-]?key|credential)", re.I)
    secret_names = [file for file in files if secret_pattern.search(str(file["path"]))]
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
            "description": "Warns if filenames suggest passwords, tokens, API keys, or private keys.",
            "status": "warning" if secret_names else "pass",
            "note": "Potential secret-bearing filenames detected." if secret_names else "No obvious secret-bearing filenames detected.",
            "matches": [file["path"] for file in secret_names[:10]],
        },
    ]


def build_report(root: Path) -> dict[str, object]:
    files = [file_entry(root, path) for path in iter_files(root)]
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

    return {
        "product": "A.L.I. - Assessment Learning Inspector",
        "root": str(root),
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "score": round((earned_weight / total_weight) * 100),
        "scannedFiles": len(files),
        "summary": counts,
        "priorityActions": priority_actions or ["No immediate evidence gaps detected."],
        "findings": findings,
        "files": files,
    }


def write_markdown(report: dict[str, object], out_path: Path) -> None:
    lines = [
        "# A.L.I. Evidence Report",
        "",
        f"Root: `{report['root']}`",
        f"Generated: `{report['generatedAt']}`",
        f"Score: **{report['score']}%**",
        f"Files scanned: **{report['scannedFiles']}**",
        "",
        "## Priority Actions",
        "",
    ]
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
        print(f"A.L.I. scanned {report['scannedFiles']} files at {root}")
        print(f"Evidence score: {report['score']}%")
        for action in report["priorityActions"]:
            print(f"- {action}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
