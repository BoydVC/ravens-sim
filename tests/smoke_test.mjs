// Ravens Season Sim smoke test. Run: node --experimental-websocket tests/smoke_test.mjs  (server must be on :4265)
import { readFileSync } from 'node:fs'; import { createRequire } from 'node:module'; import { launch, sleep } from './cdp.mjs';
const require = createRequire(import.meta.url); const ROOT = new URL('..', import.meta.url).pathname;
const S = require(ROOT + 'web/sim.js'); const season = JSON.parse(readFileSync(ROOT + 'data/season.json'));
const J = p => JSON.parse(readFileSync(ROOT + p));
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('PASS', m); } else { fail++; console.log('FAIL', m); } };
// --- schedule vs sources
const bal = season.games.filter(g => g.home === 'BAL' || g.away === 'BAL');
for (const [file, label] of [['data/raw/schedule_bal.json', 'fresh ESPN schedule'], ['../ravens-film-room/data/raw/schedule.json', 'Film Room raw schedule']]) {
  const ev = J(file).events; let match = ev.length === bal.length;
  for (const e of ev) { const c = e.competitions[0], g = bal.find(x => x.id === e.id); if (!g) { match = false; continue; }
    const h = c.competitors.find(t => t.homeAway === 'home'), a = c.competitors.find(t => t.homeAway === 'away');
    if (h.team.abbreviation !== g.home || a.team.abbreviation !== g.away) match = false;
    if (c.status.type.completed) { const hs = +(h.score.displayValue ?? h.score), as = +(a.score.displayValue ?? a.score); if (hs !== g.hs || as !== g.as || !g.completed) match = false; } }
  ok(match, `BAL schedule (17 games, opponents, home/away, final scores) matches ${label}`);
}
const B = S.baseRecords(season).T; const scout = J('../ravens-film-room/data/scout.json');
ok(`${B.BAL.w}-${B.BAL.l}` === scout.teams.BAL.record, `BAL record ${B.BAL.w}-${B.BAL.l} matches Film Room scout (${scout.teams.BAL.record})`);
ok(`${B.ATL.w}-${B.ATL.l}` === scout.teams.ATL.record, `ATL record matches scout (${scout.teams.ATL.record})`);
ok(season.games.length === 272, '272 regular-season games league-wide');
ok(Object.keys(season.teams).every(a => season.games.filter(g => g.home === a || g.away === a).length === 17), 'every team has 17 games');
ok(Object.values(season.teams).every(t => t.conf && t.div), 'every team has conference + division from ESPN standings');
const atl = bal.find(g => g.week === 5); ok(atl.spread && atl.spread.details === scout.odds.details, `Week 5 spread ${atl.spread?.details} matches scouting tab (${scout.odds.details})`);
let rawOdds = 0; for (let w = 1; w <= 18; w++) for (const e of J(`data/raw/scoreboard_w${String(w).padStart(2, '0')}.json`).events) if (!e.competitions[0].status.type.completed && e.competitions[0].odds) rawOdds++;
ok(season.games.filter(g => g.spread).length === rawOdds, `spreads only where ESPN lists odds (${rawOdds} games)`);
ok(season.games.every(g => !(g.completed && g.spread)), 'no spreads attached to completed games');
ok(Object.keys(season.sources).length >= 21 && Object.values(season.sources).every(s => s.url && s.fetchedAt), 'every raw source saved with URL + fetch time');
// --- reproducibility
const a1 = S.simulate(season), a2 = S.simulate(season), a3 = S.simulate(season, { seed: 7 });
ok(JSON.stringify(a1.winDist) === JSON.stringify(a2.winDist) && a1.playoff === a2.playoff && a1.div === a2.div, `fixed seed ${a1.seed} is reproducible (playoff ${a1.playoff}/${a1.N})`);
ok(JSON.stringify(a1.winDist) !== JSON.stringify(a3.winDist), 'different seed gives a different sample');
ok(a1.N === 10000 && a1.winDist.reduce((s, x) => s + x, 0) === 10000, '10,000 simulations');
ok(a1.winDist.slice(0, B.BAL.w).every(x => x === 0), 'no sim ends below current win total');
// --- forced results
const fW = S.simulate(season, { forced: { [atl.id]: 'W' } }), fL = S.simulate(season, { forced: { [atl.id]: 'L' } });
ok(fW.playoff > a1.playoff && fL.playoff < a1.playoff, `forcing ATL W/L moves playoff odds (${fL.playoff / 100}% < ${a1.playoff / 100}% < ${fW.playoff / 100}%)`);
ok(fW.expWins > a1.expWins && fL.expWins < a1.expWins, 'forcing ATL W/L moves projected wins');
const allW = {}; bal.filter(g => !g.completed).forEach(g => allW[g.id] = 'W'); const fA = S.simulate(season, { forced: allW });
ok(fA.winDist[B.BAL.w + 13] === 10000 && fA.div === 10000, 'forcing all 13 remaining W => 16 wins + division in every sim');
// --- browser (live server + offline snapshot)
const b = await launch(9581, 1440, 1000);
async function waitSims(n) { for (let i = 0; i < 80; i++) { if ((await b.ev('window.__simDone||0')) >= n) return true; await sleep(200); } return false; }
await b.goto('http://127.0.0.1:4265/', 500); ok(await waitSims(1), 'live app renders a simulation');
const po0 = await b.ev('__last.playoff'); ok(po0 === a1.playoff, `browser result identical to Node (${po0})`);
ok((await b.ev('document.querySelectorAll("#sched .game").length')) === 17, '17 schedule rows');
ok((await b.ev('document.querySelectorAll("#sched .src.spread").length')) === 2 && (await b.ev('document.querySelectorAll("#sched .src.elo").length')) === 11, 'game labels: 2 spread-based, 11 Elo-based');
const t0 = await b.ev('document.getElementById("t-po").textContent');
await b.ev(`document.querySelector('.game[data-id="${atl.id}"] button.L').click()`); ok(await waitSims(2), 'click L re-simulates');
const t1 = await b.ev('document.getElementById("t-po").textContent');
ok((await b.ev('__last.playoff')) === fL.playoff && t1 !== t0, `clicking L on Week 5 updates odds live (${t0} -> ${t1})`);
ok((await b.ev('document.getElementById("need").innerText')).includes('coin-flip'), 'what-has-to-happen panel rendered');
ok(b.errors.length === 0, 'no JS errors on live app' + (b.errors.length ? ': ' + b.errors.join(' | ') : ''));
await b.ev('window.__simDone=0'); await b.goto('file://' + ROOT + 'dist/ravens-sim-snapshot.html', 500); ok(await waitSims(1), 'offline snapshot renders');
ok((await b.ev('__last.playoff')) === a1.playoff, 'snapshot gives same numbers');
ok(b.errors.length === 0, 'no JS errors in snapshot');
await b.close();
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
