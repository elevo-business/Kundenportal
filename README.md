# ELEVO — Command Center v6.1

Zentrale Steuerungsoberfläche für das Unternehmen ELEVO.

## Module
- **Dashboard** — Alle 4 Akquise-Kanäle auf einen Blick + Timeline
- **Pipeline** — Kanban-Board für Deals (Lead → Gewonnen)
- **Kontakte** — CRM-Lite für alle Geschäftskontakte
- **Cold Outreach** — E-Mail-Domains, Warmup-Tracker, Sequenzen, Kontaktlisten, Loom-Tracking
- **Google Ads** — Kampagnen, Keywords, Performance-Tracking
- **Projekte** — Laufende Aufträge mit Fortschrittsanzeige
- **Websites** — Verwaltung aller Kunden-Websites
- **Tasks** — Aufgabenverwaltung mit Kategorien und Prioritäten
- **SOPs** — Wiederholbare Checklisten für Standardprozesse
- **Finanzen** — Kostenübersicht + Break-Even-Rechnung
- **Notizen** — Freitext-Notizen
- **Settings** — PIN-Schutz, Backup/Restore, Reset

## Deployment via Coolify

### Methode 1: Git Repository (empfohlen)

1. Repository auf GitHub/Gitea erstellen
2. Code pushen:
   ```bash
   git init
   git add .
   git commit -m "ELEVO Command Center v6.1"
   git remote add origin <repo-url>
   git push -u origin main
   ```
3. In Coolify:
   - "New Resource" → "Application"
   - Source: Git Repository → URL eingeben
   - Build Pack: **Dockerfile**
   - Port: **80**
   - Deploy klicken

### Methode 2: Direkt auf dem Server

1. Auf den Hetzner Server SSH:
   ```bash
   ssh root@<server-ip>
   ```
2. In Coolify Dashboard:
   - "New Resource" → "Application"
   - Build Pack: **Dockerfile**
   - Repository-Pfad oder Git-URL angeben
   - Port: 80
   - Deploy

### Domain verbinden

1. In Cloudflare: A-Record `cmd.elevo.de` → Server-IP
2. In Coolify: Domain `cmd.elevo.de` eintragen
3. SSL wird automatisch über Let's Encrypt eingerichtet

## Lokale Entwicklung

```bash
npm install
npm run dev
# → http://localhost:3000
```

## Build

```bash
npm run build
# Output in /dist
```

## Daten

Alle Daten werden im Browser (localStorage) gespeichert.
Backup-Export/-Import über Settings möglich.

## Tech Stack
- React 18 + Vite 6
- Inline CSS (keine externen Abhängigkeiten)
- Docker + Nginx für Production
- Google Fonts: Cormorant Garamond + DM Sans
