# PhentiBuild — How the codebase fits together

PhentiBuild currently contains **two generations side by side**. The old
one keeps working while the new one is built and tested. Nothing old has
been deleted.

```
PhentiBuild/
├─ frontend/   OLD  PHP-rendered pages + vanilla JS (window.PhB)        ← still works
├─ backend/    OLD  PHP JSON API (20 endpoints) + PhpSpreadsheet         ← still works
├─ web/        NEW  React + TypeScript + Vite frontend  → hosted on Vercel
├─ server/     NEW  Python + Django + DRF backend       → hosted on Coolify
├─ database/   OLD  original SQL migration
├─ docs/            this guide + DEPLOYMENT.md
└─ vendor/          PHP Composer packages (git-ignored)
```

## 1. How a request flows

**New stack (production):**

```
Browser ──► https://<your-app>.vercel.app            (React app, static files)
   │
   └─ fetch('/api/projects/') ──► Vercel rewrite ──► https://<api-domain>/api/projects/
                                                      Django (gunicorn) on Coolify
                                                         │
                                                         ▼
                                                      MariaDB 11.4 (Coolify volume)
```

The browser only ever talks to the Vercel domain. Vercel forwards `/api/*`
to Django (`web/vercel.json`), so the login cookie is **first-party** and no
CORS setup is needed.

**Development:** `http://localhost:5173` (Vite) forwards `/api` to Django on
`127.0.0.1:8000` (`web/vite.config.ts`). Django uses a **copy** of your data
in a portable MariaDB 11.4 on port 3308. XAMPP's database (port 3307) is the
untouched original, still used by the old PHP app.

## 2. The databases

| Database | Where | Used by | Notes |
|---|---|---|---|
| `phentibuild` on XAMPP MariaDB **10.4**, port 3307 | your PC | old PHP app | The original. Never modified by the migration. |
| `phentibuild` on portable MariaDB **11.4**, port 3308 | `C:\Users\<you>\PhentiBuild-mariadb` | Django (dev) | A copy restored from a backup. Start it with `start-mariadb.bat`. |
| `phentibuild` on MariaDB 11.4 container | Coolify | Django (prod) | Loaded from a backup. See DEPLOYMENT.md. |

Why a copy: every supported Django version needs MariaDB 10.5 or newer, and
XAMPP ships 10.4.

**11 PhentiBuild tables** (unchanged): `users`, `projects`, `materials`,
`boq_items`, `calculations`, `measurements`, `roof_designs`, `history`,
`reports`, `company_profile`, `contact_messages`. Django adds only its own
bookkeeping tables: `django_session`, `django_migrations`,
`django_content_type`, `auth_permission`, `auth_group`,
`auth_group_permissions`.

All Django models of the PhentiBuild tables are **`managed = False`**:
Django reads and writes rows but can never create, alter or drop those
tables. The exact table structure is kept in `server/db/legacy_schema.sql`.
That file is used to build the test database and to bootstrap an empty server
(`manage.py ensure_legacy_schema`).

## 3. The Django backend (`server/`)

```
server/
├─ manage.py                 run commands: runserver, test, migrate…
├─ requirements.txt          exact package versions
├─ .env / .env.example       settings & secrets (.env is git-ignored)
├─ Dockerfile                production image (gunicorn) for Coolify
├─ docker-compose.coolify.yml  api + MariaDB stack for Coolify
├─ config/
│  ├─ settings.py            all settings, read from environment variables
│  ├─ urls.py                every API route (with the PHP → Django map)
│  └─ test_runner.py         builds the test DB from the real schema
├─ db/legacy_schema.sql      structure of the 11 tables (no data)
├─ apps/
│  ├─ core/        Validator (port of Validator.php), JSON envelope,
│  │               error handler, PHP-compatible rounding, ping, middleware
│  ├─ accounts/    User model on `users`, bcrypt ($2y$) passwords,
│  │               login/register/logout/me/profile/password, roles (RBAC)
│  ├─ history/     audit log: record() used by every app; list/detail API
│  ├─ projects/    projects (PHB-0001 refs)
│  ├─ materials/   catalogue (MAT-#### ids, deactivate/reactivate)
│  ├─ boq/         Bill of Quantities (BOQ-#### ids, waste & total maths)
│  ├─ records/     measurements + saved calculations (JSON values)
│  ├─ roofing/     roof design document + AI roof generation service
│  ├─ vision/      camera detection service (honestly "not configured")
│  ├─ reports/     reports + Excel export (openpyxl)
│  └─ company/     company profile + public contact form
└─ tests/          80 automated tests
```

**Every response has the same shape as the PHP API**, so the frontend works
with either backend:

```json
{ "success": true,  "data": { ... }, "count": 3 }
{ "success": false, "error": "Validation failed.", "errors": { "email": "Email is required." } }
```

### Endpoints

| Method(s) | Django route | Was (PHP) |
|---|---|---|
| GET | `/api/ping/` | `ping.php` |
| POST | `/api/auth/login/`, `register/`, `logout/` | `auth/*.php` |
| GET | `/api/auth/me/` | `auth/me.php` |
| PUT | `/api/account/profile/` · POST `/api/account/password/` | `account/*.php` |
| GET, PUT | `/api/company-profile/` | `company-profile/` |
| GET, POST | `/api/projects/` · GET, PUT, PATCH, DELETE `/api/projects/<id>/` | `projects/?id=` |
| same pattern | `/api/materials/<MAT-id>/` (DELETE = deactivate, `?reactivate=1`) | `materials/` |
| same pattern | `/api/boq/<BOQ-id>/` | `boq/` |
| same pattern | `/api/measurements/`, `/api/calculations/`, `/api/reports/` | same names |
| GET | `/api/history/` (filters: entityType, module, userId, date, q, limit) | `history/` |
| GET, PUT, DELETE | `/api/roof-designs/` (single shared design) | `roof-designs/` |
| POST | `/api/roof-ai/generate/` · `/api/scanner/detect/` | same names |
| GET | `/api/export/excel/?projectId=` (downloads .xlsx) | `export/excel.php` |
| POST | `/api/contact/` (public) | `contact/submit.php` |
| GET · PATCH | `/api/users/` · `/api/users/<id>/role/` (**Admin only**, new) | — |

### Rules kept exactly the same as PHP

* Every validation message, word for word (same Validator rules).
* `PHB-0001` refs come from the row id and are never reused. `MAT-1001` onwards. `BOQ-0007` comes from `seq`.
* BOQ: `adjusted = round(qty × (1 + waste%/100), 4)` and `total = round(adjusted × price, 2)`, using **PHP's half-up rounding** (Python's `round()` would differ).
* Every create/update/delete writes the same `history` entry. History failures never break the action.
* Materials sort by category in ENUM order (Cement, Sand, Aggregate…), as before.
* Passwords stay PHP bcrypt (`$2y$`). Old accounts log in unchanged, and Django-set passwords work in PHP too.

This was verified by running PHP and Django on the same data. All 66
records (materials, BOQ, history, measurements, calculations, reports, roof,
company) came out **identical**.

### Security (what changed on purpose)

| Topic | Behaviour |
|---|---|
| Sessions | HttpOnly cookie `phb_sid`, SameSite=Lax, Secure in production. "Remember me" = 30 days, otherwise ends with the browser. |
| CSRF | Every logged-in POST/PUT/PATCH/DELETE must send `X-CSRFToken` (the React client does this automatically). |
| Roles | The old single "role" is split in two. **Profession** (Contractor, Site Manager, Quantity Surveyor, Draftsman, Other) is chosen at sign-up and editable in Settings — stored in the new `users.profession` column, added by `apps/core/schema_upgrades.py`. **Access level** (Admin / Member) uses the existing `role` column: **nobody can become Admin through the website** (the PHP version allowed it). Admin is granted only on the server with `python manage.py create_admin`; an Admin can demote others but never the last Admin. Checks run on the server. |
| Rate limits | Login 10/min, register 20/hour, contact 10/hour (per IP). |
| Errors | Always clean JSON. Details go to the server log, never to the browser. |
| Secrets | Only in environment variables / `.env` (git-ignored). |

**Known limitation (unchanged from PHP):** projects, BOQ, calculations etc.
are **not owned by a user or a project**, so every logged-in user sees all
data. Fixing this needs new columns. That is a deliberate future database
change, to be made with a backup and a migration (see "Next steps").

## 4. The React frontend (`web/`)

```
web/src/
├─ main.tsx          starts the app; loads your original CSS; keeps old #bookmarks working
├─ App.tsx           routes: /login, /register, and the app shell modules
├─ config/env.ts     THE place the backend is chosen (VITE_BACKEND=django|php)
├─ api/
│  ├─ client.ts      one fetch helper: JSON envelope, errors, CSRF header, 401 → login
│  ├─ endpoints.ts   every backend URL (PHP and Django styles)
│  └─ resources/     typed functions per resource (auth, projects, records…)
├─ auth/             AuthContext — who is logged in (asks /api/auth/me/ on start)
├─ components/       AppShell (sidebar/topbar), Logo, Icon, Toast, ProgressBar
├─ domain/engines/   calculation + roof drawing/3D engines (formulas unchanged from the PHP app)
├─ features/         one folder per screen (auth, dashboard, projects, boq, calculators, roof-studio, scanner…)
└─ styles/           your ORIGINAL design system, copied unchanged from frontend/css
   └─ react/         small layout-only additions (full-screen split login)
```

Colours, fonts and spacing come from `styles/variables.css` (orange
`#FF6600`, charcoal `#2B2B2B`, slate `#5A6672`, light grey `#F2F3F5`, Segoe
UI). React components use **the same class names** as the PHP pages, so they
look identical.

### Migration status of the screens

**Every screen is migrated to React** and uses the same class names and CSS as the PHP pages:

- Login and Register (full-screen split design)
- App shell
- Dashboard
- Projects (list, detail, form)
- Materials
- BOQ (inline editing, contingency)
- Calculators (6)
- Manual Input (8 forms)
- Scanner (camera)
- Roof Studio (2D canvas, 3D viewer, AI)
- Reports and Excel
- History
- Settings

The **calculation and drawing engines** live in `web/src/domain/engines/`. They were converted *mechanically* from the original JS, so every formula line is unchanged. `engines.test.ts` runs the original files side by side with the converted ones across hundreds of inputs and requires identical output.

Changes made on purpose during the migration:

| Change | Why |
|---|---|
| The camera is always switched off when you leave the Scanner | The old app only stopped it on sidebar clicks, so the camera stayed on after a Back press |
| The Roof Studio canvas engine gained `destroy()`, and the store gained `flush()` | Listeners are removed when you leave the page, and the last edit is saved immediately |
| Roof Studio is lazy-loaded | Three.js (633 KB) is downloaded only when the screen is opened |
| Excel export downloads in the background | A server error now shows in the page's error box instead of replacing the page with raw JSON |
| Rebar "Add to BOQ" description fixed | The old app wrote "undefined x undefinedmm"; it now shows the real column size |
| Out-of-date notices corrected | The PHP pages said calculators and the 3D view were "not built yet"; they are |
| Excel: empty-BOQ message in the right cell | PHP wrote it to A31; it now appears in the first data row |

### Feature reality check (both stacks)

| Feature | State |
|---|---|
| Accounts, projects, materials, BOQ, measurements, saved calculations, history, reports, Excel export, company profile, roof design storage | ✅ working |
| Calculators (masonry/mortar, plaster, concrete slab & column, rebar for columns, timber, roofing) | ✅ working (formulas run in the browser) |
| Camera capture | ✅ working. **Automatic detection: not connected.** No vision model is integrated. |
| AI roof generation | ⚠️ works only if `ROOF_AI_API_URL` / `ROOF_AI_API_KEY` are set; otherwise says "not configured" |
| Data ownership: members see only their own projects, BOQ, measurements, calculations, reports, roof design and history; Admins see everyone's. Materials are shared, only Admins edit them | ✅ done (`apps/core/ownership.py`) |
| Project links: BOQ items, measurements and calculations can belong to a project ("Save to project" picker in Calculators, Manual Input and Scanner; project filter and column on the BOQ page). The project page tabs show its measurements, calculations, BOQ (with Excel export), reports and history. A project export contains only that project's BOQ. Deleting a project unlinks its records and never deletes them. Admins see an Owner column on BOQ, Reports and Projects | ✅ done |
| Roof designs per project: Roof Studio's "Roof design for" picker switches between your own design and each project's design (one per project). The project page's Roof Design tab shows a summary. Deleting a project keeps its design | ✅ done |
| Notifications, topbar search | ❌ not built yet |

## 5. Running everything locally

```powershell
# 1. Database copy (once per boot)
& "$HOME\PhentiBuild-mariadb\start-mariadb.bat"          # leave this window open

# 2. Django backend (new terminal)
cd "$HOME\Desktop\PhentiBuild\server"
.\.venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000

# 3. React frontend (new terminal)
cd "$HOME\Desktop\PhentiBuild\web"
npm run dev                                              # open http://localhost:5173
```

The old PHP app still runs through XAMPP at
`http://localhost/PhentiBuild/` (start Apache + MySQL in the XAMPP panel).

### Tests

```powershell
cd server;  .\.venv\Scripts\python.exe manage.py test tests   # 80 backend tests
cd web;     npm run build; npm run lint; npm test             # type-check, lint, 19 unit/parity tests
```

## 6. Next steps

1. Deploy (DEPLOYMENT.md): Django + MariaDB on Coolify, React on Vercel. Replace the placeholder API domain in `web/vercel.json` first.
2. Try every screen in a real browser on desktop and mobile. The automated tests cover the logic and the API, not how things look.
3. Browser walk-through of every screen on phone and desktop sizes.
4. Retire the PHP app only after the React + Django version has been used and checked.
