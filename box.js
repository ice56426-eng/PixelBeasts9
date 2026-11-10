// box.js — Monster Box (unlimited storage), team menu, summary screen with move changing, release.
import {SPECIES,learnset} from './beasts.js';
import {MOVES,COLORS} from './moves.js';
import {pick,browse} from './battle.js';
import {_test} from './dev.js';
const {moveInfo}=_test;
// Moves a beast may choose from: anything in its learnset at or below its current level (Aeternum: its four signature moves).
export const legalMoves=b=>b.omni?['Draco Meteor','Hyper Beam','Head Smash','Moongeist Beam']:[...new Set(learnset(b.name).filter(([l])=>l<=b.lv).map(([,m])=>m))];
export function sumHtml(b,sel){const sp=SPECIES[b.name],chain=[];for(let s=SPECIES[sp.line];s;s=SPECIES[s.next])chain.push(s.name);
  const st=[['HP',`${Math.max(0,b.hp)}/${b.max}`],['Attack',b.atk],['Defense',b.def],['Sp. Atk',b.spa],['Sp. Def',b.spd],['Speed',b.spe]];
  const mv=b.moves.map(m=>{const M=MOVES[m];return `<div><span class="chip2" style="background:${COLORS[M.t]}">${M.t.slice(0,3)}</span> ${m} <i>${M.p||'-'}</i></div>`}).join('');
  return `<div class="vh"><canvas data-s="${b.name}" width="48" height="48"></canvas><div><b>${b.name}</b> Lv${b.lv}<br>${b.types.join(' / ')}${b.status?` [${b.status}]`:''}<br>EXP ${b.exp}${sp.legend?' · LEGENDARY':sp.omni?' · MYTHICAL':''}</div></div>
  <div class="vt">Stats</div><div class="vs">${st.map(([l,v])=>`<div>${l} <b>${v}</b></div>`).join('')}</div>
  <div class="vt">Moves</div><div class="sm">${mv||'none'}</div>
  <div class="vt">Evolution line</div><div class="ev">${chain.map(c=>`<span class="${c===b.name?'cur':''}"><canvas data-s="${c}" width="48" height="48"></canvas><br>${c}</span>`).join('<em>→</em>')}</div>
  ${sel!=null&&b.moves[sel]?`<div class="vt">Selected move</div>${moveInfo(b.moves[sel])}`:''}`}
// Summary: view stats and change moves (only moves it could know at its current level).
export async function summary(b,hk){
  while(true){const slots=b.moves.map(m=>`Change: ${m}`);if(b.moves.length<4)slots.push('Add a move');slots.push('Back');
    const i=await browse(slots,`${b.name} Lv${b.lv} — Summary`,k=>sumHtml(b,k));if(i<0||i===slots.length-1)return;
    const L=legalMoves(b),m=await browse(L,`Pick a move (up to Lv${b.lv})`,k=>moveInfo(L[k]));if(m<0)continue;
    if(b.moves.includes(L[m])){await hk.say(`${b.name} already knows ${L[m]}.`);continue}
    b.moves[i]=L[m]}}
const label=b=>`${b.name} Lv${b.lv}`;
export async function teamMenu(game,hk){
  while(true){const i=await pick(game.team.map(b=>`${label(b)} ${Math.max(0,b.hp)}/${b.max}`),'Team — pick one');if(i<0)return;
    const b=game.team[i],a=await pick(['Summary / change moves','Move to Monster Box','Back'],label(b));
    if(a===0)await summary(b,hk);
    if(a===1){if(game.team.length<=1)await hk.say('You need at least one beast in your party.');else{game.team.splice(i,1);game.box.push(b);await hk.say(`${b.name} was sent to the Monster Box.`)}}}}
export async function openBox(game,hk){
  while(true){if(!game.box.length){await pick(['(empty)'],'MONSTER BOX — caught beasts you aren\'t carrying appear here');return}
    const i=await browse(game.box.map(label),`Monster Box (${game.box.length} stored)`,k=>sumHtml(game.box[k]));if(i<0)return;
    const b=game.box[i],a=await pick(['Summary / change moves','Move to party','Release','Back'],label(b));
    if(a===0)await summary(b,hk);
    if(a===1){if(game.team.length<6){game.box.splice(i,1);game.team.push(b);await hk.say(`${b.name} joined your party.`)}
      else{const j=await pick(game.team.map(label),`Party full — swap ${b.name} with who?`);if(j>=0){const o=game.team[j];game.team[j]=b;game.box[i]=o;await hk.say(`${b.name} joined the party; ${o.name} went to the box.`)}}}
    if(a===2){const c=await pick(['No, keep it',`Yes, release ${b.name}`],`Release ${label(b)}? This can't be undone.`);if(c===1){game.box.splice(i,1);await hk.say(`${b.name} was released. Goodbye!`)}}}}
