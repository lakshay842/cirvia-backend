# Local database setup

`prisma migrate deploy` needs PostgreSQL on **localhost:5432**.  
Error `P1001: Can't reach database server` means the DB is not running.

## Permission denied (`EACCES` on package.json)

If you used `su coolboots` to access Docker, **stop** — the repo lives in `/home/lakshay`, which `coolboots` cannot read.

```bash
exit                                    # back to user lakshay
sudo usermod -aG docker lakshay         # one-time: docker without su
# Log out and log back in, then:
cd ~/Documents/cirvia/backend-api
npm run db:setup
```

Use `~/Documents/cirvia/backend-api` as **lakshay**, not `~/Documents/...` as coolboots.

---

## Option A — Docker (recommended)

Matches `docker-compose.yml` and `.env` credentials.

```bash
# One-time install (Ubuntu) — run as lakshay (or any user with sudo)
sudo apt update
sudo apt install -y docker.io docker-compose-v2
sudo usermod -aG docker lakshay
```

**Log out and log back in** as **lakshay** (not `su coolboots`), then:

```bash
cd ~/Documents/cirvia/backend-api
newgrp docker    # only needed once per terminal if you just joined docker group
npm run db:setup
```

If you see `permission denied` on `docker.sock` right after `usermod`, run `newgrp docker` (or open a **new terminal**) — group changes do not apply to an already-open shell.

This will:

1. Start `cirvia-postgres` + `cirvia-redis` containers
2. Apply all migrations (including Reports/Analytics)
3. Seed roles, categories, and settings

Individual commands:

| Command | Purpose |
|---------|---------|
| `npm run db:up` | Start Postgres + Redis |
| `npm run db:check` | Verify port 5432 is open |
| `npm run db:migrate:deploy` | Apply migrations only |
| `npm run db:seed` | Run seed script |
| `npm run db:down` | Stop containers |

## Option B — System PostgreSQL (no Docker)

```bash
sudo apt install -y postgresql postgresql-contrib
sudo service postgresql start

sudo -u postgres psql <<'SQL'
CREATE USER cirvia WITH PASSWORD 'cirvia_secret';
CREATE DATABASE cirvia_db OWNER cirvia;
GRANT ALL PRIVILEGES ON DATABASE cirvia_db TO cirvia;
SQL
```

Then:

```bash
cd backend-api
npm run db:migrate:deploy
npm run db:seed
```

## Verify

```bash
npm run db:check
npx prisma migrate status
```

## Credentials (default)

| Setting | Value |
|---------|-------|
| Host | `localhost` |
| Port | `5432` |
| Database | `cirvia_db` |
| User | `cirvia` |
| Password | `cirvia_secret` |

Defined in `.env` and `docker-compose.yml`.
