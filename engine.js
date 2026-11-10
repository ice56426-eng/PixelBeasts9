// engine.js — overworld: 8 areas, trainers, gyms + badges, fast-travel map, objective arrow, saving, input.
import {mk,SPECIES,ready,drawSprite,gainExp,expToNext} from './beasts.js';
import {battle,press as menuPress,active,pick,browse} from './battle.js';
import {openDev,_test} from './dev.js';
import {openBox,teamMenu} from './box.js';
const $=s=>document.querySelector(s),cv=$('#world'),x=cv.getContext('2d'),T=16,VW=15,VH=10,MW=32,MH=24;
const game={team:[],items:{potion:8,ball:30,candy:0},box:[],safe:{area:0,x:4,y:5},badges:[],beat:[],seen:[],e4:0,legCaught:[],visited:[0],area:0,noclip:false,steps:0};
// Each area: name, beast types found there, [floor colour, grass colour], gym [leader, badge]
const AREAS=[
 {n:'Sprout Town',l:['Puffling','Leafkit','Gustling','Goblit','Luminel'],t:['Normal','Grass'],c:['#6b8f4e','#2f7d3a']},
 {n:'Leaf Woods',l:['Bloomite','Sproutail','Rootlet','Piklit','Florbit','Venkit'],t:['Grass'],c:['#4f7a3a','#1f6a2a'],g:['Fern','Leaf Badge']},
 {n:'Ember Ridge',l:['Emberpup','Cinderat','Flickit','Charmin','Emberkit'],t:['Fire'],c:['#8a5a3a','#b04a2a'],g:['Blaze','Ember Badge']},
 {n:'Tide Harbor',l:['Bubblfin','Dewlet','Finlet','Puddleap','Aquapup'],t:['Water'],c:['#7a9a8a','#2a6aa0'],g:['Marina','Tide Badge']},
 {n:'Volt Valley',l:['Sparkit','Zaplet','Voltkit','Zephykit','Breezlet'],t:['Electric'],c:['#8a8a4a','#b8a020'],g:['Volta','Volt Badge']},
 {n:'Stone Peaks',l:['Pebblet','Stonlet','Terrakin','Gritlet','Dritch'],leg:'Earth Matter',t:['Rock','Ground'],c:['#8a7a68','#6a5a40'],g:['Granite','Stone Badge']},
 {n:'Shadow Hollow',l:['Shadekit','Sombrat','Nightlit','Psylit','Muckpup'],leg:'Void Matter',t:['Dark','Ghost'],c:['#4a3a58','#2a1a40'],g:['Umbra','Shadow Badge']},
 {n:"Dragon's Crown",l:['Niblet','Iglit','Frostkit','Shellbit','Magmite'],leg:'Dragonling',t:['Dragon','Ice'],c:['#5a5a7a','#3a3a8a'],g:['Drake','Dragon Badge']},
 {n:'The Menagerie',l:[],t:[],c:['#5a3a2a','#8a3a1a'],all:1,boss:1,g:['Prism','Prism Badge']}, // final gym: every beast (not Aeternum) roams its grass at random levels
 {n:'Elite Hall',l:[],t:[],c:['#4a4a6a','#4a4a6a'],hall:1},
 {n:"Aeternum's Sanctum",l:[],t:[],c:['#1a1a2a','#1a1a2a'],secret:1}];
// Layout per area: w/e = y of the west/east door, g1/g2 = y of the gap in the two tree walls (x=11, x=21). Doors and gaps differ so no area is a straight line.
const W=[0,4,19,8,16,6,18,10,3,12,12],E=[18,5,17,4,19,8,15,14,20,0,0],G1=[6,18,5,17,7,16,4,19,10,0,0],G2=[14,6,16,5,15,19,6,17,5,0,0];
AREAS.forEach((a,i)=>Object.assign(a,{w:W[i],e:E[i],g1:G1[i],g2:G2[i]}));
const ALLLINES=Object.values(SPECIES).filter(s=>s.stage===0&&!s.omni).map(s=>s.name);
AREAS.find(a=>a.all).l=ALLLINES.filter(l=>!SPECIES[l].legend); // trainers in the Menagerie use any (non-legend) line
const pickAll=()=>{const c=ALLLINES.filter(l=>!(SPECIES[l].legend&&game.legCaught.includes(l)));return c[Math.random()*c.length|0]};
const ELITE=[['Ignis',[2,1]],['Marlow',[3,4]],['Terra',[5,0]],['Nyx',[6,7]]]; // Elite Four: name + areas whose beasts they use
const ALL_BADGES=AREAS.filter(a=>a.g).map(a=>a.g[1]);
const NAMES=['Rookie Sam','Hiker Joe','Lass Mia','Ranger Kit','Scout Dee','Angler Ray','Camper Lou','Ace Nina','Biker Hank','Sage Ora','Cadet Bo','Racer Zed','Rancher Pat','Tamer Ivy','Guard Tom','Mystic Jun'];
// Gym 8 boss (Prism): six different types, every beast carries status-inflicting moves (burn/poison/paralysis) and boosted stats.
const BOSS=[['Venefyx',62,['Sludge Bomb','Poison Jab','Thunderbolt','Heat Wave']],['Volcannon',63,['Flare Blitz','Heat Wave','Volt Tackle','Earthquake']],['Elektrike',64,['Thunderbolt','Discharge','Fire Spin','Ice Beam']],
 ['Nepturtle',65,['Hydro Pump','Blizzard','Gunk Shot','Thunderbolt']],['Psychelix',66,['Psychic','Dark Pulse','Sludge Bomb','Flare Blitz']],['Shardmaw',68,['Draco Meteor','Crunch','Heat Wave','Volt Tackle']]];
const boost=b=>{for(const k of ['atk','def','spa','spd','spe'])b[k]=Math.round(b[k]*1.2);b.max=Math.round(b.max*1.3);b.hp=b.max};
const habitat=n=>{const ln=SPECIES[n].line,a=AREAS.find(a=>a.l.includes(ln)),r=AREAS.find(a=>a.leg===ln);return a?a.n:r?`Rare in ${r.n}`:ln==='Aeternum'?'Secret — not found in the wild':'Unknown'};
let AEC=null;const aeCanvas=()=>AEC||(AEC=(()=>{const c=document.createElement('canvas');c.width=c.height=32;drawSprite(c,'Aeternum');return c})());
const BC={},beastCanvas=n=>BC[n]||(BC[n]=(()=>{const c=document.createElement('canvas');c.width=c.height=T;drawSprite(c,n);return c})());
const lvOf=i=>4+i*6,heal=b=>{b.hp=b.max;b.status=null};
const hash=(a,b)=>Math.abs(Math.sin(a*12.9898+b*78.233)*43758.5453)%1;
const stageOf=lv=>lv>=34?2:lv>=16?1:0;
// Area exclusives: every beast line lives in exactly one area (A.l, rarer toward the end); A.leg = legendary line that rarely appears there.
const lineAt=(ln,lv)=>{let s=SPECIES[ln];for(let k=stageOf(lv);k>0&&s.next;k--)s=SPECIES[s.next];return s.name};
const WT=[5,4,3,2,2,1];
const pickLine=A=>{let r=Math.random()*A.l.reduce((s,_,i)=>s+WT[i],0);for(let i=0;i<A.l.length;i++){r-=WT[i];if(r<0)return A.l[i]}return A.l[0]};
const spec=(A,lv,seed)=>lineAt(A.l[seed%A.l.length],lv);
const seen=n=>{if(!game.seen.includes(n))game.seen.push(n)};
let map=[],npcs=[];const p={x:4,y:5,face:'down'};let busy=true,held=new Set(),last=0,taps=0,tapT=0;
function build(i){const A=AREAS[i],base=lvOf(i);
  map=Array.from({length:MH},(_,j)=>Array.from({length:MW},(_,k)=>{
    if(k===0||j===0||k===MW-1||j===MH-1)return 1;
    if(Math.sin(k*.45+i)*Math.cos(j*.38+i*2)+Math.sin((k+j)*.21+i)>.3)return 2;return hash(k+i*31,j)<.07?1:0}));
  const clear=(cx,cy,r)=>{for(let j=cy-r;j<=cy+r;j++)for(let k=cx-r;k<=cx+r;k++)if(k>0&&j>0&&k<MW-1&&j<MH-1)map[j][k]=0};
  npcs=[];
  if(A.secret){map=map.map((r,j)=>r.map((_,k)=>k===0||j===0||k===MW-1||j===MH-1?1:0));map[12][0]=7;clear(2,12,1); // no trainers, no wild beasts: only Aeternum
    if(![...game.team,...game.box].some(b=>b.omni))npcs.push({x:16,y:10,id:'aeternum',aeternum:1,name:'Aeternum'});return}
  if(A.hall){map=map.map((r,j)=>r.map((_,k)=>k===0||j===0||k===MW-1||j===MH-1?1:0));map[A.w][0]=6;clear(2,A.w,1);clear(4,20,1);map[20][4]=3;
    ELITE.forEach((el,k)=>{const nx=8+k*5;clear(nx,5,1);npcs.push({x:nx,y:5,id:'e4:'+k,e4:1,leader:1,name:'Elite '+el[0]})});return}
  for(let j=1;j<MH-1;j++){map[j][11]=j===A.g1||j===A.g1+1?0:1;map[j][21]=j===A.g2||j===A.g2+1?0:1} // zig-zag walls
  clear(4,4,1);map[4][4]=3;                // red healing pad
  if(i<AREAS.length-1){map[A.e][MW-1]=6;clear(MW-3,A.e,1)}if(i>0){map[A.w][0]=6;clear(2,A.w,1)} // doors (yellow arrows)
  for(let j=0;j<2;j++){const [nx,ny]=j?[23,A.g2]:[9,A.g1];clear(nx,ny,1); // trainers guard the gaps
    npcs.push({x:nx,y:ny,id:`${i}:${j}`,name:NAMES[(i*2+j)%NAMES.length],team:[0,1].map(m=>[spec(A,base-1+m,i*5+j*3+m*7),base-1+m])})}
  if(i===0){clear(2,20,1);map[20][0]=7} // secret wall in the border: opens only after the Elite Four is beaten
  if(A.g){clear(15,5,3);for(let j=3;j<=5;j++)for(let k=14;k<=16;k++)map[j][k]=5;
    npcs.push({x:15,y:6,id:`${i}:g`,leader:1,name:'Leader '+A.g[0],boss:A.boss?1:0,team:A.boss?BOSS:[0,1,2].map(m=>{const lv=base+3+(m*1.5|0);return [spec(A,lv,i*3+m*5),lv]})})}}
const save=()=>{game.team.forEach(b=>seen(b.name));try{localStorage.setItem(KEY,JSON.stringify({team:game.team,v:2,items:game.items,box:game.box,safe:game.safe,noclip:game.noclip,badges:game.badges,e4:game.e4,legCaught:game.legCaught,beat:game.beat,seen:game.seen,visited:game.visited,area:game.area,x:p.x,y:p.y}))}catch(e){}};
const KEY='pixelbeasts.save.v1';
function load(){try{const s=JSON.parse(localStorage.getItem(KEY));s.team=s.team.filter(b=>SPECIES[b.name]);return s.team.length?s:null}catch(e){return null}}
const dlg=$('#dlg');let toastT;
function toast(t){const el=$('#toast');el.textContent=t;el.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>el.hidden=true,1700)}
async function say(t){dlg.textContent=t;dlg.hidden=false;await new Promise(r=>setTimeout(r,600+t.length*40));dlg.hidden=true}
// Lose a battle: heal everyone and return to the last Hospital Center you used.
async function respawn(){game.team.forEach(heal);game.box.forEach(heal);const s=game.safe;await go(s.area,s.x,s.y)}
async function go(i,px,py){game.area=i;build(i);p.x=px;p.y=py;if(!game.visited.includes(i))game.visited.push(i);save();await say(AREAS[i].n)}
const npcAt=(a,b)=>npcs.find(n=>n.x===a&&n.y===b);
const pass=(a,b)=>a>=0&&b>=0&&a<MW&&b<MH&&!npcAt(a,b)&&(game.noclip||(map[b][a]!==1&&map[b][a]!==5&&(map[b][a]!==7||game.e4>=1||game.area===10)));
function step(dx,dy){p.face=dx<0?'left':dx>0?'right':dy<0?'up':'down';const nx=p.x+dx,ny=p.y+dy;if(!pass(nx,ny))return;
  const need={8:7,9:8}[game.area+1];if(map[ny]?.[nx]===6&&nx>MW/2&&need&&game.badges.length<need){busy=true;say(`The gate to ${AREAS[game.area+1].n} is sealed. You need ${need} badges.`).then(()=>busy=false);return}
  p.x=nx;p.y=ny;const t=map[ny]?.[nx];if(t===3){game.team.forEach(heal);game.box.forEach(heal);game.safe={area:game.area,x:p.x,y:p.y};save();busy=true;say('Hospital Center: your beasts are healed. This is now your safe point.').then(()=>busy=false);return}save();
  if(t===6){busy=true;const e=nx>MW/2,ni=e?game.area+1:game.area-1;go(ni,e?1:MW-2,e?AREAS[ni].w:AREAS[ni].e).then(()=>busy=false);return}
  if(t===7){busy=true;const to=game.area===0?[10,2,12]:[0,1,20];go(...to).then(()=>busy=false);return}
  // Trainers lock you into a battle when you come within 2 tiles
  const sn=npcs.find(n=>n.team&&!n.e4&&!game.beat.includes(n.id)&&Math.max(Math.abs(n.x-p.x),Math.abs(n.y-p.y))<=2);
  if(sn&&game.team.some(b=>b.hp>0)){busy=true;held.clear();say(`! ${sn.name} spotted you!`).then(()=>fight(sn)).then(()=>busy=false);return}
  if(Math.random()<.1&&game.area!==10){const r=Math.random(),it=r<.1?'candy':r<.55?'potion':'ball'; // 1 in 10 steps: Rare Candy 10%, Potion 45%, Ball 45%
    game.items[it]=(game.items[it]|0)+1;toast(`Found ${{candy:'a Rare Candy',potion:'a Potion',ball:'a Poke Ball'}[it]}!`);save()}
  if(t===2&&++game.steps>3&&Math.random()<.14){game.steps=0;busy=true;encounter().then(()=>busy=false)}}
async function encounter(){const A=AREAS[game.area],lv=A.all?5+(Math.random()*66|0):Math.max(2,lvOf(game.area)-2+(Math.random()*5|0)),nm=A.all?lineAt(pickAll(),lv):A.leg&&!game.legCaught.includes(A.leg)&&Math.random()<.04?lineAt(A.leg,lv):lineAt(pickLine(A),lv);seen(nm);
  const r=await battle(game,mk(nm,lv),true);
  if(r==='lose'){await respawn()}save()}
async function fight(n){await say(`${n.name}: Let's battle!`);
  for(const [s,lv,mv] of n.team){seen(s);const b=mk(s,lv);if(mv)b.moves=[...mv];if(n.boss)boost(b);const r=await battle(game,b,false);if(r==='lose'){await respawn();return}}
  game.beat.push(n.id);
  if(n.leader){const b=AREAS[game.area].g[1];if(!game.badges.includes(b))game.badges.push(b);game.items.ball+=5;await say(`${n.name}: You earned the ${b}! (+5 balls)`)}
  else{game.items.potion+=2;await say(`${n.name}: You win! (+2 potions)`)}save()}
async function interact(){const fx=p.x+(p.face==='left'?-1:p.face==='right'?1:0),fy=p.y+(p.face==='up'?-1:p.face==='down'?1:0),n=npcAt(fx,fy);if(!n)return;
  busy=true;held.clear();
  if(n.beast){seen(n.name);await browse([n.name],'The Menagerie',()=>_test.beastInfo(n.name,{habitat}));busy=false;return}
  if(n.aeternum){await say('A tremendous presence... AETERNUM, Lv100. Defeat it, then catch it!');
    const r=await battle(game,mk('Aeternum',100),true);if(r==='lose')await respawn();else if(r==='caught'){seen('Aeternum');npcs=npcs.filter(q=>!q.aeternum);await say('Aeternum is yours.')}save();busy=false;return}
  if(n.e4){await gauntlet();busy=false;return}
  if(game.beat.includes(n.id))await say(n.leader?`${n.name}: You already hold the ${AREAS[game.area].g[1]}.`:`${n.name}: Good battle! Keep training.`);
  else if(game.team.some(b=>b.hp>0))await fight(n);else await say('Your beasts need healing first.');
  busy=false}
// Elite Four: four trainers in a row, no restarts mid-way. First clear: aces Lv75. Later clears: aces Lv100. Every 3rd clear a legend (Lv100) appears; only one of each can be caught.
const e4team=(k,ace)=>{const ls=ELITE[k][1].flatMap(a=>AREAS[a].l);return [0,1,2,3,4].map(m=>{const lv=ace-12+m*3;return [lineAt(ls[(m*2+k)%ls.length],lv),lv]})};
async function gauntlet(){const ace=game.e4<1?75:100;
  if(!game.team.some(b=>b.hp>0)){await say('Heal your beasts at the red pad first.');return}
  await say(`Elite Four gauntlet! Beat all 4 in a row. Their aces are Lv${ace}.`);
  for(let k=0;k<4;k++){const nm='Elite '+ELITE[k][0];await say(`${nm}: Prove yourself!`);
    for(const [s,lv] of e4team(k,ace)){seen(s);const r=await battle(game,mk(s,lv),false);
      if(r==='lose'){await respawn();await say('You lost! You must start over against the first Elite.');return}}
    if(k<3)await say(`${nm}: Well fought. The next Elite awaits.`)}
  game.e4++;game.items.potion+=10;game.items.ball+=10;
  await say(game.e4===1?'You beat the Elite Four! Next time their aces will be Lv100. (+10 potions, +10 balls)':`Elite Four cleared! Total clears: ${game.e4}. (+10 potions, +10 balls)`);
  if(game.e4%3===0)await legend();game.safe={area:0,x:4,y:5};await go(0,4,5);await say('You return to Sprout Town, where your journey began...');save()}
async function legend(){const L=['Dragonling','Void Matter','Earth Matter'].filter(l=>!game.legCaught.includes(l));if(!L.length)return;
  const nm=lineAt(L[((game.e4/3|0)-1)%L.length],100);seen(nm);await say(`A legendary presence fills the hall... ${nm} appears at Lv100!`);
  const r=await battle(game,mk(nm,100),true);if(r==='lose'){await respawn()}save()}
async function candy(b){if(b.lv>=100){await say('It cannot grow any higher.');return false}
  for(const ev of gainExp(b,expToNext(b))){if(ev.evolved)await say(`${ev.evolved[0]} evolved into ${ev.evolved[1]}!`);await say(`${b.name} grew to Lv${ev.lv}!`);
    for(const mv of ev.learn){if(b.moves.length<4){b.moves.push(mv);await say(`${b.name} learned ${mv}!`)}else{const i=await pick([...b.moves,'Skip'],`Learn ${mv}? Forget which?`);if(i>=0&&i<4)b.moves[i]=mv}}}
  return true}
async function bag(){while(true){const k=await pick([`Rare Candy x${game.items.candy|0}`,`Potion x${game.items.potion}`,`Poke Ball x${game.items.ball}`,'Back'],'BAG');if(k<0||k===3)return;
  if(k===2){await say('Poke Balls are thrown at wild beasts in battle.');continue}
  if((k===0?game.items.candy|0:game.items.potion)<1){await say('You have none.');continue}
  const j=await pick(game.team.map(b=>`${b.name} Lv${b.lv} ${Math.max(0,b.hp)}/${b.max}`),k===0?'Give Rare Candy to?':'Use Potion on?');if(j<0)continue;const b=game.team[j];
  if(k===0){if(await candy(b))game.items.candy--}else{if(b.hp>=b.max){await say('It would have no effect.');continue}b.hp=Math.min(b.max,b.hp+30);game.items.potion--;await say(`${b.name} recovered HP!`)}}}
async function pause(){busy=true;held.clear();
  while(true){const i=await pick(['Town Map','Team','Monster Box','Bag','Badges','Beast Dex','Close'],'MENU');if(i<0||i===6)break;
    if(i===5){const DA=AREAS.filter(a=>a.l.length&&!a.all),ai=await pick([...DA.map(a=>a.n),'Legends'],'Beast Dex — pick an area');if(ai>=0){const ls=ai<DA.length?DA[ai].l:['Dragonling','Void Matter','Earth Matter','Aeternum'],nm=ls.flatMap(l=>{const o=[];for(let s=SPECIES[l];s;s=SPECIES[s.next])o.push(s.name);return o});
      await pick(nm.map(n=>game.seen.includes(n)?n:'???'),`${ai<DA.length?DA[ai].n:'Legends'}: ${nm.filter(n=>game.seen.includes(n)).length}/${nm.length} found`)}}
    if(i===0){const vs=[...game.visited].sort((a,b)=>a-b),j=await pick(vs.map(v=>AREAS[v].n+(v===game.area?' (here)':'')),'Fast travel to?');if(j>=0&&vs[j]!==game.area){await go(vs[j],4,5);break}}
    if(i===1)await teamMenu(game,{say});
    if(i===2)await openBox(game,{say});
    if(i===3)await bag();
    if(i===4)await say(game.badges.length?`Badges (${game.badges.length}/8): ${game.badges.join(', ')}`:'No badges yet. Beat a gym leader!')}
  busy=false;save()}
// Objective arrow: points at the heal pad if hurt, else at the next gym (or the exit toward it).
// Next waypoint toward another area (through the wall gaps, then the door)
const padPos=()=>{for(let j=0;j<MH;j++)for(let k=0;k<MW;k++)if(map[j][k]===3)return[k,j];return[4,4]};
function nav(ga){const A=AREAS[game.area];if(A.hall||A.room||A.secret)return ga>game.area?[MW-1,A.e]:[0,A.w];
  if(ga>game.area){if(p.x<11)return[11,A.g1];if(p.x<21)return[21,A.g2];return[MW-1,A.e]}
  if(p.x>21)return[21,A.g2];if(p.x>11)return[11,A.g1];return[0,A.w]}
function hud(){const A=AREAS[game.area];let tx=null,ty=null,txt='Champion! Everything is yours.';
  const n=AREAS.findIndex(a=>a.g&&!game.badges.includes(a.g[1])),omni=[...game.team,...game.box].some(b=>b.omni),ga=n>=0?n:game.e4<1?9:!omni?0:-1;
  if(game.team.length&&game.team.every(b=>b.hp<b.max*.35)){[tx,ty]=padPos();txt='Heal at the Hospital Center'}
  else if(game.area===10){if(npcs.some(q=>q.aeternum)){tx=16;ty=10;txt='Face Aeternum'}else{tx=0;ty=12;txt='Head back through the wall'}}
  else if(ga>=0){if(ga===game.area){if(n>=0){const L=npcs.find(q=>q.leader&&!q.e4);tx=L?L.x:15;ty=L?L.y:6;txt=`Beat ${A.g[0]} at the gym`}else if(ga===9){tx=15;ty=5;txt='Challenge the Elite Four'}else{tx=0;ty=20;txt='That edge wall looks odd...'}}
    else{[tx,ty]=nav(ga);txt=n>=0?`Go ${ga>game.area?'east':'west'} to ${AREAS[ga].n}`:ga===9?'Head to the Elite Hall (east)':'Something feels odd back in Sprout Town...'}}
  const a=$('#arrow');a.style.visibility=tx==null?'hidden':'visible';if(tx!=null)a.style.transform=`rotate(${Math.atan2(ty-p.y,tx-p.x)*180/Math.PI}deg)`;
  const g=$('#goal');if(g.textContent!==txt)g.textContent=txt}
const TR=new Image(),VAR={};
const trReady=new Promise(r=>{TR.onload=r;TR.onerror=r;TR.src='trainer.png'});
function variant(f){const c=document.createElement('canvas');c.width=14;c.height=16;const g=c.getContext('2d');g.drawImage(TR,0,0);const d=g.getImageData(0,0,14,16),q=d.data;for(let i=0;i<q.length;i+=4)if(q[i+3])f(q,i);g.putImageData(d,0,0);return c}
const red=(q,i)=>q[i]>q[i+1]+50&&q[i]>q[i+2]+50;
function makeVariants(){try{VAR.me=variant(()=>{});VAR.blue=variant((q,i)=>{if(red(q,i)){const r=q[i];q[i]=q[i+2];q[i+2]=r}});
  VAR.gold=variant((q,i)=>{if(red(q,i)){q[i+1]=q[i]*.75|0;q[i+2]=0}});VAR.orange=variant((q,i)=>{if(red(q,i)){q[i+1]=q[i]*.5|0;q[i+2]=0}});VAR.gray=variant((q,i)=>{q[i]=q[i+1]=q[i+2]=(q[i]+q[i+1]+q[i+2])/3*.8|0})}catch(e){}}
function npcDraw(n,px,py){if(n.altar){if(game.badges.length<8)return;x.fillStyle='#e0b020';x.fillRect(px+2,py+2,12,12);x.fillStyle='#6a3a10';x.fillRect(px+6,py+6,4,4);return}
  if(n.beast){x.drawImage(beastCanvas(n.name),px,py);return}
  if(n.aeternum){x.drawImage(aeCanvas(),px-8,py-16);return}
  const v=VAR[game.beat.includes(n.id)?'gray':n.boss?'orange':n.leader?'gold':'blue'];if(v)x.drawImage(v,px+1,py-1)}
function render(){const A=AREAS[game.area],cx=Math.max(0,Math.min(MW-VW,p.x-7)),cy=Math.max(0,Math.min(MH-VH,p.y-4));
  for(let j=0;j<VH;j++)for(let i=0;i<VW;i++){const t=map[cy+j][cx+i],px=i*T,py=j*T;
    x.fillStyle=t===2?A.c[1]:t===3?'#c0392b':t===5?'#7a2a2a':t===6?'#d8b020':A.c[0];x.fillRect(px,py,T,T);
    if(t===2){x.fillStyle='#ffffff22';for(let k=0;k<3;k++)x.fillRect(px+2+k*5,py+4+(k%2)*5,2,6)}
    if(t===7&&game.area!==0){x.fillStyle='#d8b020';x.fillRect(px+4,py+7,8,2);x.fillRect(px+9,py+5,2,6)}
    if(t===1||(t===7&&game.area===0)){x.fillStyle='#14301c';x.fillRect(px+1,py+1,14,14);x.fillStyle='#2a5a2a';x.fillRect(px+3,py+3,10,6)}
    if(t===3){x.fillStyle='#fff';x.fillRect(px+6,py+3,4,10);x.fillRect(px+3,py+6,10,4)}
    if(t===5){x.fillStyle='#4a1818';x.fillRect(px,py,T,4)}
    if(t===6){x.fillStyle='#000';x.fillRect(px+4,py+7,8,2);x.fillRect(px+9,py+5,2,6)}}
  if(A.g){x.fillStyle='#fff';x.font='bold 7px monospace';x.fillText('GYM',(15-cx)*T-4,(4-cy)*T+11)}
  npcs.forEach(n=>npcDraw(n,(n.x-cx)*T,(n.y-cy)*T));
  if(VAR.me)x.drawImage(VAR.me,(p.x-cx)*T+1,(p.y-cy)*T-1)}
function loop(t){requestAnimationFrame(loop);
  if(!busy&&t-last>130){const d=[...held].find(k=>'updownleftright'.includes(k));if(d){last=t;step(d==='left'?-1:d==='right'?1:0,d==='up'?-1:d==='down'?1:0)}}
  if(game.team.length)hud();render()}
// Input: keyboard and touch share one handler.
const K={ArrowUp:'up',w:'up',ArrowDown:'down',s:'down',ArrowLeft:'left',a:'left',ArrowRight:'right',d:'right',z:'a',Enter:'a',x:'b',Escape:'b'};
const down=k=>{if(active()){menuPress(k);return}if(busy)return;
  if(k==='a'){const n=performance.now();taps=n-tapT<3000?taps+1:1;tapT=n;
    if(taps>=10){taps=0;busy=true;held.clear();openDev(game,{habitat,areas:AREAS.map(a=>a.n),badges:ALL_BADGES,warp:i=>go(i,4,5)}).then(()=>{busy=false;save()});return}
    interact();return}
  taps=0;if(k==='b'){pause();return}held.add(k)};
addEventListener('keydown',e=>{const k=K[e.key]||K[e.key.toLowerCase()];if(k){e.preventDefault();if(!e.repeat||active())down(k)}});
addEventListener('keyup',e=>{const k=K[e.key]||K[e.key.toLowerCase()];if(k)held.delete(k)});
document.querySelectorAll('#pad button').forEach(b=>{const k=b.dataset.k;
  b.addEventListener('pointerdown',e=>{e.preventDefault();down(k)});
  ['pointerup','pointerleave','pointercancel'].forEach(ev=>b.addEventListener(ev,()=>held.delete(k)))});
(async()=>{await ready;await trReady;makeVariants();const s=load();if(s&&!s.v){s.visited=(s.visited||[0]).filter(v=>v<8);if((s.area||0)>=8){s.area=7;s.x=4;s.y=5}if(s.safe&&s.safe.area>=8)s.safe={area:0,x:4,y:5}}
  if(s){Object.assign(game,{team:s.team,items:s.items,box:s.box||[],safe:s.safe||{area:0,x:4,y:5},noclip:!!s.noclip,badges:s.badges||[],e4:s.e4||0,legCaught:s.legCaught||[],beat:s.beat||[],seen:s.seen||[],visited:s.visited||[0],area:s.area||0});
    build(game.area);if(s.area!==undefined){p.x=s.x;p.y=s.y}else{p.x=4;p.y=5}
    const tl=map[p.y]?.[p.x];if(tl===undefined||tl===1||tl===5||npcAt(p.x,p.y)){p.x=4;p.y=5} // old saves: never spawn inside a wall
  }
  else{build(0);const names=['Leafkit','Emberpup','Bubblfin','Sparkit'];
    const i=await pick(names,'Welcome to Pixel Beasts! Choose your partner.');game.team.push(mk(names[i<0?0:i],5));save()}
  busy=false;requestAnimationFrame(loop)})();
