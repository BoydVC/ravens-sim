# Ravens Season Sim 2026 (TokenMax build night)

An interactive 2026 Baltimore Ravens season simulator styled like a purple-and-gold broadcast graphic.
It runs 10,000 Monte Carlo simulations of every remaining NFL game league-wide and shows the Ravens'
projected win distribution, AFC North title odds, playoff odds and #1-seed odds. Click **W** or **L** on
any remaining Ravens game to force the result and watch the odds update live. **AUTO** puts it back.

> **These are model estimates, not predictions from ESPN or any outlet.**

## Run
```
nohup ./run.sh > server.log 2>&1 &      # http://127.0.0.1:4265
dist/ravens-sim-snapshot.html           # offline single file (data + engine inlined)
node --experimental-websocket tests/smoke_test.mjs   # smoke test (server must be up)
./screenshot.sh                          # regenerate screenshots
python3 fetch.py && python3 build_data.py && cp data/season.json web/ && python3 export_snapshot.py   # refresh data
```
URL option: `?force=<espnEventId>:W,<id>:L` preloads forced results.

## Data and sources (all public ESPN site API, saved in `data/raw/` with fetch times in `data/raw/manifest.json`)
- Weekly NFL scoreboards, weeks 1–18 (all 272 games, finals, and DraftKings lines where ESPN lists them):
  `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=2026&seasontype=2&week=N`
- Ravens schedule: `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/bal/schedule`
- Teams (names/colours): `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams`
- Conferences/divisions: `https://site.api.espn.com/apis/v2/sports/football/nfl/standings?season=2026&level=3`
- Cross-checked (read-only) against `../ravens-film-room/data` (schedule.json, scout.json: Week 5 ATL −3.5, DraftKings).
- Fetched 2026-10-07 ~6:28 PM ET. Records are computed from ESPN finals for all 32 teams (64 games through Week 4).

## Model assumptions
1. **Ratings:** every team starts at Elo 1500 (no preseason prior). They update after each completed 2026 game with
   K=20, home field +48 Elo, and a FiveThirtyEight-style margin-of-victory multiplier. With only four weeks played,
   ratings are deliberately close to even, so most games sit near 40–70%.
2. **Per-game win probability:** if ESPN's scoreboard lists a real point spread for an unplayed game, it's converted to a
   win probability with a normal model (σ = 13.45 points) and labelled **SPREAD**. Today that covers 29 games league-wide,
   including two Ravens games: Week 5 at ATL (ATL −3.5) and Week 6 at CLE (BAL −2.5). Every other game uses the Elo
   model and is labelled **ELO**. No spreads are invented.
3. Ratings stay fixed within a simulated season. Ties aren't simulated (only completed real games can be ties).
4. **Playoffs:** 7 seeds per conference (4 division winners seeded by record, then 3 wild cards). Tiebreakers are
   simplified to win %, then head-to-head win % among the tied teams, then division record (when all tied teams share a
   division), then conference record, then a coin flip. Real NFL steps like common games and strength of victory are
   not modelled.
5. 10,000 simulations with a seeded RNG (mulberry32, seed 20261007), so results reproduce exactly in Node and the browser.
6. "What has to happen" figures are conditional frequencies from the same 10,000 sims: playoff odds by final win
   total, the Ravens games with the biggest playoff swing, and other games whose result moves Ravens odds the most.

## Files
`fetch.py` (network fetch) · `build_data.py` (raw → data/season.json) · `web/sim.js` (engine, UMD) · `web/index.html` (UI) ·
`server.py`/`run.sh` (port 4265) · `export_snapshot.py` → `dist/ravens-sim-snapshot.html` · `tests/smoke_test.mjs` (+ `cdp.mjs` copied from bot-island-3d) · `screenshot.sh`.


---
## Repo notes
- **Built:** 2026-10-07, by TokenMax (Boyd's Grok Bot) on the Grok Bot box.
- **Run:** `./run.sh` (then open the localhost URL it prints).
- Imported from `/workspace/tokenmax/ravens-sim` on Oct 23, 2026. node_modules, virtualenvs, logs and files over 20 MB were left out.
- Personal details (emails, phone numbers, home street address) were replaced with `[redacted-…]` placeholders.
