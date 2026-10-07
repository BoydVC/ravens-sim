import json, urllib.request, datetime, os
UA={'User-Agent':'Mozilla/5.0'}
man={}
def get(url,path):
    req=urllib.request.Request(url,headers=UA)
    data=urllib.request.urlopen(req,timeout=30).read()
    open(path,'wb').write(data)
    man[os.path.basename(path)]={'url':url,'fetchedAt':datetime.datetime.now().astimezone().isoformat(timespec='seconds')}
for w in range(1,19):
    get(f'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=2026&seasontype=2&week={w}&limit=50',f'data/raw/scoreboard_w{w:02d}.json')
get('https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/bal/schedule','data/raw/schedule_bal.json')
get('https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams?limit=40','data/raw/teams.json')
try: get('https://site.api.espn.com/apis/v2/sports/football/nfl/standings?season=2026','data/raw/standings.json')
except Exception as e: print('standings fail',e)
json.dump(man,open('data/raw/manifest.json','w'),indent=1)
print('ok',len(man))
