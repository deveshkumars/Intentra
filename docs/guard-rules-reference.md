# Guard Rules Reference

Detailed reference for all 8 guard engine rules. Each rule includes trigger examples, safe targets, and culture override behavior.

The guard pipeline processes commands through: **NFKC normalization** → **shell-aware tokenization** → **ordered rule scan** → **culture verdict resolution**. Rules are evaluated in the order listed below; the first match wins.

---

## 1. `rm_recursive` — Recursive file deletion

| Field | Value |
|-------|-------|
| **Category** | filesystem |
| **Default verdict** | deny |
| **Base risk** | 88 |
| **CWE** | CWE-782 |

**Triggers (denied):**

```bash
rm -rf /                    # root wipe
rm -rf .                    # current directory
rm -rf ~/projects/myapp     # non-safe target
rm -rf src/                 # source directory
rm -rf --no-preserve-root / # explicit root
```

**Safe targets (allowed even with -rf):**

```bash
rm -rf node_modules         # known artifact directory
rm -rf dist                 # build output
rm -rf .next                # Next.js cache
rm -rf __pycache__          # Python cache
rm -rf .cache               # generic cache
rm -rf build                # build output
rm -rf .turbo               # Turbo cache
rm -rf coverage             # test coverage
```

The safe-target allowlist matches directory names at any path depth (e.g., `packages/web/node_modules` is safe).

**Does NOT trigger:**

```bash
rm file.txt                 # no -r flag
rm -f file.txt              # no -r flag
rm -rf node_modules         # safe target
```

---

## 2. `drop_table` — SQL DROP TABLE / DROP DATABASE

| Field | Value |
|-------|-------|
| **Category** | sql |
| **Default verdict** | deny |
| **Base risk** | 92 |
| **CWE** | CWE-89 |

**Triggers:**

```bash
psql -c "DROP TABLE users"
mysql -e "drop database production"
echo "DROP TABLE sessions" | psql
sqlite3 app.db "DROP TABLE cache"
```

**Does NOT trigger:**

```bash
psql -c "SELECT * FROM users"
echo "CREATE TABLE users"
# "drop" without "table" or "database"
```

---

## 3. `truncate` — SQL TRUNCATE

| Field | Value |
|-------|-------|
| **Category** | sql |
| **Default verdict** | deny |
| **Base risk** | 85 |
| **CWE** | CWE-89 |

**Triggers:**

```bash
psql -c "TRUNCATE users"
mysql -e "truncate table sessions"
```

**Does NOT trigger:**

```bash
psql -c "SELECT * FROM users"   # no truncate keyword
truncate -s 0 logfile.txt       # file truncate (matches on word, but
                                # this DOES trigger — intentional false positive
                                # for safety; use culture override to allow)
```

---

## 4. `git_force_push` — Git force-push

| Field | Value |
|-------|-------|
| **Category** | vcs |
| **Default verdict** | deny |
| **Base risk** | 82 |
| **CWE** | CWE-183 |

**Triggers:**

```bash
git push --force origin main
git push -f origin feature
git push --force-with-lease origin main   # --force-with-lease contains "-f"
```

**Does NOT trigger:**

```bash
git push origin main          # normal push
git push -u origin feature    # set upstream
git pull --force              # pull, not push
```

---

## 5. `git_reset_hard` — git reset --hard

| Field | Value |
|-------|-------|
| **Category** | vcs |
| **Default verdict** | deny |
| **Base risk** | 78 |

**Triggers:**

```bash
git reset --hard
git reset --hard HEAD~3
git reset --hard origin/main
```

**Does NOT trigger:**

```bash
git reset HEAD               # soft reset (default)
git reset --soft HEAD~1      # soft reset
git reset --mixed            # mixed reset
```

---

## 6. `git_discard` — Mass working tree discard

| Field | Value |
|-------|-------|
| **Category** | vcs |
| **Default verdict** | deny |
| **Base risk** | 72 |

**Triggers:**

```bash
git checkout .               # discard all working changes
git restore .                # same via restore
git checkout ./              # trailing slash variant
```

**Does NOT trigger:**

```bash
git checkout feature         # branch switch
git checkout -- file.txt     # single file restore
git restore file.txt         # single file restore
```

---

## 7. `kubectl_delete` — Kubernetes resource deletion

| Field | Value |
|-------|-------|
| **Category** | orchestration |
| **Default verdict** | deny |
| **Base risk** | 80 |

**Triggers:**

```bash
kubectl delete pod my-pod
kubectl delete deployment web
kubectl delete namespace staging
kubectl delete -f resources.yaml
```

**Does NOT trigger:**

```bash
kubectl get pods             # read-only
kubectl describe svc web     # read-only
kubectl apply -f deploy.yaml # create/update
```

---

## 8. `docker_destructive` — Docker forced removal or prune

| Field | Value |
|-------|-------|
| **Category** | container |
| **Default verdict** | deny |
| **Base risk** | 75 |

**Triggers:**

```bash
docker rm -f container_name
docker system prune
docker system prune -a
```

**Does NOT trigger:**

```bash
docker rm container_name     # no -f flag
docker stop container_name   # stop, not remove
docker ps                    # read-only
docker build .               # build
```

---

## Debug tracing

Add `"debug": true` to any guard request (or set `X-Intentra-Guard-Debug: 1` header) to get a full pipeline trace:

```bash
curl -s -X POST http://localhost:7891/intentra/guard \
  -H "Content-Type: application/json" \
  -d '{"command": "rm -rf node_modules", "debug": true}' | jq .trace
```

The trace shows each pipeline phase and whether each rule matched or was skipped.

## Culture overrides

Any rule can be overridden from `deny` to `warn` or `allow` via `culture.json`. See the [Culture Configuration Guide](culture-config.md) for details.

## See also

- **[Guard Engine](guard-engine.md)** — pipeline architecture and internals
- **[Culture Config](culture-config.md)** — customizing rule verdicts
- **[API Reference](api-reference.md)** — HTTP endpoints for guard evaluation
