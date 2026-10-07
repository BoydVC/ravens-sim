#!/usr/bin/env bash
# Headless-Chrome screenshots of the live server on :4265 and the offline snapshot.
set -euo pipefail; cd "$(dirname "$0")"; mkdir -p screenshots
U="http://127.0.0.1:4265"
shot(){ local p; p="$(mktemp -d /tmp/rvshot.XXXX)"; google-chrome --headless=new --no-sandbox --disable-gpu --hide-scrollbars --force-device-scale-factor=1 ${4:-} --window-size="$3" --virtual-time-budget=15000 --user-data-dir="$p" --screenshot="$2" "$1" >/dev/null 2>&1; rm -rf "$p"; echo "  $2"; }
shot "$U/" screenshots/00-best-desktop.png 1440,1180
shot "$U/" screenshots/01-desktop-full.png 1440,2000
shot "$U/?force=401872993:W,401872997:W" screenshots/02-forced-wins-atl-cle.png 1440,1180
shot "$U/?force=401872993:L,401872997:L,401873012:L" screenshots/03-forced-losses.png 1440,1180
shot "$U/" screenshots/04-phone.png 390,2400
shot "file://$PWD/dist/ravens-sim-snapshot.html" screenshots/05-offline-snapshot.png 1440,1180
