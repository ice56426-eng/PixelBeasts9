// beasts.js — roster, stat formulas, leveling, evolution, procedural pixel sprites.
import {MOVES,COLORS} from './moves.js';
const LINES=`Grass|Leafkit,Thornback,Forestaur
Grass|Bloomite,Petaldrake,Rosethorn
Grass|Sproutail,Vinetail,Jungleking
Grass|Rootlet,Bramblet,Verdantor
Grass|Piklit,Thornlit,Spikeroot
Grass|Florbit,Petalbit,Florawing
Fire|Emberpup,Flamejaw,Infernodon
Fire|Cinderat,Blazetail,Pyrorex
Fire|Flickit,Scorchet,Volcannon
Fire|Charmin,Flareon,Soloraze
Fire|Emberkit,Flamlit,Ignivolt
Fire|Magmite,Lavmaw,Magmachomp
Water|Bubblfin,Tidecrest,Abyssalord
Water|Dewlet,Mistwing,Stormsiren
Water|Finlet,Marifin,Nepturtle
Water|Puddleap,Splooshap,Hydrabble
Water|Aquapup,Tidalpup,Oceanguard
Water/Ice|Frostkit,Icefang,Glaciern
Electric|Sparkit,Voltmane,Thunderclaw
Electric|Zaplet,Shockfox,Voltiger
Electric|Voltkit,Joltric,Elektrike
Rock|Pebblet,Boulderhide,Titanrock
Rock|Stonlet,Gravrok,Cragolith
Ground|Terrakin,Lithokin,Earthax
Ground|Gritlet,Sandpaw,Dunerunner
Ground/Rock|Dritch,Slubbit,Quagmire
Flying|Gustling,Galehawk,Skystrike
Flying|Zephykit,Wispwind,Aerialix
Flying|Breezlet,Skyrill,Venturion
Dark|Shadekit,Nightfang,Duskhowl
Dark|Sombrat,Duskbat,Nocture
Ghost|Nightlit,Shadowisp,Umbralis
Psychic/Dark|Psylit,Mindfly,Psychelix
Poison|Muckpup,Spudgebeast,Toxigor
Poison|Venkit,Venomite,Venefyx
Steel|Shellbit,Carapawn,Ironclad
Normal|Puffling,Cloudpuff,Aerowing
Fairy|Luminel,Glimmerat,Luminox
Normal/Fairy|Goblit,Gobbyte,Gobbulor
Dragon/Dark|Niblet,Gnashling,Shardmaw
Ice|Iglit,Frostbit,Cryolith
Dragon/Steel|Dragonling,Dragonlord,Dragon Emperor
Dark/Ghost|Void Matter,Void Warden,Void Lord
Grass/Rock|Earth Matter,Gaia Cub,Gea Gaia
Omni|Aeternum`;
const LEGEND=['Dragonling','Void Matter','Earth Matter'];
export const SPECIES={},STARTERS=[];
for(const l of LINES.split('\n')){const [t,n]=l.split('|'),names=n.split(',');
  names.forEach((nm,i)=>SPECIES[nm]={name:nm,types:t.split('/'),stage:i,next:names[i+1],line:names[0],legend:LEGEND.includes(names[0]),omni:names[0]==='Aeternum'})}
export const BASES=Object.values(SPECIES).filter(s=>s.stage===0);
const hash=s=>[...s].reduce((a,c)=>(a*31+c.charCodeAt(0))>>>0,7);
// Normal beasts top out near 100; legendary lines start at 100 and reach ~135; Aeternum is 255 across the board.
const base=(sp,k)=>sp.omni?255:sp.legend?100+sp.stage*16+hash(sp.name+k)%8:40+sp.stage*18+(hash(sp.name+k)%25);
const need=lv=>lv*lv*2+8;
function pool(sp){const out=[];sp.types.forEach(t=>out.push(...Object.values(MOVES).filter(m=>m.t===t&&m.p>0&&m.name!=='Sandstorm'&&!['Explosion','Self-Destruct','Hyper Beam'].includes(m.name)&&!(t==='Normal'&&['Tackle'].includes(m.name))).sort((a,b)=>a.p-b.p).map(m=>m.name)));return ['Tackle',...out]}
const learnLv=i=>i<2?1:(i-1)*6;
function calc(b){const sp=SPECIES[b.name],L=b.lv,f=k=>Math.floor(base(sp,k)*2*L/100)+5;
  const old=b.max||0;b.max=Math.floor(base(sp,'hp')*2*L/100)+L+10;b.hp=b.hp==null?b.max:b.hp+(b.max-old);
  Object.assign(b,{atk:f('a'),def:f('d'),spa:f('sa'),spd:f('sd'),spe:f('s')});b.types=sp.types;b.omni=!!sp.omni}
export function mk(name,lv){const b={name,lv,exp:0,status:null,moves:[]};calc(b);
  const p=pool(SPECIES[name]);p.forEach((m,i)=>{if(learnLv(i)<=lv&&!b.moves.includes(m))b.moves.push(m);if(b.moves.length>4)b.moves.shift()});if(SPECIES[name].omni)b.moves=['Draco Meteor','Hyper Beam','Head Smash','Moongeist Beam'];return b}
// Adds EXP; returns events [{lv,evolved,learn:[moves]}] for the battle UI to narrate.
export function gainExp(b,amt){const ev=[];b.exp+=amt;
  while(b.exp>=need(b.lv)&&b.lv<100){b.exp-=need(b.lv);b.lv++;const e={lv:b.lv,learn:[]};
    const sp=SPECIES[b.name];if(sp.next&&b.lv>=[16,34][sp.stage]){e.evolved=[b.name,sp.next];b.name=sp.next}
    calc(b);pool(SPECIES[b.name]).forEach((m,i)=>{if(learnLv(i)===b.lv&&!b.moves.includes(m))e.learn.push(m)});ev.push(e)}
  return ev}
// Sprites: low-res atlas (sprites.png, 12 columns of 48x48 cells) sliced from the roster art; ORDER = cell order.
const ORDER="Leafkit|Thornback|Forestaur|Emberpup|Flamejaw|Infernodon|Bubblfin|Tidecrest|Abyssalord|Sparkit|Voltmane|Thunderclaw|Pebblet|Boulderhide|Titanrock|Gustling|Galehawk|Skystrike|Shadekit|Nightfang|Duskhowl|Bloomite|Petaldrake|Rosethorn|Zaplet|Shockfox|Voltiger|Shellbit|Carapawn|Ironclad|Frostkit|Icefang|Glaciern|Muckpup|Spudgebeast|Toxigor|Cinderat|Blazetail|Pyrorex|Dewlet|Mistwing|Stormsiren|Sproutail|Vinetail|Jungleking|Rootlet|Bramblet|Verdantor|Puffling|Cloudpuff|Aerowing|Niblet|Gnashling|Shardmaw|Flickit|Scorchet|Volcannon|Finlet|Marifin|Nepturtle|Piklit|Thornlit|Spikeroot|Charmin|Flareon|Soloraze|Sombrat|Duskbat|Nocture|Puddleap|Splooshap|Hydrabble|Stonlet|Gravrok|Cragolith|Zephykit|Wispwind|Aerialix|Venkit|Venomite|Venefyx|Luminel|Glimmerat|Luminox|Dritch|Slubbit|Quagmire|Terrakin|Lithokin|Earthax|Breezlet|Skyrill|Venturion|Emberkit|Flamlit|Ignivolt|Aquapup|Tidalpup|Oceanguard|Voltkit|Joltric|Elektrike|Gritlet|Sandpaw|Dunerunner|Florbit|Petalbit|Florawing|Goblit|Gobbyte|Gobbulor|Psylit|Mindfly|Psychelix|Iglit|Frostbit|Cryolith|Magmite|Lavmaw|Magmachomp|Nightlit|Shadowisp|Umbralis|Dragonling|Dragonlord|Dragon Emperor|Void Matter|Void Warden|Void Lord|Earth Matter|Gaia Cub|Gea Gaia|Aeternum".split('|');
const ATLAS=new Image();
export const ready=new Promise(r=>{ATLAS.onload=r;ATLAS.onerror=r;ATLAS.src='sprites.png'});
export function drawSprite(c,name){const x=c.getContext('2d'),W=c.width,i=ORDER.indexOf(name);x.clearRect(0,0,W,c.height);
  if(i<0||!ATLAS.complete||!ATLAS.naturalWidth)return;x.imageSmoothingEnabled=W<48;
  x.drawImage(ATLAS,(i%12)*48,Math.floor(i/12)*48,48,48,0,0,W,W)}

// Helpers for the dev-mode beast browser: base stats and the level-by-level learnset.
export const baseStats=n=>{const s=SPECIES[n];return{hp:base(s,'hp'),atk:base(s,'a'),def:base(s,'d'),spa:base(s,'sa'),spd:base(s,'sd'),spe:base(s,'s')}};
export const learnset=n=>pool(SPECIES[n]).map((m,i)=>[learnLv(i),m]);
export const expToNext=b=>need(b.lv)-b.exp;
