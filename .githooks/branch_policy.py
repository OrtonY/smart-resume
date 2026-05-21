#!/usr/bin/env python
"""Enforce the local branching policy for this repository."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

PROTECTED_BRANCHES = {"master", "develop"}
ZERO_SHA = "0" * 40


def run_git(*args: str) -> str:
    result = subprocess.run(
        ["git", *args],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or "git command failed")
    return result.stdout.strip()


def current_branch() -> str:
    return run_git("branch", "--show-current")


def merge_head_path() -> Path:
    path = Path(run_git("rev-parse", "--git-path", "MERGE_HEAD"))
    return path if path.is_absolute() else Path.cwd() / path


def merge_in_progress() -> bool:
    return merge_head_path().exists()


def read_merge_head() -> str | None:
    path = merge_head_path()
    if not path.exists():
        return None
    content = path.read_text(encoding="utf-8").strip()
    return content or None


def normalize_branch_name(ref_name: str) -> str:
    if ref_name.startswith("origin/"):
        return ref_name.split("/", 1)[1]
    return ref_name


def exact_ref_candidates(commit_sha: str, branch: str) -> list[str]:
    output = run_git(
        "for-each-ref",
        "--format=%(refname:short) %(objectname)",
        "refs/heads",
        "refs/remotes",
    )
    local_matches: list[str] = []
    remote_matches: list[str] = []

    for line in output.splitlines():
        parts = line.strip().split()
        if len(parts) != 2:
            continue
        ref_name, object_name = parts
        if object_name != commit_sha:
            continue
        if ref_name == branch or ref_name == f"origin/{branch}" or ref_name.endswith("/HEAD"):
            continue
        if ref_name.startswith("origin/"):
            remote_matches.append(ref_name)
        else:
            local_matches.append(ref_name)

    return local_matches + remote_matches


def infer_merge_source(branch: str) -> str | None:
    merge_sha = read_merge_head()
    if not merge_sha:
        return None

    candidates = exact_ref_candidates(merge_sha, branch)
    if candidates:
        return candidates[0]

    try:
        ref_name = run_git("name-rev", "--name-only", "--no-undefined", merge_sha)
    except RuntimeError:
        return None

    ref_name = ref_name.replace("remotes/", "").replace("^0", "").strip()
    if not ref_name or ref_name == branch:
        return None
    return ref_name


def fail(message: str) -> int:
    print(f"[branch-policy] {message}", file=sys.stderr)
    return 1


def check_pre_commit() -> int:
    branch = current_branch()
    if branch not in PROTECTED_BRANCHES:
        return 0
    if merge_in_progress():
        return 0
    return fail(
        f"Direct commits on '{branch}' are forbidden. "
        "Create a feature branch from 'develop', finish the work there, "
        "then merge it back."
    )


def check_pre_merge_commit() -> int:
    branch = current_branch()
    if branch not in PROTECTED_BRANCHES:
        return 0

    source_ref = infer_merge_source(branch)
    if not source_ref:
        return fail(
            f"Unable to determine the source branch being merged into '{branch}'. "
            "Keep the source branch locally available and retry the merge."
        )

    source_branch = normalize_branch_name(source_ref)

    if branch == "master" and source_branch != "develop":
        return fail(
            "Only 'develop' may be merged into 'master' for a release."
        )

    if branch == "develop" and source_branch in PROTECTED_BRANCHES:
        return fail(
            "Only feature/fix/chore branches may be merged into 'develop'. "
            "Do not merge 'master' into 'develop', and do not merge 'develop' into itself."
        )

    return 0


def check_pre_push() -> int:
    for line in sys.stdin.read().splitlines():
        parts = line.strip().split()
        if len(parts) != 4:
            continue

        local_ref, local_sha, remote_ref, _remote_sha = parts
        remote_branch = remote_ref.removeprefix("refs/heads/")

        if remote_branch == "develop" and (local_sha == ZERO_SHA or local_ref == "(delete)"):
            return fail("Deleting remote 'develop' is forbidden.")

        if remote_branch == "master":
            try:
                develop_sha = run_git("rev-parse", "develop")
            except RuntimeError:
                return fail(
                    "Local 'develop' branch is required before pushing to 'master'."
                )

            if local_sha == develop_sha:
                continue

            parents = run_git("show", "--format=%P", "--no-patch", local_sha).split()
            if develop_sha not in parents:
                return fail(
                    "Updates pushed to 'master' must come directly from 'develop' "
                    "(fast-forward to develop or merge develop into master)."
                )

    return 0


def main() -> int:
    if len(sys.argv) < 2:
        return fail("Missing hook mode.")

    mode = sys.argv[1]
    if mode == "pre-commit":
        return check_pre_commit()
    if mode == "pre-merge-commit":
        return check_pre_merge_commit()
    if mode == "pre-push":
        return check_pre_push()
    return fail(f"Unsupported hook mode: {mode}")


if __name__ == "__main__":
    sys.exit(main())
