# VanOS landing page - deploy

Static files only: index.html, favicon.svg, og-image.png, robots.txt, sitemap.xml. No build step. Not connected to the panel.

## 1. DNS (GoDaddy > van-os.uk > DNS)
Edit or add:
| Type  | Name | Value                      | TTL    |
|-------|------|----------------------------|--------|
| A     | @    | 57.129.156.254             | 600    |
| CNAME | www  | van-os.uk                  | 1 hour |

- Delete the parked-page A record for @ and the old www CNAME (the one pointing to the parking host). Turn off any GoDaddy "Forwarding" / parked-page setting.
- Leave play, panel and asia records alone. Do not change anything that makes play.van-os.uk resolve.

## 2. Copy files to the VPS
    scp -r vanos-site ubuntu@vps-0654ea2a:/tmp/
    ssh ubuntu@vps-0654ea2a
    sudo mkdir -p /opt/vanos-site && sudo cp -r /tmp/vanos-site/. /opt/vanos-site/

## 3. Serve it (cleanest: your existing Caddy)
Caddy already gives panel.van-os.uk its https, so add one more site to the same Caddyfile and mount the folder read-only into that Caddy container.

In the Caddy service in compose, add a volume:
    - /opt/vanos-site:/srv/vanos-site:ro

In the Caddyfile add:
    van-os.uk {
        root * /srv/vanos-site
        encode zstd gzip
        file_server
        header {
            Cache-Control "public, max-age=3600"
            X-Content-Type-Options nosniff
        }
    }
    www.van-os.uk {
        redir https://van-os.uk{uri} permanent
    }

Then, from the folder holding that compose file:
    sudo docker compose up -d caddy      # picks up the new mount
    sudo docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile

(Use your real Caddy service name and Caddyfile path. If you want, paste me the Caddy part of your compose and Caddyfile and I'll give you the exact lines.) Caddy fetches the https certificate itself once DNS has propagated.

## 4. Check
- https://van-os.uk loads, https://www.van-os.uk redirects to it.
- Copy button works, vote and Discord links open.
- Then add the site in Google Search Console and submit https://van-os.uk/sitemap.xml.
- Put https://van-os.uk as the website on each server listing.

## Updating later
Edit /opt/vanos-site/index.html. No restart needed.
Edit the Minecraft version line ("26.3") in the hero when you upgrade.
