# Deploying PhentiBuild — Vercel (frontend) + Coolify (Django + MariaDB)

```
users ─► Vercel (React, web/)  ──/api/*──►  Coolify: Django (server/) ──► MariaDB 11.4
```

You need:
- a Coolify server;
- a domain or sub-domain for the API, e.g. `api.phentibuild.com`, pointed at the Coolify server;
- a Vercel account linked to the GitHub repo.

---

## Part A — Backend on Coolify

### 1. Create the stack

1. Coolify → **New Resource** → your GitHub repo → **Docker Compose**.
2. **Base directory:** `/server`. **Compose file:** `docker-compose.coolify.yml`.
3. **Environment Variables** (mark the secret ones as *secret*):

| Variable | Example | Notes |
|---|---|---|
| `DJANGO_SECRET_KEY` | 50+ random characters | `python -c "import secrets; print(secrets.token_urlsafe(50))"` |
| `DJANGO_ALLOWED_HOSTS` | `api.phentibuild.com` | your API domain |
| `DJANGO_CSRF_TRUSTED_ORIGINS` | `https://phentibuild.vercel.app` | **every** Vercel URL users open (custom domain too), comma-separated |
| `DB_PASSWORD` | strong random | for the `phentibuild_app` database user |
| `DB_ROOT_PASSWORD` | strong random | MariaDB root (only used for imports/backups) |
| `TIME_ZONE` | `Africa/Accra` | |
| `ROOF_AI_API_URL` / `ROOF_AI_API_KEY` / `ROOF_AI_MODEL` | *(blank)* | optional AI roof generation |

4. Attach your API domain to the **`api`** service, port **8000**. Enable HTTPS (Let's Encrypt).
5. **Deploy.** On start the container:
   - creates any missing PhentiBuild tables (`ensure_legacy_schema`; never alters existing ones);
   - creates Django's own tables (`migrate`);
   - starts gunicorn.
6. Check it: open `https://api.phentibuild.com/api/ping/`. Expect `"database":"connected"`.

### 2. Load the database (your real data)

Make a **fresh backup** on your PC first (with XAMPP MySQL running):

```powershell
& "C:\xampp\mysql\bin\mysqldump.exe" -h 127.0.0.1 -P 3307 -u root --single-transaction --routines --triggers --databases phentibuild > "$HOME\Desktop\PhentiBuild-backups\phentibuild_for_prod.sql"
```

Copy that file to the server, then import it into the `db` container. Find
the container name in Coolify → the stack → `db` → Terminal / `docker ps`:

```bash
docker exec -i <db-container> sh -c 'mariadb -uroot -p"$MARIADB_ROOT_PASSWORD"' < phentibuild_for_prod.sql
```

Then **restart the `api` service** (it re-runs `migrate` for Django's tables)
and verify the counts:

```bash
docker exec -i <db-container> sh -c 'mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" phentibuild -e "SELECT COUNT(*) FROM users; SELECT COUNT(*) FROM materials;"'
```

Existing users log in with their **current passwords** (bcrypt hashes carry
over unchanged).

### 3. Your first Admin (server access only)

Nobody can become Admin through the website — not by signing up, not in
Settings, not even when another Admin asks. Admin is granted only from the
server. In Coolify open the **api** service → **Terminal**, then:

```bash
# make an EXISTING account Admin (its password is not changed)
python manage.py create_admin --email you@example.com

# or create a brand-new Admin account: you are asked for name, phone,
# and the password (typed hidden, twice)
python manage.py create_admin --email boss@example.com
```

The same command works on your own computer from the `server` folder
(`.venv\Scripts\python.exe manage.py create_admin --email ...`). Each
promotion is written to the History page. An Admin can later take Admin
access away from someone in the users list, but never from the last Admin.

> If you imported an old backup, the start-up step `ensure_legacy_schema`
> adds the new columns automatically (`users.profession`; `owner_id`
> on projects, BOQ items, measurements, calculations, roof designs and
> reports; `project_id` on BOQ items, measurements, calculations and roof designs). Restart the api service once after importing.

### Who owns the old records

Each person sees only their own records; Admins see everyone's. Records
made before ownership existed have no owner, so only Admins see them until
you give them to someone:

```bash
python manage.py assign_unowned --email harriet@example.com --dry-run   # shows counts, changes nothing
python manage.py assign_unowned --email harriet@example.com             # does it
```

It only touches records with no owner, so running it again is harmless.

### 4. Backups (do this before going live)

Coolify → the `db` service → **Backups** → schedule daily dumps (S3 or
local). Test one restore.

---

## Part B — Frontend on Vercel

1. Open `web/vercel.json` and replace `REPLACE-WITH-YOUR-API-DOMAIN` with your API domain (e.g. `api.phentibuild.com`). Commit and push.
2. Vercel → **Add New Project** → import the GitHub repo.
   - **Root Directory:** `web`
   - Framework: **Vite** (detected). Build `npm run build`, output `dist`.
   - **Environment Variables:** `VITE_BACKEND=django`. Leave `VITE_CLASSIC_APP_URL` **empty** (hides the links to the local PHP app).
3. **Deploy.** Open the Vercel URL: you should land on the login page.
4. Make sure that exact URL (and any custom domain) is in `DJANGO_CSRF_TRUSTED_ORIGINS` on Coolify, then redeploy the API.

### Why the `/api` rewrite matters

The browser calls `https://<vercel-app>/api/...`. Vercel forwards that to
Django, so the login cookie belongs to your Vercel domain (first-party,
HttpOnly, Secure). Browsers increasingly block third-party cookies, and this
setup avoids that problem and needs no CORS.

---

## Part C — Smoke test after every deploy

| Check | Expected |
|---|---|
| `https://<api>/api/ping/` | `"database":"connected"` |
| Vercel URL → log in with an existing account | dashboard shows your real counts |
| Register a new account | account shows its profession (e.g. "Contractor") and access "Member" — never Admin |
| Reports → Excel export | `.xlsx` downloads |
| Log out → refresh | back on login |

## Troubleshooting

| Symptom | Fix |
|---|---|
| 403 "security token is missing or has expired" on every save | Add the exact Vercel origin (with `https://`, no trailing slash) to `DJANGO_CSRF_TRUSTED_ORIGINS`. |
| 400 Bad Request from Django | The API domain is missing from `DJANGO_ALLOWED_HOSTS`. |
| Login works but you're logged out on refresh | The site isn't on HTTPS (Secure cookies need HTTPS), or `/api` isn't going through the Vercel rewrite. |
| `"A database error occurred."` | `db` not healthy, or `DB_PASSWORD` differs between `api` and `db`. |
