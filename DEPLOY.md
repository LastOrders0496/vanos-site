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

## 2. Get the files onto the VPS
    sudo git clone https://github.com/LastOrders0496/vanos-site.git /opt/vanos-site
    cd /opt/vanos-site
    sudo sh -c 'base64 -d og-image.png.b64 > og-image.png' && sudo rm og-image.png.b64

The share image is stored as base64 text (og-image.png.b64) because GitHub's web upload would not take the PNG. The two commands after the clone turn it back into og-image.png.
To update later: cd /opt/vanos-site && sudo git pull (the PNG decode is only needed once, but git will show og-image.png.b64 as deleted, which is fine).

## 3. Serve it (Caddy running on the host)
Caddy on this VPS runs as a systemd service using /etc/caddy/Caddyfile, not in Docker, so no volume mount is needed. Add to /etc/caddy/Caddyfile:
    van-os.uk {
        root * /opt/vanos-site
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

Back up first: sudo cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.bak
Check it: sudo caddy validate --config /etc/caddy/Caddyfile
Apply it: sudo systemctl reload caddy
Caddy fetches the https certificate itself once DNS has propagated. Caddy's user must be able to read /opt/vanos-site (the default clone permissions allow that).

## 4. Check
- https://van-os.uk loads, https://www.van-os.uk redirects to it.
- Copy button works, vote and Discord links open.
- Then add the site in Google Search Console and submit https://van-os.uk/sitemap.xml.
- Put https://van-os.uk as the website on each server listing.

## Updating later
Edit /opt/vanos-site/index.html or run sudo git pull there. No restart needed.
Edit the Minecraft version line ("26.3") in the hero when you upgrade.
