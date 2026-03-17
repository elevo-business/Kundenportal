# ELEVO Client Portal

Upload- & Briefing-Portal für Kunden-Projekte.

## Deployment via Coolify

### 1. GitHub Repo erstellen
```bash
cd elevo-portal
git init
git add .
git commit -m "ELEVO Client Portal v1.0"
git remote add origin git@github.com:DEIN-USER/elevo-portal.git
git push -u origin main
```

### 2. In Coolify einrichten
1. Coolify → New Resource → Application
2. GitHub Repo auswählen: `elevo-portal`
3. Build Pack: **Dockerfile**
4. Domain: `upload.elevo.solutions`
5. Environment Variables setzen:
   - `ADMIN_PASSWORD` = Dein sicheres Admin-Passwort
   - `PORT` = 3000
6. Volumes (WICHTIG für Persistenz):
   - `/app/data` → Named Volume `portal-data`
   - `/app/uploads` → Named Volume `portal-uploads`
7. Deploy

### 3. Cloudflare DNS
A-Record: `upload` → `159.195.37.216` (Proxy ein)

### 4. Nutzen
- **Admin:** `https://upload.elevo.solutions/admin`
- **Kunden-Link:** `https://upload.elevo.solutions/p/{token}` (wird automatisch generiert)

## Workflow
1. Admin → "Neues Projekt" → Firmenname eingeben
2. Kunden-Link wird generiert → per E-Mail an Kunden senden
3. Kunde füllt Briefing aus + lädt Dateien hoch
4. Admin sieht Fortschritt + kann alles runterladen

## Tech-Stack
- Node.js + Express
- SQLite (better-sqlite3)
- Multer (File Uploads)
- Vanilla HTML/CSS/JS Frontend
- Docker
