from pathlib import Path
import json,base64,re
P=Path(__file__).resolve().parent.parent
p=P/'index.html';s=p.read_text();m=re.search(r'var D="([^"]+)"',s);d=base64.b64decode(m.group(1)).decode()
pack=json.loads((P/'content/world-expansion-20261017.json').read_text())
assert 'const WORLD_EXPANSION' not in d
start=d.index('const WORLDS =');end=d.index('const BADGES',start)
(P/'content/baseline-worlds.tmp.js').write_text(d[start:end])
insert='''\n/* World expansion 2026-10-17: append stable IDs; never replace existing progress keys. */\nconst WORLD_EXPANSION = PACK;\nWORLD_EXPANSION.forEach(entry=>{\n  const world = WORLDS.find(w=>w.id===entry.worldId);\n  if(!world) throw new Error('Unknown expansion world');\n  if(!world.stories.some(st=>st.id===entry.story.id)) world.stories.push(entry.story);\n  entry.vocab.forEach(word=>{if(!world.vocab.some(v=>v.en===word.en))world.vocab.push(word);});\n  entry.story.nodes.filter(n=>n.t==='fill').forEach(n=>{if(!world.phrases.some(p=>p.q===n.q))world.phrases.push({q:n.q,a:n.a,opts:n.opts});});\n  entry.story.nodes.filter(n=>n.t==='build').forEach(n=>{if(!world.unscramble.some(p=>p.answer===n.answer))world.unscramble.push({words:n.words,answer:n.answer,es:n.es});});\n  world.brunoIntro=world.brunoIntro.replace(/\\b\\d+ aventuras\\b/,world.stories.length+' aventuras')+'<br><br><b>Novedad '+entry.story.cefr+':</b> '+entry.story.title+'. '+entry.story.sub;\n});\nfunction openNewWorldStory(worldId,storyId){\n const index=WORLDS.findIndex(w=>w.id===worldId);\n if(index<0)return;\n if(!worldUnlocked(index)){previewWorld(index);return;}\n openWorld(index);startStory(storyId);\n}\n\n'''.replace('PACK',json.dumps(pack,ensure_ascii=False))
d=d[:end]+insert+d[end:]
old='''      <button class="weekly-update-card" onclick="openWorld(${WORLDS.findIndex(w=>w.id==='airport')})">
        <span>Nuevo esta semana</span>
        <b>Airport World creció</b>
        <small>5 capítulos nuevos para check-in, cambios de puerta, abordaje, equipaje de mano y llegada.</small>
      </button>'''
new='''      <div class="sectitle mt">Nuevas aventuras · B1 → C1</div>
      ${WORLD_EXPANSION.map(entry=>`<button class="weekly-update-card" onclick="openNewWorldStory('${entry.worldId}','${entry.story.id}')"><span>Nuevo · ${entry.story.cefr} · ${WORLDS.find(w=>w.id===entry.worldId).name} World</span><b>${entry.story.emoji} ${entry.story.title}</b><small>${entry.story.sub}</small></button>`).join('')}'''
assert old in d;d=d.replace(old,new,1)
old='<div class="chapter-label">Capítulo ${idx + 1} de ${CW.stories.length}</div>'
new='<div class="chapter-label">${st.cefr ? `${!rec ? "Nuevo · " : ""}${st.cefr} · ` : ""}Capítulo ${idx + 1} de ${CW.stories.length}</div>'
assert old in d;d=d.replace(old,new,1)
start=d.index("document.getElementById('bosscard').innerHTML");end=d.index('\n}',start)
block=d[start:end].replace("${allDone?'':'locked'}","${(allDone || bossDone)?'':'locked'}").replace('${allDone?`onclick="startBoss()"`:', '${(allDone || bossDone)?`onclick="startBoss()"`:').replace("${allDone ? 'Desafío disponible.","${(allDone || bossDone) ? 'Desafío disponible.")
d=d[:start]+block+d[end:]
d=d.replace("office:{cefr:'B1', label:'Profesional'","office:{cefr:'B1-B2', label:'Profesional'").replace("technology:{cefr:'B1-B2', label:'Profesional digital'","technology:{cefr:'B1-C1', label:'Profesional digital'")
d=d.replace("id:'professional', icon:'💼', name:'Profesional', cefr:'B1-B2'","id:'professional', icon:'💼', name:'Profesional', cefr:'B1-C1'")
s=s[:m.start(1)]+base64.b64encode(d.encode()).decode()+s[m.end(1):]
s=s.replace('content="1.0.0">','content="1.0.0">\n<meta name="wordyssey-content-version" content="1.1.0">',1)
s=s.replace('Todos los derechos reservados</div>','Todos los derechos reservados · v1.1.0</div>',1)
p.write_text(s)
(P/'content/check-expanded.tmp.js').write_text(d)
(P/'content/expanded-worlds.tmp.js').write_text(d[d.index('const WORLDS ='):d.index('const BADGES')])
print('Built expanded primary app; alternate entry point unchanged.')
