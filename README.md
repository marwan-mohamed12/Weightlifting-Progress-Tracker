# Plate — Weightlifting Progress Tracker

Mobile-first PWA for logging lifting sessions and answering progress questions from that log.

Phase 1: manage exercises, record workouts (including different reps per set), browse history, and read basic stats.

AI assistants: read [`INSTRUCTIONS.md`](INSTRUCTIONS.md) before changing anything. Work in this local repo — do not create a separate git worktree.

## Stack

- **Frontend:** Angular 22 PWA with Tailwind CSS (`frontend/`). SCSS is only used for the bumper-plate control.
- **Backend:** Spring Boot 3.5 on JDK 21 (`backend/`), `application-local.properties` / `application-prod.properties`, Spring DevTools
- **Database:** SQLite (`backend/data/weightlifting.db` locally)

## Run locally

This machine’s default `JAVA_HOME` may still point at JDK 8. Use JDK 21:

```powershell
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-21.0.12.8-hotspot"
$env:Path = "$env:JAVA_HOME\bin;" + $env:Path
```

Terminal 1 — API (`mvn21.cmd` forces JDK 21; the default `JAVA_HOME` on this machine is JDK 8):

```powershell
cd backend
.\mvn21.cmd spring-boot:run
```

Terminal 2 — app:

```powershell
cd frontend
npm start
```

Open [http://localhost:4200](http://localhost:4200). The Angular dev server proxies `/api` to `http://localhost:8080`.

## Run without a backend

`frontend-local/` is the same app with data in the browser. No Java, no SQLite, no `/api`.

```powershell
cd frontend-local
npm install
npm start
```

Open [http://localhost:4300](http://localhost:4300). Export a JSON backup from Settings if you want to move data later.

Production API profile:

```powershell
cd backend
.\mvn21.cmd spring-boot:run "-Dspring-boot.run.profiles=prod"
```

## Tests

```powershell
cd backend
.\mvn21.cmd test

cd frontend
npm test
```

## Android APK

This is a Capacitor wrapper around the Angular app, not a store-ready Play listing.

1. Install [Android Studio](https://developer.android.com/studio) and open it once so the Android SDK downloads.
2. From `frontend`:

```powershell
npm run apk
```

The debug APK is written to `frontend/apk/plate-debug.apk`. Copy it to the phone and open it (allow install from this source).

The APK still talks to the Spring Boot API on your PC. Keep the phone on the same Wi-Fi and run:

```powershell
cd backend
.\mvn21.cmd spring-boot:run
```

`npm run apk` stamps your current LAN IP into the app (`http://YOUR_IP:8080/api`). If the PC gets a new IP, build the APK again.

## Example session

Bench press, 40 kg, 8 / 7 / 6 reps is one workout with three sets. Stats for that exercise then show highest weight 40 kg, 3 sets, 21 total reps, and “40 kg used 3 times.”
