"""Builds data/season.json from saved ESPN raw files (no network)."""
import json, glob, datetime
man=json.load(open('data/raw/manifest.json'))
teamsraw=json.load(open('data/raw/teams.json'))['sports'][0]['leagues'][0]['teams']
teams={}
for t in teamsraw:
    t=t['team']; teams[t['abbreviation']]={'abbr':t['abbreviation'],'name':t['displayName'],'short':t.get('name',t['displayName']),'color':'#'+t.get('color','444444'),'alt':'#'+t.get('alternateColor','888888')}
sd=json.load(open('data/raw/standings_div.json'))
for c in sd['children']:
    for d in c['children']:
        for e in d['standings']['entries']:
            a=e['team']['abbreviation']; teams[a]['conf']=c['abbreviation']; teams[a]['div']=d['name']
games=[]
for f in sorted(glob.glob('data/raw/scoreboard_w*.json')):
    d=json.load(open(f))
    for e in d['events']:
        c=e['competitions'][0]
        h=[x for x in c['competitors'] if x['homeAway']=='home'][0]; a=[x for x in c['competitors'] if x['homeAway']=='away'][0]
        g={'id':e['id'],'week':e['week']['number'],'date':e['date'],'home':h['team']['abbreviation'],'away':a['team']['abbreviation'],
           'completed':bool(c['status']['type']['completed']),'status':c['status']['type']['shortDetail'],'neutral':bool(c.get('neutralSite'))}
        if g['completed']:
            g['hs']=int(h['score']); g['as']=int(a['score'])
        elif c.get('odds'):
            o=c['odds'][0]
            if o.get('spread') is not None and o.get('details') and o['details']!='EVEN':
                fav=o['details'].split()[0]; mag=abs(float(o['spread']))
                if fav in (g['home'],g['away']):
                    g['spread']={'fav':fav,'pts':mag,'details':o['details'],'provider':(o.get('provider') or {}).get('name'),
                                 'source':man[f.split('/')[-1]]['url'],'fetchedAt':man[f.split('/')[-1]]['fetchedAt']}
            elif o.get('details')=='EVEN':
                g['spread']={'fav':None,'pts':0,'details':'EVEN','provider':(o.get('provider') or {}).get('name'),'source':man[f.split('/')[-1]]['url'],'fetchedAt':man[f.split('/')[-1]]['fetchedAt']}
        games.append(g)
games.sort(key=lambda g:(g['week'],g['date'],g['id']))
out={'generatedAt':datetime.datetime.now().astimezone().isoformat(timespec='seconds'),'season':2026,'focus':'BAL','teams':teams,'games':games,
     'sources':man,'scoutSpread':json.load(open('../ravens-film-room/data/scout.json'))['odds']}
json.dump(out,open('data/season.json','w'),indent=1)
bal=[g for g in games if 'BAL' in (g['home'],g['away'])]
print(len(games),'games',sum(g['completed'] for g in games),'final;',sum('spread' in g for g in games),'with spreads; BAL games',len(bal))
for g in bal: print(g['week'],g['away'],'@',g['home'],g.get('hs'),g.get('as'),g.get('spread',{}).get('details'))
