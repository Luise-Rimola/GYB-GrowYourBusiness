# Hosting & Datenbank (Multi-User)

## Überblick

- Jede **Registrierung** legt einen **User** (E-Mail, Passwort-Hash) und genau einen **Company**-Arbeitsbereich an (`User.companyId` ist eindeutig).
- **Alle fachlichen Daten** (Runs, Artefakte, KPIs, Fragebögen, Evaluationen, Chat, …) hängen wie bisher an `companyId`. Damit sind die Daten pro Account getrennt.
- **LLM-URL, API-Key und Modell** stehen in `CompanySettings` pro Arbeitsbereich — jede Person kann einen eigenen Anbieter (OpenAI, Azure, Ollama, …) nutzen.

## Umgebungsvariablen

Siehe `.env.example`:

| Variable | Bedeutung |
|----------|-----------|
| `DATABASE_URL` | Verbindungs-URL für Prisma (SQLite-Datei oder PostgreSQL). |
| `AUTH_SECRET` | Geheimnis für signierte Sessions (JWT im Cookie `gds_session`). Mindestens 16 Zeichen. |
| `DEV_AUTH_BYPASS` | Nur Entwicklung: `1` = keine Anmeldung, nutzt die Demo-Company. **In Produktion nicht setzen.** |

## Datenbank einrichten

1. `.env` aus `.env.example` kopieren und `AUTH_SECRET` setzen.
2. Schema anwenden: `npx prisma db push` (oder `prisma migrate` bei geregelten Migrationen).
3. Optional: `npm run db:seed`
4. Produktions-Build: `npm run build` → `npm start`

### SQLite vs. PostgreSQL

- **SQLite** reicht für moderate Last und einen Prozess (typisch ein VPS mit einer Node-Instanz). Für ~150 Nutzer über Jahre oft ausreichend, wenn Backups geplant sind.
- **PostgreSQL** empfiehlt sich bei mehreren Instanzen, höherer Parallelität oder wenn Sie die DB verwaltet (z. B. Neon, RDS) betreiben wollen. Dann in `schema.prisma` `provider = "postgresql"` setzen und `DATABASE_URL` anpassen.

### Backups

- **SQLite**: regelmäßig die Datei (z. B. `prisma/dev.db`) sichern, ideal vor Deployments.
- **PostgreSQL**: Managed-Backups des Providers oder `pg_dump`.

## Daten pro Nutzer auswerten

- In der Datenbank: Filtern nach `companyId` (bzw. über `User.email` → `User.companyId`).
- Export: bestehende CSV-Route `/api/study/export` exportiert nur die Daten der **eingeloggten** Session.
- Für Forschung/Aggregation: SQL-Abfragen über alle Companies nur mit klarem **Zweck** und ggf. **Pseudonymisierung** (z. B. `StudyParticipant.externalId`).

## Deployment (kurz)

- Node.js-Runtime, `npm run build`, Prozessmanager (systemd, PM2, Docker).
- **HTTPS** erzwingen; Cookies sind `Secure` in Produktion.
- `AUTH_SECRET` und DB-URL nur als Server-Env, nicht im Client-Code.

## Studienablauf: LLM nach FB1

Nach Fragebogen 1 leitet die App auf `/study/llm-setup`. Dort werden API-URL, Key und Modell gespeichert; der Schritt wird in `StudyParticipant.completedLlmSetup` markiert. Änderungen sind jederzeit unter **Einstellungen** möglich.
