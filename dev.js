// dev.js — secret developer mode. Unlock: press ENTER (A) 10 times in a row on the map, <3s apart.
import {MOVES,COLORS,TYPECHART,SPECIAL} from './moves.js';
import {mk,SPECIES,baseStats,learnset} from './beasts.js';
import {battle,pick,browse} from './battle.js';
const BN=Object.keys(SPECIES),MN=Object.keys(MOVES);
const num=(t,d)=>{const v=parseInt(prompt(t,d));return isNaN(v)?null:v};
const bar=(v,max=255)=>`<span class="bar"><i style="width:${Math.min(100,v/max*100)}%"></i></span>`;
const FXT={faint:'User faints after hitting',flee:'Ends a wild battle',rain:'Rain 5 turns: Water x1.5, Fire x0.5',sun:'Sun 5 turns: Fire x1.5, Water x0.5',heal:'Restores 50% HP',protect:'Blocks the next hit'};
function beastInfo(n,hk){const sp=SPECIES[n],b=baseStats(n),chain=[];for(let s=SPECIES[sp.line];s;s=SPECIES[s.next])chain.push(s.name);
  const rows=[['HP','hp'],['Attack','atk'],['Defense','def'],['Sp. Atk','spa'],['Sp. Def','spd'],['Speed','spe']];
  return `<div class="vh"><canvas data-s="${n}" width="48" height="48"></canvas><div><b>${n}</b><br>${sp.types.join(' / ')}<br>${sp.omni?'SECRET MYTHICAL':sp.legend?'LEGENDARY':`Stage ${sp.stage+1} of ${chain.length}`}</div></div>
  <div class="vt">Base stats (total ${Object.values(b).reduce((a,c)=>a+c,0)})</div><div class="vs">${rows.map(([l,k])=>`<div>${l} <b>${b[k]}</b>${bar(b[k])}</div>`).join('')}</div>
  <div class="vt">Evolution line</div><div class="ev">${chain.map(c=>`<span class="${c===n?'cur':''}"><canvas data-s="${c}" width="48" height="48"></canvas><br>${c}</span>`).join('<em>→</em>')}</div>${chain.length>1?'<div class="sm">Evolves at Lv16, then Lv34</div>':''}
  <div class="vt">Found in</div><div class="sm">${hk.habitat(n)}</div>
  <div class="vt">Learns</div><div class="sm">${learnset(n).slice(0,12).map(([l,m])=>`Lv${l} ${m}`).join(', ')}</div>`}
function moveInfo(n){const m=MOVES[n],tc=TYPECHART[m.t]||['','',''],cat=!m.p?'Status':SPECIAL.has(m.t)?'Special':'Physical',fx=[m.fx&&FXT[m.fx],m.st&&'20% chance to inflict '+{brn:'burn',psn:'poison',par:'paralysis'}[m.st],!m.p&&!m.fx&&'No effect in this build yet'].filter(Boolean).join('. ')||'Straight damage';
  return `<div class="vh"><div class="chip" style="background:${COLORS[m.t]}">${m.t}</div><div><b>${n}</b><br>${cat}</div></div>
  <div class="vs"><div>Power <b>${m.p||'-'}</b>${bar(m.p,150)}</div><div>Accuracy <b>${m.acc}</b></div><div>Priority <b>${m.pri||0}</b></div></div>
  <div class="vt">Effect</div><div class="sm">${fx}</div><div class="vt">Strong against</div><div class="sm">${tc[0]||'nothing'}</div>
  <div class="vt">Weak against</div><div class="sm">${tc[1]||'nothing'}</div><div class="vt">No effect on</div><div class="sm">${tc[2]||'nothing'}</div>`}
export const _test={beastInfo,moveInfo};
const clampLv=v=>Math.min(100,Math.max(1,v));
const teamList=g=>g.team.map(b=>`${b.name} Lv${b.lv}`);
export async function openDev(game,hk){
  while(true){
    const i=await pick(['Set potions','Set balls','Give beast','Teach move','Set level','Heal team','Fight beast','Noclip (walk through trees/walls): '+(game.noclip?'ON':'OFF'),'Warp to area','Give all badges','Elite Four clears: '+game.e4,'Reset save (new game)','Set rare candies','Close'],'DEV MODE — BACK to exit');
    if(i<0||i===13)return;
    if(i===0){const n=num('Number of potions:',game.items.potion);if(n!=null)game.items.potion=Math.max(0,n)}
    if(i===1){const n=num('Number of balls:',game.items.ball);if(n!=null)game.items.ball=Math.max(0,n)}
    if(i===2){const k=await browse(BN,'Give which beast?',k=>beastInfo(BN[k],hk));if(k<0)continue;const lv=num('Level (1-100):',20);if(lv==null)continue;const b=mk(BN[k],clampLv(lv));
      if(game.team.length<6)game.team.push(b);else game.box.push(b)}
    if(i===3){const t=await pick(teamList(game),'Teach which beast?');if(t<0)continue;const m=await browse(MN,'Pick a move',k=>moveInfo(MN[k]));if(m<0)continue;
      const b=game.team[t],slots=[...b.moves.map(x=>'Replace '+x),...(b.moves.length<4?['New slot']:[])];
      const s=await pick(slots,`Where to put ${MN[m]}?`);if(s>=0)b.moves[s]=MN[m]}
    if(i===4){const t=await pick(teamList(game),'Set level of?');if(t<0)continue;const b=game.team[t];
      const lv=num('New level (1-100):',b.lv);if(lv==null)continue;Object.assign(b,mk(b.name,clampLv(lv)),{moves:b.moves})}
    if(i===5)game.team.forEach(b=>{b.hp=b.max;b.status=null});
    if(i===6){const k=await browse(BN,'Fight which beast?',k=>beastInfo(BN[k],hk));if(k<0)continue;const lv=num('Level:',20);if(lv==null)continue;await battle(game,mk(BN[k],clampLv(lv)),true)}
    if(i===7)game.noclip=!game.noclip;
    if(i===8){const k=await pick(hk.areas,'Warp where?');if(k>=0){await hk.warp(k);return}}
    if(i===9){game.badges=[...hk.badges]}
    if(i===10){const n=num('Elite Four clears so far (0 = first run Lv75, then Lv100):',game.e4);if(n!=null)game.e4=Math.max(0,n)}
    if(i===12){const n=num('Number of rare candies:',game.items.candy|0);if(n!=null)game.items.candy=Math.max(0,n)}
    if(i===11&&confirm('Erase your save and restart?')){localStorage.removeItem('pixelbeasts.save.v1');location.reload()}
  }
}
