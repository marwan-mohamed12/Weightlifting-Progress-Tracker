# AI Instructions — Weightlifting Progress Tracker (Plate)

This file is the **source of truth** for any AI assistant working on this repository. Read it before writing code. Follow it unless the human explicitly overrides it.

The product name in the UI is **Plate**. The GitHub repository is `Weightlifting-Progress-Tracker`.

---

## 0. Non-negotiable working rules

### Edit this repo in place. Never use a separate worktree.

- Make **all** file changes directly in the current local repository working tree.
- **Do not** create a git worktree (`git worktree add`, Graphite worktrees, or any equivalent).
- **Do not** launch subagents with `isolation=worktree` or any other isolated checkout.
- **Do not** copy the project to a sibling folder, `/tmp`, or a new clone to "keep the original clean."
- **Do not** check out a throwaway branch in a second tree and merge back later unless the human asked for that workflow.
- If you spawn subagents, they must share this workspace (`isolation=none` / default). They edit the same files.
- The current workspace path **is** the project. Treat it as the only tree that matters.

### Other working rules

- Stay inside Phase 1 unless the human asks for a later phase.
- Prefer small, complete, working slices over unfinished scaffolding.
- Do not invent features, entities, or API fields that are not in this document.
- Do not add authentication, cloud sync, social features, or a second database in Phase 1.
- Do not expose JPA entities from REST controllers. Use DTOs.
- Do not commit secrets. This app has none in Phase 1.
- After UI changes, verify in the browser (or the closest substitute) before calling the work done.
- Keep Java on **JDK 21**. The machine `JAVA_HOME` may still point at JDK 8. Always use `backend/mvn21.cmd` (it sets `JAVA_HOME` to `C:\Program Files\Eclipse Adoptium\jdk-21.0.12.8-hotspot`). Do not run plain `mvn` unless that JDK is already on `JAVA_HOME`.

- SQLite is the only database. Do not switch to H2, Postgres, or MySQL unless asked.

---

## 1. What this app is

Plate is a **mobile-first Progressive Web App** for one person recording weightlifting sessions and answering progress questions from that log.

It is used in a gym, on a phone, often with limited patience. Logging a set must be fast. History and stats exist so the user can answer:

| Question | Where it is answered |
| --- | --- |
| How many times have I lifted 40 kg? | Stats → weight frequency (set count + session count) |
| What was my highest weight for Bench press? | Stats → highest weight |
| How many reps did I perform with 40 kg? | Stats → weight frequency → total reps |
| Am I getting stronger over time? | Stats → trend (session max-weight over time) |
| What was my best performance for an exercise? | Stats → best set (highest weight, then most reps) |

### Phase 3 (current product)

Long-term progress, planning, and portable data.

1. Progress overview with time filters: 7 days, 30 days, 3 months, 6 months, 1 year, 30 months, all time. Weekly/monthly volume, weekly and exercise frequency, averages, volume per muscle group, progress %, this month vs last month, PR timeline.
2. Workout templates: name, exercises, target sets/reps/weight; start a live session from a template.
3. Data management: JSON export/backup, CSV export, JSON import (merge), CSV import, restore (replace sessions/templates). SQLite remains the local database. Imports are validated.

### Phase 2 (current product)

Gym **sessions** (not one exercise per save), per-exercise progress with charts, and personal records.

1. Start a workout, add multiple exercises and sets, finish, edit, or delete the whole session.
2. Exercise progress: current weight, personal best, total sessions, total reps.
3. Charts: weight, reps, and volume over time. Volume = sum of (weight × reps) for each set.
4. Personal records: heaviest weight, most reps at a weight, highest session volume, most reps in one set, estimated 1RM (Epley). Detected on finish; user can disable alerts in Settings.

### Phase 1 scope (this is the current product)

1. **Exercise management** — create, edit, delete, and select an exercise when logging.
2. **Workout entry** — date, exercise, per-set weight, per-set reps, optional notes.
3. **Workout history** — previous records with date, exercise, weight, reps, sets; filter by exercise.
4. **Basic statistics per exercise** — highest weight, highest reps, total sets, total reps, session count, times a specific weight was used.

### Explicitly out of Phase 1

- User accounts, login, multi-user
- Programs, routines, planned workouts
- Rest timers, plate calculator, bodyweight tracking
- Charts beyond a simple session trend list
- Cloud backup, export/import (can be Phase 2)
- Social / sharing
- Offline write queue (app shell may cache; API writes require the backend)

---

## 2. Tech stack

| Layer | Choice | Notes |
| --- | --- | --- |
| Frontend | Angular 22, standalone, zoneless, Tailwind CSS | SCSS only for the plate-face (radial metal that Tailwind cannot express) |
| PWA | `@angular/service-worker` | App shell + installable manifest |
| Backend | Java 21, Spring Boot 3.5, Maven | Feature packages. `.properties` only. Profiles: `local` (default) and `prod`. `spring-boot-devtools` for local reload. |
| Persistence | Spring Data JPA + SQLite | `hibernate-community-dialects` `SQLiteDialect` |
| API style | REST JSON under `/api` | DTOs + Bean Validation |
| Frontend forms | Reactive forms, `FormArray` for sets | No `ngModel` for the workout form |
| Tests | JUnit 5 + MockMvc (backend), Vitest (frontend) | Stats math must have unit tests |
| Android APK | Capacitor 8 wrapping the Angular build | `npm run apk` in `frontend/`. Needs Android Studio/SDK. Debug APK still calls the Spring Boot API on the LAN. |

Frontend talks to the backend through the Angular dev proxy (`/api` → `http://localhost:8080`) so the PWA origin stays same-origin in development.

---

## 3. Repository layout

```
.
├── INSTRUCTIONS.md          ← this file (AI source of truth)
├── README.md                ← human how-to-run
├── .gitignore
├── backend/                 ← Spring Boot app
│   ├── pom.xml
│   ├── data/                ← sqlite file at runtime (gitignored)
│   └── src/main/resources/
│       ├── application.properties
│       ├── application-local.properties
│       └── application-prod.properties
│   └── src/main/java/com/weightlifting/tracker/
│       ├── WeightliftingTrackerApplication.java
│       ├── config/
│       ├── exercise/
│       ├── workout/
│       ├── stats/
│       └── shared/
├── frontend/                ← Angular PWA (talks to Spring Boot)
│   └── src/app/
│       ├── core/            ← models, HTTP API service
│       ├── layout/          ← app shell + bottom nav
│       ├── pages/           ← history, log, exercises, stats
│       └── shared/          ← presentational pieces
└── frontend-local/          ← same UI, no backend (browser localStorage)
```

Package by **feature** on the backend (`exercise`, `workout`, `stats`), not by technical layer (`controller` / `service` / `repository` at the top level).

---

## 4. Domain model

A **workout** is one exercise performed on one date, made of one or more **sets**. Sets can have different reps and different weights.

Example the product must support:

> Bench press — 40 kg — 8 reps in the first set, 7 in the second, 6 in the last.

That is **one workout** with **three sets**, not three workouts.

### Exercise

| Field | Type | Rules |
| --- | --- | --- |
| id | long | identity |
| name | string | required, 1–120 chars, unique case-insensitive, trimmed |
| notes | string | optional, max 1000, description of the movement |
| createdAt / updatedAt | instant | server-managed |

Deleting an exercise is **rejected (409)** if any workout references it. History is never silently deleted.

### Workout

| Field | Type | Rules |
| --- | --- | --- |
| id | long | identity |
| exercise | FK | required, must exist |
| performedOn | local date | required |
| notes | string | optional, max 2000 |
| sets | 1–50 | ordered by `setIndex` starting at 1 |
| createdAt / updatedAt | instant | server-managed |

### WorkoutSet

| Field | Type | Rules |
| --- | --- | --- |
| id | long | identity |
| workout | FK | required |
| setIndex | int | 1-based order in the workout |
| weightKg | decimal(8,2) | `> 0` and `≤ 1000` |
| reps | int | `1–500` |

Weight is stored as `BigDecimal` so “how many times did I lift 40 kg?” uses numeric equality, not floats.

---

## 5. HTTP API

Base path: `/api`. JSON. Dates as `YYYY-MM-DD`. Weights as numbers (e.g. `40` or `42.5`).

Error body:

```json
{ "error": "NOT_FOUND", "message": "Exercise 12 was not found." }
```

Use `400` validation, `404` missing, `409` conflict (duplicate exercise name, or delete blocked).

### Exercises

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/exercises` | list, alphabetical |
| POST | `/api/exercises` | create `{ "name", "notes?" }` |
| GET | `/api/exercises/{id}` | get one |
| PUT | `/api/exercises/{id}` | update `{ "name", "notes?" }` |
| DELETE | `/api/exercises/{id}` | delete if unused |

### Workouts

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/workouts?exerciseId=&from=&to=` | newest date first; optional filters |
| POST | `/api/workouts` | create |
| GET | `/api/workouts/{id}` | get one |
| PUT | `/api/workouts/{id}` | replace date/exercise/notes/sets |
| DELETE | `/api/workouts/{id}` | delete |

Create/update body:

```json
{
  "exerciseId": 1,
  "performedOn": "2026-09-19",
  "notes": "paused the last rep",
  "sets": [
    { "weightKg": 40, "reps": 8 },
    { "weightKg": 40, "reps": 7 },
    { "weightKg": 40, "reps": 6 }
  ]
}
```

`setIndex` is assigned by the server from array order. Clients do not send it.

Response includes exercise name, all sets with `setIndex`, and a convenience `summary` string such as `40 kg · 8, 7, 6` (or `40×8, 42.5×6` when weights differ).

### Statistics

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/stats/exercises/{id}` | all Phase 1 stats for one exercise |
| GET | `/api/stats/weights?weightKg=40&exerciseId=` | times / reps at a weight (exercise optional) |

`GET /api/stats/exercises/{id}` must return:

- `highestWeightKg`
- `highestReps` (single set)
- `totalSets`
- `totalReps`
- `sessionCount`
- `bestPerformance` — the set with highest weight; tie-break more reps, then more recent date
- `trend.direction` — `up` | `down` | `stable` | `insufficient`
- `trend.sessions[]` — each session’s date, max weight, total reps, total volume (`sum(weight * reps)`)
- `weightFrequency[]` — each distinct weight with `setCount`, `totalReps`, `sessionCount`

Trend rule (keep this exact so stats tests stay stable):

- Fewer than 2 sessions → `insufficient`
- Compare average session-max-weight of the **last 3** sessions vs the **3 before those** (use whatever exists, minimum 1 on the older side when only 2 sessions total)
- Difference `≥ 2.5 kg` up, `≤ -2.5 kg` down, otherwise `stable`

CORS: allow the Angular origin (`http://localhost:4200`) in dev. No Spring Security in Phase 1.

---

## 6. Frontend information architecture

Mobile app shell with a **bottom navigation of four destinations** (never more than four):

| Tab | Route | Job |
| --- | --- | --- |
| History | `/` | scan previous work; filter by exercise |
| Log | `/log` and `/log/:id` | record or edit a workout |
| Exercises | `/exercises` | create / rename / delete |
| Stats | `/stats` | pick an exercise, read numbers |

### History

- Group workouts by `performedOn`, newest day first.
- Each row: exercise name, summary (`40 kg · 8, 7, 6`), optional note excerpt.
- Filter control: all exercises, or one exercise.
- Tap a row → edit on Log.
- Empty state tells the user to log the first workout, with a button to `/log`.

### Log

- Date, default today.
- Exercise select. If none exist, prompt to create one without leaving the page (inline name field or short overlay).
- **Signature UI:** a bumper-plate face shows the **currently selected set’s** weight (circular hub + colored band, no extra box/border). Ring color follows IWF-ish plate colors:
  - &lt; 10 kg green `#2F9E44`
  - 10–14.99 yellow `#F4C431`
  - 15–19.99 blue `#3B82F6`
  - 20–24.99 red `#D94B2B`
  - ≥ 25 kg red `#D94B2B` with a brass hub stamp
- Sets use a `FormArray`. **Every set always has its own weight (kg) and reps** — warmup and working sets of the same exercise in one session are first-class. Steppers ±2.5 kg and ±1 rep. Minimum 44×44 px targets, 8 px gap.
- “Add set” copies the previous set (gym default). Change that set’s kg to log a different load.
- At least one set required to save.
- Notes optional.
- Saving goes back to History.

### Exercises

- Alphabetical list, search/filter field.
- Create and edit with name + optional notes.
- Delete asks for confirmation and surfaces the 409 message if the exercise is in use.
- Empty state: create the first exercise.

### Stats

- Exercise picker (required to show per-exercise stats).
- Big number: highest weight.
- Grid: highest reps, total sets, total reps, sessions.
- Best performance line: `40 kg × 8` on date.
- Trend sentence in plain language (“Getting stronger”, “Holding steady”, “Down from your earlier peak”, “Log more sessions to see a trend”).
- Session list newest-first with max weight.
- Weight frequency list answering “how many times / how many reps at this weight”.

### Global UX

- Mobile-first, usable at 375 px, readable on tablet.
- Touch targets ≥ 44 px.
- Visible labels on inputs (not placeholder-only).
- Errors next to the field.
- No emoji as icons. Inline SVG, outline style, 24 px, consistent stroke.
- Respect `prefers-reduced-motion`.
- Safe-area insets on the header and bottom nav (`env(safe-area-inset-*)`).
- Dark theme only in Phase 1 (gym lighting). Do not add a light theme unless asked.

---

## 7. Visual design (do not genericize this)

Visual language follows the fitness-app reference: charcoal screens, lime + lilac + blush filled cards, and a **floating white pill dock**. Do not revert to plate-red/brass iron, cream+serif, or newspaper layouts.

| Token | Tailwind | Hex | Role |
| --- | --- | --- | --- |
| iron | `bg-iron` | `#141416` | screen background |
| surface | `bg-surface` | `#1C1C20` | dark cards |
| raised | `bg-raised` | `#25252B` | inputs / chips |
| ink | `text-ink` | `#F6F6F7` | primary text |
| mute | `text-mute` | `#9A9AA3` | secondary text |
| plate / lime | `bg-plate` `bg-lime` | `#C8F247` | primary CTA, today chip, hero stats |
| on-plate | `text-on-plate` | `#141416` | text on lime/lilac/blush |
| lilac | `bg-lilac` | `#C9B6FF` | secondary metric tiles |
| blush | `bg-blush` | `#F3B4D0` | tertiary tiles |
| dock | `bg-dock` | `#FFFFFF` | floating bottom nav |
| bad | `text-bad` | `#FF6B7A` | delete |

Typography (Google Fonts):

- **UI, titles, numbers:** [Outfit](https://fonts.google.com/specimen/Outfit) 400/500/600/700/800

Signature elements: the **white capsule dock** (lime filled icon when active) and the **lime “today” calendar chip** on History. The bumper-plate on Log stays, with a lime/lilac/blush ring.

Copy voice: short, gym-floor, sentence case. Buttons say the action (`Save workout`, `Add set`, `Delete exercise`). Empty states tell the user what to do next. Errors name the problem and how to fix it. Do not apologize.

---

## 8. How to run

JDK 21 is required. On this machine:

```powershell
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-21.0.12.8-hotspot"
$env:Path = "$env:JAVA_HOME\bin;" + $env:Path
```

Backend (use `mvn21.cmd` so Maven does not pick up the machine default JDK 8). **Local profile is the default.**

```powershell
cd backend
.\mvn21.cmd spring-boot:run
```

API: `http://localhost:8080/api`  
SQLite (local): `backend/data/weightlifting.db`

Production profile:

```powershell
.\mvn21.cmd spring-boot:run "-Dspring-boot.run.profiles=prod"
```

or `java -jar tracker.jar --spring.profiles.active=prod`. SQLite (prod default): `backend/data/weightlifting-prod.db`, override with `PLATE_DB_PATH`.

Frontend local:

```powershell
cd frontend
npm start
```

App: `http://localhost:4200` (proxies `/api` to 8080). Uses `src/environments/environment.ts`.

### No-backend app (`frontend-local/`)

Same screens and flows, with the HTTP API replaced by `localStorage`. Use this when you do not want to run or deploy Spring Boot.

```powershell
cd frontend-local
npm install
npm start
```

App: `http://localhost:4300`. Data stays in the browser (key `plate.local.v1`). Export/import JSON and CSV still work. First launch seeds a short exercise list.

Android APK from this folder (`npm run apk`) also stores data on the device and does not call the API. Output: `frontend-local/apk/plate-local-debug.apk`.

Frontend production build uses `src/environments/environment.prod.ts`:

```powershell
cd frontend
npm run build
```

Android debug APK (requires Android Studio / SDK installed once):

```powershell
cd frontend
npm run apk
```

Output: `frontend/apk/plate-debug.apk`. The build stamps the PC’s LAN IP into `environment.native.ts` so the phone can reach `http://<lan-ip>:8080/api`. Keep `.\mvn21.cmd spring-boot:run` going. Local CORS allows all origins so the Capacitor WebView can call the API.

---

## 9. Coding conventions

### Backend

- Constructor injection, `private final` collaborators.
- `@Valid` on request bodies. Global `@RestControllerAdvice`.
- `@Transactional` on service methods that write.
- Never return entities from controllers.
- SLF4J parameterized logging.
- Stats math lives in a dedicated class so it can be unit-tested without Spring.
- Feature package names stay as in section 3.
- Shared config lives in `application.properties`. Environment-specific values go in `application-local.properties` and `application-prod.properties`. Do not reintroduce YAML. Default profile is `local`.

### Frontend

- Standalone components, signals for local UI state, reactive forms for input.
- One API service in `core`. Pages do not call `HttpClient` directly. In `frontend/`, the API base URL comes from `src/environments/environment.ts` (local) / `environment.prod.ts` (production build). In `frontend-local/`, `core/api.ts` reads and writes `localStorage` instead of HTTP.
- Lazy-load page routes. Preload all modules after first paint.
- Style with **Tailwind utilities** and the shared classes in `frontend/src/styles.css` (`btn`, `card`, `control`, `page-title`). Do not add per-page `.scss` files.
- SCSS (or component `styles`) is allowed only for things Tailwind cannot express — today that is the bumper-plate face (`plate-face.ts`).
- Colors and type live in the Tailwind `@theme` block (`iron`, `surface`, `raised`, `ink`, `mute`, `line`, `plate`, `brass`, `good`, `bad`). No ad-hoc hex in templates unless it is a plate-ring color mapped from weight.
- Layout is mobile-first: bottom nav below `lg`, left rail at `lg` and up. Touch targets stay ≥ 48px. Use the 8px spacing scale.
- 2025 Angular file names (`history.ts`, not `history.component.ts`) unless a file already exists in the other style — then match the folder.

### Git

- Work on the current checkout.
- Do not force-push, do not rewrite `main`, do not create extra worktrees.

---

## 10. Testing expectations

Backend (required):

- Stats calculator unit tests covering the Bench press 40 kg × 8/7/6 example and the trend thresholds.
- MockMvc tests for exercise CRUD, duplicate name 409, delete-in-use 409, workout create/list/filter/delete.

Frontend:

- Keep the generated unit test runner working.
- Prefer testing form logic (add set copies previous, cannot save with 0 sets) over snapshot DOM tests.

Manual verification for UI work:

- Log the Bench press example end to end.
- Confirm it appears on History grouped by date.
- Filter History by that exercise.
- Open Stats and check highest weight 40, total reps 21, 3 sets, 1 session, weight frequency for 40 kg.
- Edit and delete a workout.
- Create, rename, and (unused) delete an exercise.
- Check 375 px width and the bottom nav with a safe area.

---

## 11. Future phases (do not build now)

Recorded so later work stays compatible:

- Phase 2: CSV export/import, estimated 1RM, simple charts
- Phase 3: routines / planned sessions
- Phase 4: optional accounts and sync

When adding a phase, update this file first, then the code.

---

## 12. What “done” looks like for Phase 1

- Backend boots on JDK 21 against SQLite and serves the API above.
- Angular PWA installs (manifest + service worker in production build).
- A user can manage exercises, log a workout with per-set reps, browse/filter history, and read the stats that answer the five questions.
- `INSTRUCTIONS.md` remains accurate. If you change behavior, change this file in the same edit.
