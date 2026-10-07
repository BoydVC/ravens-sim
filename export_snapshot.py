import json
h=open('web/index.html').read(); js=open('web/sim.js').read(); data=open('data/season.json').read()
h=h.replace('<script src="sim.js"></script>','<script>window.SEASON='+data.replace('</','<\\/')+';</script>\n<script>'+js+'</script>')
open('dist/ravens-sim-snapshot.html','w').write(h); print(len(h))
