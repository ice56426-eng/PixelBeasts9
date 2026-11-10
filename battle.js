// battle.js — turn-based 1v1 engine: speed/priority, accuracy, damage, STAB, type chart, status, weather, EXP, catching.
import {MOVES,eff,SPECIAL} from './moves.js';
import {mk,gainExp,drawSprite,SPECIES} from './beasts.js';
const $=s=>document.querySelector(s),sleep=t=>new Promise(r=>setTimeout(r,t));
let opts=[],cur=0,res=null,cols=2,view=null;
const msg=async t=>{$('#msg').textContent=t;await sleep(350+t.length*22)};
// Menu: 2-column list navigated with arrows, A selects, B cancels (-1).
function choose(list,title){return new Promise(r=>{opts=list;cur=0;res=r;if(title)$('#msg').textContent=title;draw()})}
function draw(){const m=$('#menu'),st=m.scrollTop;cols=$('#battle').classList.contains('plain')&&opts.length>14?3:2;m.style.gridTemplateColumns='1fr '.repeat(cols);
  m.innerHTML=opts.map((o,i)=>`<div class="${i===cur?'on':''}" data-i="${i}">${o}</div>`).join('');m.scrollTop=st;const el=m.querySelector('.on');
  if(el){if(el.offsetTop<m.scrollTop)m.scrollTop=el.offsetTop;else if(el.offsetTop+el.offsetHeight>m.scrollTop+m.clientHeight)m.scrollTop=el.offsetTop+el.offsetHeight-m.clientHeight}}
$('#menu').onclick=e=>{const i=e.target.dataset?.i;if(i!=null){cur=+i;press('a')}};
export function press(k){if(!opts.length)return;
  if(view){const n=opts.length;if(k==='up')cur=Math.max(0,cur-1);if(k==='down')cur=Math.min(n-1,cur+1);if(k==='left')cur=Math.max(0,cur-8);if(k==='right')cur=Math.min(n-1,cur+8);
    if(k==='a'||k==='b'){const r=res,v=k==='a'?cur:-1;opts=[];res=null;view=null;$('#viewer').hidden=true;r(v);return}vdraw();return}const n=opts.length;
  if(k==='left')cur=(cur+n-1)%n;if(k==='right')cur=(cur+1)%n;if(k==='up')cur=Math.max(0,cur-cols);if(k==='down')cur=Math.min(n-1,cur+cols);
  if(k==='a'||k==='b'){const r=res,v=k==='a'?cur:-1;opts=[];res=null;$('#menu').innerHTML='';r(v);return}draw()}
// Full-width browser: big readable list on the left, detail panel (info(i) returns HTML) on the right. <canvas data-s="Name"> tags get that beast's sprite.
function viewerEl(){let v=$('#viewer');if(!v){v=document.createElement('div');v.id='viewer';
  v.innerHTML='<div id="vt"></div><div id="vb"><div id="vl"></div><div id="vi"></div></div><div id="vf"><button id="vback">BACK</button><button id="vok">SELECT</button></div>';
  document.body.appendChild(v);$('#vl').onclick=e=>{const i=e.target.dataset?.i;if(i!=null){cur=+i;vdraw()}};$('#vok').onclick=()=>press('a');$('#vback').onclick=()=>press('b')}return v}
function vdraw(){const v=viewerEl(),l=$('#vl'),st=l.scrollTop;v.hidden=false;
  v.style.height=Math.max(280,($('#pad').getBoundingClientRect().top-6))+'px';
  $('#vt').textContent=`${view.title}  (${cur+1}/${opts.length})`;
  l.innerHTML=opts.map((o,i)=>`<div class="${i===cur?'on':''}" data-i="${i}">${o}</div>`).join('');l.scrollTop=st;
  const el=l.querySelector('.on');if(el){if(el.offsetTop<l.scrollTop)l.scrollTop=el.offsetTop;else if(el.offsetTop+el.offsetHeight>l.scrollTop+l.clientHeight)l.scrollTop=el.offsetTop+el.offsetHeight-l.clientHeight}
  const vi=$('#vi');vi.innerHTML=view.info(cur);vi.querySelectorAll('canvas[data-s]').forEach(c=>drawSprite(c,c.dataset.s))}
export function browse(list,title,info){return new Promise(r=>{opts=list;cur=0;res=r;view={title,info};vdraw()})}
export const active=()=>opts.length>0;
// Plain full-screen list (used for menus, dev lists, fast travel)
export async function pick(list,title){const B=$('#battle');B.hidden=false;B.classList.add('plain');const i=await choose(list,title);B.classList.remove('plain');B.hidden=true;return i}
function side(id,b){const e=$(id);e.querySelector('b').textContent=`${b.name} Lv${b.lv}${b.status?' ['+b.status+']':''}`;
  e.querySelector('i').textContent=b.types.join('/')+(id==='#me'?`  ${Math.max(0,b.hp)}/${b.max}`:'');
  e.querySelector('u').style.width=Math.max(0,100*b.hp/b.max)+'%';
  const c=e.querySelector('canvas');if(c.dataset.n!==b.name){c.dataset.n=b.name;drawSprite(c,b.name)}}
const stage=(a,d)=>{side('#me',a);side('#foe',d)};
// Returns 'win' | 'lose' | 'run' | 'caught'
export async function battle(game,foe,wild=true){
  $('#battle').hidden=false;let me=game.team.find(b=>b.hp>0),W={w:null,t:0},over=null;
  const show=()=>stage(me,foe);show();await msg(wild?`A wild ${foe.name} appeared!`:`Trainer sends ${foe.name}!`);
  const mod=(a,d,m,e)=>{const sp=SPECIAL.has(m.t),A=sp?a.spa:a.atk,D=sp?d.spd:d.def;
    let dm=((2*a.lv/5+2)*m.p*(A*(a.status==='brn'&&!sp?.5:1))/D/50+2);
    if(a.omni||a.types.includes(m.t))dm*=1.5;dm*=e*(.85+Math.random()*.15);
    if(W.w==='rain')dm*=m.t==='Water'?1.5:m.t==='Fire'?.5:1;if(W.w==='sun')dm*=m.t==='Fire'?1.5:m.t==='Water'?.5:1;return Math.max(1,Math.floor(dm))};
  async function use(a,d,name){if(a.hp<=0||over)return;
    if(a.status==='par'&&Math.random()<.25){await msg(`${a.name} is paralyzed and can't move!`);return}
    const m=MOVES[name];await msg(`${a.name} used ${name}!`);
    if(m.fx==='protect'){a.prot=1;return}
    if(m.fx==='rain'||m.fx==='sun'){W={w:m.fx,t:5};await msg(m.fx==='rain'?'It started to rain!':'The sunlight is strong!');return}
    if(m.fx==='flee'){if(wild){over='run';await msg(`${d.name} was blown away!`)}return}
    if(m.fx==='heal'){a.hp=Math.min(a.max,a.hp+a.max/2|0);show();return}
    if(!m.p){await msg('But nothing happened!');return}
    if(d.prot){d.prot=0;await msg(`${d.name} protected itself!`);return}
    if(Math.random()*100>m.acc&&!a.omni){await msg('The attack missed!');return}
    const e=d.omni?1:eff(m.t,d.types);if(!e){await msg(`It doesn't affect ${d.name}...`);return}
    d.hp-=mod(a,d,m,e);if(d.omni)d.hp=Math.max(1,d.hp);if(d.omni&&d.hp===1&&d===foe&&!d.yld){d.yld=1;show();await msg('Aeternum is spent! Throw a ball now!')} // Aeternum can never be knocked out
    if(m.fx==='faint')a.hp=0;show();
    if(e>1)await msg("It's super effective!");else if(e<1)await msg("It's not very effective...");
    if(m.st&&!d.status&&!d.omni&&d.hp>0&&Math.random()<.2){d.status=m.st;show();await msg(`${d.name} is ${{brn:'burned',psn:'poisoned',par:'paralyzed'}[m.st]}!`)}}
  async function reward(){const xp=foe.lv*9+15;await msg(`${me.name} gained ${xp} EXP!`);
    for(const ev of gainExp(me,xp)){show();if(ev.evolved)await msg(`${ev.evolved[0]} evolved into ${ev.evolved[1]}!`);await msg(`${me.name} grew to Lv${ev.lv}!`);
      for(const mv of ev.learn){if(me.moves.length<4){me.moves.push(mv);await msg(`${me.name} learned ${mv}!`)}
        else{const i=await choose([...me.moves,'Skip'],`Learn ${mv}? Forget which?`);if(i>=0&&i<4){await msg(`Forgot ${me.moves[i]}, learned ${mv}!`);me.moves[i]=mv}}}show()}}
  while(true){
    const c=await choose(['Fight','Beasts','Items','Run'],'What will you do?');let act=null;
    if(c===0){const i=await choose(me.moves.map(n=>`${n} ${MOVES[n].t.slice(0,3)} ${MOVES[n].p}`),'Choose a move');if(i<0)continue;act={mv:me.moves[i]}}
    else if(c===1){const i=await choose(game.team.map(b=>`${b.name} ${Math.max(0,b.hp)}/${b.max}`),'Switch to?');if(i<0||game.team[i]===me||game.team[i].hp<=0)continue;act={sw:game.team[i]}}
    else if(c===2){const i=await choose([`Potion x${game.items.potion}`,`Ball x${game.items.ball}`],'Use which item?');if(i<0)continue;
      if(i===0&&game.items.potion>0){game.items.potion--;act={pot:1}}else if(i===1&&game.items.ball>0&&wild){if(foe.omni&&foe.hp>1){await msg('Aeternum shrugs off the ball! Weaken it first.');continue}const L=SPECIES[foe.name];if(L.legend&&game.legCaught.includes(L.line)){await msg('You can only catch one of each legend!');continue}game.items.ball--;act={ball:1}}else{await msg(i===1&&!wild?"Can't catch a trainer's beast!":'None left!');continue}}
    else if(c===3){if(!wild){await msg("Can't run from a trainer!");continue}
      if(Math.random()<.6+(me.spe-foe.spe)/200){await msg('Got away safely!');$('#battle').hidden=true;return'run'}await msg("Couldn't escape!");act={}}
    else continue;
    // --- resolve turn: swaps/items first, then moves by priority then speed ---
    if(act.sw){me=act.sw;show();await msg(`Go, ${me.name}!`)}
    if(act.pot){me.hp=Math.min(me.max,me.hp+30);show();await msg(`${me.name} recovered HP!`)}
    if(act.ball){await msg('You threw a ball...');const p=(1-foe.hp/foe.max*.7)*.6+.2+(foe.status?.1:0);const pc=foe.omni?1:p*(SPECIES[foe.name].legend?.4:1);
      if(Math.random()<pc){await msg(`Caught ${foe.name}!`);{const L=SPECIES[foe.name];if(L.legend&&!game.legCaught.includes(L.line))game.legCaught.push(L.line)}if(game.team.length<6)game.team.push(foe);else{game.box.push(foe);await msg(`${foe.name} was sent to the Monster Box!`)};$('#battle').hidden=true;return'caught'}await msg('It broke free!')}
    const fm=foe.moves[Math.random()*foe.moves.length|0],order=[];
    if(act.mv)order.push({a:me,d:foe,n:act.mv,s:me.spe,p:MOVES[act.mv].pri});order.push({a:foe,d:me,n:fm,s:foe.spe,p:MOVES[fm].pri});
    order.sort((x,y)=>y.p-x.p||y.s-x.s||Math.random()-.5);
    for(const o of order){await use(o.a,o.d,o.n);if(over)break;if(foe.hp<=0||me.hp<=0)break}
    if(over==='run'){$('#battle').hidden=true;return'run'}
    for(const b of [me,foe]){if(b.hp>0&&!b.omni&&(b.status==='brn'||b.status==='psn')){b.hp-=Math.max(1,b.max/8|0);show();await msg(`${b.name} is hurt by its ${b.status==='brn'?'burn':'poison'}!`)}b.prot=0}
    if(W.w&&--W.t<=0){W={w:null,t:0};await msg('The weather cleared.')}
    if(foe.hp<=0){show();await msg(`${foe.name} fainted!`);await reward();me.status=null;$('#battle').hidden=true;return'win'}
    if(me.hp<=0){show();await msg(`${me.name} fainted!`);const alive=game.team.filter(b=>b.hp>0);
      if(!alive.length){await msg('You blacked out...');$('#battle').hidden=true;return'lose'}
      const i=await choose(alive.map(b=>`${b.name} Lv${b.lv}`),'Send out which beast?');me=alive[Math.max(0,i)];show()}}}
