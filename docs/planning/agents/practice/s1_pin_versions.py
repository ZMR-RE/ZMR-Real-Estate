#!/usr/bin/env python3
"""Pin each Practice-only migration to the exact file content Practice applied.

Usage: s1_pin_versions.py <main-repo> <clone> <applied.json> <version> [<version> ...]
applied.json: {"rows": [{"version": ..., "name": ..., "statements": [...]}, ...]}
  (the output of: select version, name, statements from supabase_migrations.schema_migrations)

For each version, every distinct historical content of supabase/migrations/<version>_*.sql in
<main-repo> (all refs) is compared with the applied statements after normalisation (comments,
whitespace and semicolons removed, so the CLI's statement splitting doesn't matter). Exactly one
distinct content must match, and its file name must match the applied name; it is then written
into <clone>. Anything else -> STOP (exit 5) without writing.
"""
import hashlib, json, os, re, subprocess, sys

def norm(sql: str) -> str:
    sql = re.sub(r"/\*.*?\*/", "", sql, flags=re.S)
    sql = re.sub(r"--[^\n]*", "", sql)
    return re.sub(r"[\s;]+", "", sql)

def git(repo, *args):
    return subprocess.run(["git", "-C", repo, *args], check=True, capture_output=True, text=True).stdout

repo, clone, applied_path, versions = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4:]
rows = {str(r["version"]): r for r in json.load(open(applied_path))["rows"]}
plan, problems = [], []
for v in versions:
    row = rows.get(v)
    if not row or not row.get("statements"):
        problems.append(f"{v}: Practice has no recorded statements to compare (cannot pin)"); continue
    target = norm("\n".join(row["statements"]))
    contents = {}
    for c in git(repo, "log", "--all", "--format=%H", "--", f"supabase/migrations/{v}_*").split():
        for p in git(repo, "ls-tree", "-r", "--name-only", c, "supabase/migrations/").split():
            if os.path.basename(p).startswith(f"{v}_"):
                body = git(repo, "show", f"{c}:{p}")
                h = hashlib.sha256(body.encode()).hexdigest()
                contents.setdefault(h, (p, body, c))
    matches = [(h, p, body, c) for h, (p, body, c) in contents.items() if norm(body) == target]
    names = {os.path.basename(p)[len(v) + 1:-4] for _, p, _, _ in matches}
    if len(matches) == 1 and (not row.get("name") or row["name"] in names):
        h, p, body, c = matches[0]
        plan.append((v, p, body, c, h, len(contents)))
    elif not matches:
        problems.append(f"{v}: none of {len(contents)} local version(s) matches what Practice applied")
    else:
        problems.append(f"{v}: {len(matches)} different local contents match — ambiguous ({', '.join(m[0][:12] for m in matches)})")
if problems:
    print("STOP — nothing mirrored:"); [print("  " + x) for x in problems]; sys.exit(5)
for v, p, body, c, h, n in plan:
    os.makedirs(os.path.join(clone, os.path.dirname(p)), exist_ok=True)
    open(os.path.join(clone, p), "w").write(body)
    print(f"mirrored {os.path.basename(p)} = content {h[:12]} from {c[:7]} (1 of {n} local versions matched Practice exactly)")
