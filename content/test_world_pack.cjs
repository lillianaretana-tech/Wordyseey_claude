const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const cp=require('node:child_process');
function decoded(html){return Buffer.from(html.match(/var D="([^"]+)"/)[1],'base64').toString('utf8');}
function worldSource(d){return d.slice(d.indexOf('const WORLDS ='),d.indexOf('const BADGES'));}
const current=decoded(fs.readFileSync(__dirname+'/../index.html','utf8'));
const baseline=fs.existsSync(__dirname+'/baseline-worlds.tmp.js')?fs.readFileSync(__dirname+'/baseline-worlds.tmp.js','utf8'):worldSource(decoded(cp.execFileSync('git',['show','be13adf407ecf588e7fa85fcdf3c6b43ee8457de:index.html'],{cwd:__dirname,encoding:'utf8',maxBuffer:5000000})));
const expanded=worldSource(current);
function data(code){const c={};vm.createContext(c);vm.runInContext(code+'\nglobalThis.result=JSON.parse(JSON.stringify(WORLDS));',c);return c.result;}
const before=data(baseline),after=data(expanded),pack=JSON.parse(fs.readFileSync(__dirname+'/world-expansion-20261017.json'));
assert.equal(after.length,before.length);assert.equal(before.flatMap(w=>w.stories).length,255);assert.equal(after.flatMap(w=>w.stories).length,258);
const ids=before.flatMap(w=>w.stories.map(s=>s.id));const newIds=pack.map(x=>x.story.id);assert.equal(newIds.length,new Set(newIds).size);assert.ok(newIds.every(id=>!ids.includes(id))); 
for(const w of before){const current=after.find(x=>x.id===w.id);assert.equal(JSON.stringify(current.stories.slice(0,w.stories.length)),JSON.stringify(w.stories),'Original chapters changed in '+w.id);}
let questions=0;for(const e of pack){const st=after.find(w=>w.id===e.worldId).stories.find(s=>s.id===e.story.id);assert.ok(st);for(const n of st.nodes){assert.ok(['scene','decision','fill','build'].includes(n.t));if(n.t==='scene'){assert.ok(n.en&&n.es);}if(n.t==='decision'){questions++;assert.equal(n.opts.filter(o=>o.ok).length,1);assert.equal(new Set(n.opts.map(o=>o.x)).size,n.opts.length);assert.ok(n.opts.every(o=>o.fb));}if(n.t==='fill'){questions++;assert.equal(n.opts.filter(o=>o===n.a).length,1);assert.ok(n.fb);}if(n.t==='build'){questions++;assert.deepEqual([...n.words].sort(),n.answer.split(' ').sort());}}
}
const full=current;assert.ok(full.includes("${(allDone || bossDone)?'':'locked'}"),'Previously won bosses must stay accessible');assert.ok(full.includes('const WORLD_EXPANSION'));console.log('PASS: 255 original chapters preserved; 258 total; unique stable IDs; '+questions+' new exercises; valid answers/builds; historical boss access retained.');
