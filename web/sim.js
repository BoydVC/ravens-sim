/* Ravens Season Sim engine — model estimates only (not any outlet's prediction). UMD: works in browser + Node. */
(function(root){
const MODEL={start:1500,K:20,hfa:48,eloPerPt:25,spreadSD:13.45,seed:20261007,sims:10000};
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function phi(x){ // standard normal CDF (Abramowitz-Stegun)
  const t=1/(1+0.2316419*Math.abs(x)),d=0.3989423*Math.exp(-x*x/2);
  const p=d*t*(0.3193815+t*(-0.3565638+t*(1.781478+t*(-1.821256+t*1.330274))));return x>0?1-p:p;}
function ratings(season){
  const r={};for(const a in season.teams)r[a]=MODEL.start;
  for(const g of season.games){ if(!g.completed)continue;
    const hfa=g.neutral?0:MODEL.hfa, d=r[g.home]+hfa-r[g.away];
    const exp=1/(1+Math.pow(10,-d/400)); const res=g.hs>g.as?1:g.hs<g.as?0:0.5;
    const mov=Math.abs(g.hs-g.as), mult=Math.log(mov+1)*2.2/((res===1?d:-d)*0.001+2.2);
    const delta=MODEL.K*(res===0.5?1:mult)*(res-exp); r[g.home]+=delta; r[g.away]-=delta; }
  return r;}
function gameProb(g,r){ // probability HOME wins, with label of source
  if(g.spread){ const homeLine=g.spread.fav===null?0:(g.spread.fav===g.home?-g.spread.pts:g.spread.pts);
    return {p:phi(-homeLine/MODEL.spreadSD),src:'spread',label:g.spread.details+' ('+(g.spread.provider||'ESPN')+')'};}
  const d=r[g.home]+(g.neutral?0:MODEL.hfa)-r[g.away];
  return {p:1/(1+Math.pow(10,-d/400)),src:'elo',label:'Elo model'};}
function baseRecords(season){
  const T={};for(const a in season.teams)T[a]={w:0,l:0,t:0,dw:0,dl:0,dt:0,cw:0,cl:0,ct:0};
  const h2h={};
  for(const g of season.games)if(g.completed)apply(T,h2h,season,g.home,g.away,g.hs>g.as?1:g.hs<g.as?0:0.5);
  return {T,h2h};}
function apply(T,h2h,season,h,a,res){
  const th=season.teams[h],ta=season.teams[a],div=th.div===ta.div,conf=th.conf===ta.conf;
  const add=(x,y,s)=>{const R=T[x];if(s===1){R.w++;if(div)R.dw++;if(conf)R.cw++;}else if(s===0){R.l++;if(div)R.dl++;if(conf)R.cl++;}else{R.t++;if(div)R.dt++;if(conf)R.ct++;}
    const k=x+'>'+y;h2h[k]=(h2h[k]||0)+s;h2h['#'+k]=(h2h['#'+k]||0)+1;};
  add(h,a,res);add(a,h,1-res);}
const pct=(w,l,t)=>(w+l+t)?(w+0.5*t)/(w+l+t):0.5;
function rank(list,T,h2h,rng,season){ // simplified NFL tiebreak (transitive, key-based): win% > H2H% among tied teams > div% (if all same div) > conf% > coin
  const key=a=>pct(T[a].w,T[a].l,T[a].t);
  const coin={};for(const a of list)coin[a]=rng();
  const s=list.slice().sort((x,y)=>key(y)-key(x)||(x<y?-1:1));const out=[];
  for(let i=0;i<s.length;){let j=i+1;while(j<s.length&&Math.abs(key(s[j])-key(s[i]))<1e-9)j++;
    const grp=s.slice(i,j);
    if(grp.length>1){const sameDiv=grp.every(a=>season.teams[a].div===season.teams[grp[0]].div);
      const k={};for(const a of grp){let pts=0,g=0;for(const b of grp)if(b!==a){pts+=h2h[a+'>'+b]||0;g+=h2h['#'+a+'>'+b]||0;}
        k[a]=[g?pts/g:0.5,sameDiv?pct(T[a].dw,T[a].dl,T[a].dt):0,pct(T[a].cw,T[a].cl,T[a].ct),coin[a]];}
      grp.sort((x,y)=>{for(let q=0;q<4;q++){const d=k[y][q]-k[x][q];if(Math.abs(d)>1e-12)return d;}return x<y?-1:1;});}
    out.push(...grp);i=j;}
  return out;}
function simulate(season,opts){
  opts=opts||{};const N=opts.sims||MODEL.sims,rng=mulberry32(opts.seed==null?MODEL.seed:opts.seed),forced=opts.forced||{},focus=season.focus||'BAL';
  const r=ratings(season),base=baseRecords(season);
  const rem=season.games.filter(g=>!g.completed).map(g=>Object.assign({},g,{prob:gameProb(g,r)}));
  const fconf=season.teams[focus].conf,fdiv=season.teams[focus].div;
  const confTeams=Object.keys(season.teams).filter(a=>season.teams[a].conf===fconf);
  const divs={};for(const a of confTeams)(divs[season.teams[a].div]=divs[season.teams[a].div]||[]).push(a);
  const divTeams=divs[fdiv];
  const out={N,seed:opts.seed==null?MODEL.seed:opts.seed,winDist:new Array(18).fill(0),playoff:0,div:0,bye:0,seedDist:new Array(8).fill(0),
    byWins:{},divTable:{},games:{}};
  for(const a of divTeams)out.divTable[a]={wins:0,div:0,playoff:0};
  const gs={};for(const g of rem)gs[g.id]={hw:0,hwP:0,aw:0,awP:0};
  const res=new Uint8Array(rem.length);
  for(let s=0;s<N;s++){
    const T={};for(const a in base.T)T[a]=Object.assign({},base.T[a]);const h2h=Object.assign({},base.h2h);
    for(let i=0;i<rem.length;i++){const g=rem[i];let hw;
      if(forced[g.id]){const fw=forced[g.id];hw=(fw==='W')===(g.home===focus);} // forced result from focus team's view
      else hw=rng()<g.prob.p;
      res[i]=hw?1:0;apply(T,h2h,season,g.home,g.away,hw?1:0);}
    const winners=[];
    for(const d in divs){const rk=rank(divs[d],T,h2h,rng,season);winners.push(rk[0]);if(d===fdiv)for(const a of divTeams){out.divTable[a].wins+=T[a].w+0.5*T[a].t;if(rk[0]===a)out.divTable[a].div++;}}
    const dw=rank(winners,T,h2h,rng,season);
    const wc=rank(confTeams.filter(a=>!winners.includes(a)),T,h2h,rng,season).slice(0,3);
    const seeds=dw.concat(wc);const fs=seeds.indexOf(focus)+1;
    for(const a of divTeams)if(seeds.includes(a))out.divTable[a].playoff++;
    const W=T[focus].w;out.winDist[Math.min(17,W)]++;
    const bw=out.byWins[W]||(out.byWins[W]={n:0,p:0,d:0});bw.n++;
    const inP=fs>0;if(inP){out.playoff++;bw.p++;out.seedDist[fs]++;}if(fs===1)out.bye++;if(winners.includes(focus)){out.div++;bw.d++;}
    for(let i=0;i<rem.length;i++){const G=gs[rem[i].id];if(res[i]){G.hw++;if(inP)G.hwP++;}else{G.aw++;if(inP)G.awP++;}}
  }
  out.games=rem.map(g=>{const G=gs[g.id];return {id:g.id,week:g.week,home:g.home,away:g.away,prob:g.prob,focusGame:g.home===focus||g.away===focus,
    pIfHome:G.hw?G.hwP/G.hw:null,pIfAway:G.aw?G.awP/G.aw:null,nHome:G.hw,nAway:G.aw};});
  out.ratings=r;out.model=MODEL;
  const ex=out.winDist.reduce((s,c,i)=>s+c*i,0)/N;out.expWins=ex;
  return out;}
const api={MODEL,mulberry32,phi,ratings,gameProb,baseRecords,simulate,pct};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.RavensSim=api;
})(this);
