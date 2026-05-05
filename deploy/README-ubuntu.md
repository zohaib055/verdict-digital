# Ubuntu Deployment

This deploys the Verdict FastAPI backend as a systemd service on port `8001`.

## 1. Prepare The Server

```bash
sudo apt update
sudo apt install -y git python3 python3-venv python3-pip nginx
```

Clone the repository into `/opt/verdict-backend`:

```bash
sudo git clone git@github.com:zohaib055/verdict-digital.git /opt/verdict-backend
sudo chown -R www-data:www-data /opt/verdict-backend
```

If you deploy with a different path or Linux user, update `WorkingDirectory`, `EnvironmentFile`, `ExecStart`, `User`, and `Group` in `deploy/verdict-backend.service`.

## 2. Install Python Dependencies

```bash
cd /opt/verdict-backend
sudo -u www-data python3 -m venv .venv
sudo -u www-data .venv/bin/pip install --upgrade pip
sudo -u www-data .venv/bin/pip install -r requirements.txt
```

## 3. Configure Environment

Create the production `.env` file:

```bash
sudo -u www-data cp .env.example .env
sudo nano .env
```

At minimum, set these values:

```bash
DATABASE_URL=postgresql+psycopg2://USER:PASSWORD@HOST:5432/DATABASE
AUTH_SECRET_KEY=use-a-long-random-secret
ENV=production
DEBUG=false
CORS_ALLOW_ORIGINS=["https://your-frontend-domain.com","http://your-server-ip:5173"]
```

For a frontend build that talks directly to this backend, set:

```bash
VITE_API_BASE_URL=http://your-server-ip:8001/api/v1
```

## 4. Run Migrations

```bash
cd /opt/verdict-backend
sudo -u www-data .venv/bin/alembic upgrade head
sudo -u www-data .venv/bin/alembic current
```

## 5. Install The systemd Service

```bash
sudo cp /opt/verdict-backend/deploy/verdict-backend.service /etc/systemd/system/verdict-backend.service
sudo systemctl daemon-reload
sudo systemctl enable verdict-backend
sudo systemctl start verdict-backend
```

Check status and logs:

```bash
sudo systemctl status verdict-backend
sudo journalctl -u verdict-backend -f
```

Health check:

```bash
curl http://127.0.0.1:8001/health
```

If you want the API reachable directly on port `8001`, allow it through the firewall:

```bash
sudo ufw allow 8001/tcp
```

## 6. Optional Nginx Proxy

The included Nginx config proxies port `80` to the backend on `127.0.0.1:8001`.

```bash
sudo cp /opt/verdict-backend/deploy/nginx-verdict-backend.conf /etc/nginx/sites-available/verdict-backend
sudo ln -sf /etc/nginx/sites-available/verdict-backend /etc/nginx/sites-enabled/verdict-backend
sudo nginx -t
sudo systemctl reload nginx
```

Then the backend is available at:

```bash
http://your-server-ip/health
http://your-server-ip/docs
```

## Updating A Deployment

```bash
cd /opt/verdict-backend
sudo -u www-data git pull
sudo -u www-data .venv/bin/pip install -r requirements.txt
sudo -u www-data .venv/bin/alembic upgrade head
sudo systemctl restart verdict-backend
sudo systemctl status verdict-backend
```
