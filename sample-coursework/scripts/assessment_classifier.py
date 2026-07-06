"""Small sample script for A.L.I. evidence scanning.

The code is intentionally compact: it demonstrates functions, structured data,
NumPy-style vector thinking, and a repeatable metric calculation.
"""

from math import sqrt


def cosine_similarity(left, right):
    dot = sum(a * b for a, b in zip(left, right))
    left_mag = sqrt(sum(a * a for a in left))
    right_mag = sqrt(sum(b * b for b in right))
    if left_mag == 0 or right_mag == 0:
        return 0.0
    return dot / (left_mag * right_mag)


def classify_submission(features):
    weights = {
        "python": 0.18,
        "notebook": 0.16,
        "data": 0.12,
        "screenshots": 0.12,
        "git": 0.12,
        "metrics": 0.16,
        "documentation": 0.14,
    }
    score = sum(features.get(name, 0) * weight for name, weight in weights.items())
    if score >= 0.85:
        return "ready", score
    if score >= 0.65:
        return "needs review", score
    return "missing evidence", score


if __name__ == "__main__":
    example = {
        "python": 1,
        "notebook": 1,
        "data": 1,
        "screenshots": 1,
        "git": 1,
        "metrics": 1,
        "documentation": 1,
    }
    label, readiness = classify_submission(example)
    print(f"Submission status: {label} ({readiness:.0%})")
    print(f"Vector check: {cosine_similarity([1, 0, 1], [1, 1, 1]):.2f}")
