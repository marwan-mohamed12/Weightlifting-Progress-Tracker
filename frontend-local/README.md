# Plate Local

Same Plate app, no Spring Boot API. Workouts, exercises, templates, stats, and backups live in this browser (or the phone app).

```powershell
cd frontend-local
npm install
npm start
```

Open [http://localhost:4300](http://localhost:4300). Port 4300 so it can run next to `frontend/` on 4200.

To bring in data from the Spring Boot app, export JSON from Settings there, then Import JSON (merge) or Restore backup here.

Production build:

```powershell
npm run build
```

Serve `dist/plate/browser` with any static host. There is nothing to proxy.

Android debug APK (optional, still no backend):

```powershell
npm run apk
```

Output: `frontend-local/apk/plate-local-debug.apk`.
