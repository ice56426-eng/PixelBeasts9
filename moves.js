// moves.js — type chart + the 100-move registry. Format: "Name Power", grouped by type.
export const COLORS={Normal:'#b8b8a0',Fire:'#f0502a',Water:'#3b82f0',Grass:'#4cb84c',Electric:'#f2d21e',Ice:'#8fdcf0',Rock:'#a89870',Ground:'#c29a50',Flying:'#8aa0e8',Dark:'#6a4a58',Ghost:'#7a5aa8',Poison:'#a040c0',Steel:'#9aa4b4',Fairy:'#f08ac0',Psychic:'#f0508a',Dragon:'#7038f8',Bug:'#a0b820'};
// Type chart: attacker -> [super-effective, not-very, immune-targets]
const C={Normal:['','Rock Steel','Ghost'],Fire:['Grass Ice Bug Steel','Fire Water Rock Dragon',''],Water:['Fire Ground Rock','Water Grass Dragon',''],Grass:['Water Ground Rock','Fire Grass Poison Flying Bug Dragon Steel',''],Electric:['Water Flying','Electric Grass Dragon','Ground'],Ice:['Grass Ground Flying Dragon','Fire Water Ice Steel',''],Poison:['Grass Fairy','Poison Ground Rock Ghost','Steel'],Ground:['Fire Electric Poison Rock Steel','Grass Bug','Flying'],Flying:['Grass Bug','Electric Rock Steel',''],Psychic:['Poison','Psychic Steel','Dark'],Bug:['Grass Psychic Dark','Fire Flying Ghost Steel Poison Fairy',''],Rock:['Fire Ice Flying Bug','Ground Steel',''],Ghost:['Ghost Psychic','Dark','Normal'],Dragon:['Dragon','Steel','Fairy'],Dark:['Ghost Psychic','Dark Fairy',''],Steel:['Ice Rock Fairy','Fire Water Electric Steel',''],Fairy:['Dragon Dark','Fire Poison Steel','']};
export const TYPECHART=C;
export const eff=(mt,defTypes)=>defTypes.reduce((m,t)=>{const [s,n,i]=C[mt]||['','',''];return m*(i.split(' ').includes(t)?0:s.split(' ').includes(t)?2:n.split(' ').includes(t)?.5:1)},1);
const RAW={Fire:'Ember Burst 40,Flame Charge 50,Inferno Rush 100,Magma Punch 85,Blaze Kick 85,Heat Wave 95,Fire Spin 60,Flare Blitz 120',
Water:'Aqua Jet 40,Tidal Crash 90,Hydro Pump 110,Bubble Barrage 65,Ocean Pulse 80,Water Pulse 60,Aqua Tail 90,Surf 95',
Grass:'Leaf Storm 130,Thorn Lash 75,Solar Beam 120,Vine Crush 80,Petal Dance 120,Root Snare 60,Razor Leaf 55,Energy Ball 90',
Electric:'Thunder Fang 65,Volt Tackle 120,Spark Shot 40,Lightning Strike 90,Static Shock 50,Thunder Shock 40,Discharge 80,Thunderbolt 90',
Ice:'Frost Bite 65,Ice Shard 40,Glacier Crash 100,Icy Wind 55,Freeze Shock 70,Blizzard 110,Ice Beam 90,Aurora Veil 30',
Rock:'Rock Throw 50,Boulder Smash 85,Stone Edge 100,Ancient Power 60,Rock Slide 75,Power Gem 80,Sandstorm 30,Head Smash 150',
Ground:'Quake Slam 80,Sand Tomb 35,Earthquake 100,Dig 80,Mud Shot 55,Bulldoze 60,Earth Power 90,Drill Run 80',
Flying:'Wing Slash 75,Gale Force 90,Sky Dive 120,Air Cutter 60,Aerial Ace 60,Brave Bird 120,Fly 90,Hurricane 110',
Dark:'Shadow Claw 70,Night Slash 70,Dark Pulse 80,Crunch 80,Foul Play 95,Knock Off 65,Throat Chop 80,Sucker Punch 70',
Ghost:'Phantom Force 90,Shadow Ball 80,Hex 65,Shadow Sneak 40,Poltergeist 110,Curse 30,Spirit Shackle 80,Moongeist Beam 100',
Poison:'Poison Sting 30,Toxic Spike 40,Venom Shock 75,Acid Spray 40,Sludge Bomb 90,Gunk Shot 120,Poison Jab 80,Venoshock 65',
Steel:'Iron Tail 100,Metal Claw 50,Steel Wing 70,Bullet Punch 40,Flash Cannon 80,Iron Head 80,Gyro Ball 60,Meteor Mash 90',
Normal:'Quick Attack 40,Body Slam 85,Hyper Beam 150,Scratch 40,Tackle 40,Slash 70,Take Down 90,Extreme Speed 80,Swift 60,Facade 70,Return 102,Frustration 102,Hidden Power 60,Tri Attack 80,Explosion 250,Self-Destruct 200,Endure 0,Substitute 0,Reflect 0,Light Screen 0,Safeguard 0,Roar 0,Whirlwind 0,Healing Wish 0,Protect 0',
Fairy:'Fairy Dust 50,Moonblast 95,Dazzling Gleam 80,Play Rough 90,Draining Kiss 50,Misty Explosion 100,Charm 30,Disarming Voice 40,Misty Terrain 0',
Psychic:'Psychic Wave 90,Mind Blast 100,Confusion 50,Future Sight 120,Psyshock 80,Psychic 90,Psybeam 65,Zen Headbutt 80,Psychic Terrain 0,Gravity 0',
Dragon:'Dragon Claw 80,Dragon Pulse 85,Outrage 120,Onister 40,Dragon Breath 60,Dragon Rush 100,Clanging Scales 110,Draco Meteor 130',
Bug:'Bug Bite 60,Signal Beam 75,X-Scissor 80,Leech Life 80,Megahorn 120,Silver Wind 60,Pin Missile 50,Infestation 30,U-turn 70',
Other:'Volt Switch 70:Electric,Sunny Day 0:Fire,Rain Dance 0:Water,Hail 0:Ice,Grassy Terrain 0:Grass,Electric Terrain 0:Electric,Tailwind 0:Flying,Taunt 0:Dark,Torment 0:Dark,Memento 0:Dark'};
// Secondary effects: faint=user faints, flee=ends wild battle, rain/sun=weather, heal=restore 50%, protect=block next hit
const FX={Explosion:'faint','Self-Destruct':'faint',Roar:'flee',Whirlwind:'flee','Rain Dance':'rain','Sunny Day':'sun','Healing Wish':'heal',Protect:'protect',Endure:'protect'};
const PRIO={'Quick Attack':1,'Aqua Jet':1,'Bullet Punch':1,'Shadow Sneak':1,'Extreme Speed':2,'Sucker Punch':1,'Ice Shard':1,Protect:3,Endure:3};
const STAT={Fire:'brn',Poison:'psn',Electric:'par'};
export const MOVES={};
for(const [g,s] of Object.entries(RAW))for(const e of s.split(',')){
  const [a,t]=e.split(':');const m=/^(.*) (\d+)$/.exec(a);const type=t||(g==='Other'?'Normal':g);
  MOVES[m[1]]={name:m[1],t:type,p:+m[2],acc:m[1]==='Hyper Beam'||+m[2]>=110?90:100,fx:FX[m[1]],pri:PRIO[m[1]]||0,st:+m[2]?STAT[type]:null};
}
MOVES.Sandstorm={name:'Sandstorm',t:'Rock',p:30,acc:100,pri:0}; // Rock-list entry (power 30)
export const SPECIAL=new Set(['Fire','Water','Grass','Electric','Ice','Psychic','Dragon','Dark','Ghost','Fairy']);
