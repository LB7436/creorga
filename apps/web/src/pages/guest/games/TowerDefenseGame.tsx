import { useEffect, useRef, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Vec2 { x: number; y: number; }

type EnemyType = 'goblin'|'orc'|'spider'|'golem'|'sorcerer'|'werewolf'|'dragon_whelp'|'lava_titan'|'phantom'|'boss_dragon';
type TowerType = 'archer'|'mage'|'cannon'|'catapult'|'ice'|'lightning';
type Phase = 'menu'|'prep'|'wave'|'gameover'|'victory';
type MapId = 0|1|2;
type ModeId = 'campaign'|'endless'|'challenge';

interface Enemy {
  id: number; type: EnemyType; hp: number; maxHp: number;
  speed: number; pathIndex: number; progress: number;
  x: number; y: number; reward: number;
  slowUntil: number; freezeUntil: number;
  dead: boolean; reachedEnd: boolean;
  shieldHp: number; shieldCooldown: number;
  armor: number; flying: boolean; phased: boolean;
  animT: number; lavaParticles?: {x:number;y:number;vx:number;vy:number;life:number}[];
}
interface Tower {
  id: number; type: TowerType; col: number; row: number;
  damage: number; range: number; fireRate: number; cooldown: number;
  level: number; cost: number; aoe: number; slow: number;
  suppressedUntil: number;
}
interface Projectile {
  id: number; type: TowerType; x: number; y: number;
  tx: number; ty: number; speed: number; damage: number;
  aoe: number; slow: number; freeze: boolean;
  enemyId?: number; chainTargets?: number[]; chainDmg?: number;
  arc: number; arcProgress: number; sx: number; sy: number;
  dead: boolean;
}
interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; color: string; size: number;
  type: 'spark'|'smoke'|'ice'|'text'|'gold'|'lava';
  text?: string; alpha?: number;
}
interface GameState {
  phase: Phase; map: MapId; mode: ModeId;
  wave: number; gold: number; lives: number; score: number;
  speedMult: number; enemies: Enemy[]; towers: Tower[];
  projectiles: Projectile[]; particles: Particle[];
  spawnQueue: {type:EnemyType;delay:number}[];
  nextSpawnTime: number; hoveredCell: {col:number;row:number}|null;
  selectedTowerId: number|null; placingType: TowerType|null;
  frameCount: number; waveStartTime: number; idCounter: number;
  totalWaves: number; bossActive: boolean;
  challengeStartTime: number; highScores: number[];
}

// ─── Constants ────────────────────────────────────────────────────────────────
const GRID_COLS = 22;
const GRID_ROWS = 13;
const INITIAL_GOLD = 160;
const INITIAL_LIVES = 30;

const MAP_NAMES = ['🌲 Forêt Enchantée','🔥 Désert de Feu','❄️ Vallée de Glace'];
const MODE_NAMES = ['🗺️ Campagne','♾️ Survie Infinie','⚡ Défi Vitesse'];
const MAP_DESCS = [
  'Chemin sinueux à travers les bois magiques',
  'Canyon désertique aux virages redoutables',
  'Glaces éternelles aux ennemis rapides',
];
const MODE_DESCS = [
  '5 missions avec récit épique',
  'Vagues infinies — battez votre record',
  '10 vagues chronométrées — vitesse maximum',
];

const STORY: Record<number,string> = {
  1: '⚔️ Mission 1 — Les premiers éclaireurs gobelin approchent. Défendez le cristal !',
  2: '💀 Mission 2 — Les orcs envoient leurs guerriers. Renforcez vos défenses.',
  3: '🕷️ Mission 3 — Les araignées géantes surgissent des ténèbres. Restez vigilant.',
  4: '🗿 Mission 4 — Un golem de pierre mène l\'armée. Visez ses fissures de lave.',
  5: '🐉 Mission 5 — Le Dragon Ancestral attaque. C\'est le combat final !',
};

// Waypoints per map (normalized 0..1 → multiplied by canvas size at render)
const MAP_PATHS: Vec2[][] = [
  // Forest: winding
  [{x:0,y:0.46},{x:0.12,y:0.46},{x:0.2,y:0.25},{x:0.32,y:0.15},{x:0.45,y:0.22},
   {x:0.5,y:0.38},{x:0.55,y:0.55},{x:0.62,y:0.72},{x:0.72,y:0.76},{x:0.8,y:0.62},
   {x:0.85,y:0.45},{x:0.9,y:0.32},{x:1.0,y:0.32}],
  // Desert: S-curves
  [{x:0,y:0.3},{x:0.15,y:0.3},{x:0.28,y:0.18},{x:0.42,y:0.18},{x:0.52,y:0.5},
   {x:0.62,y:0.82},{x:0.75,y:0.82},{x:0.88,y:0.62},{x:1.0,y:0.62}],
  // Ice: crossings
  [{x:0,y:0.22},{x:0.18,y:0.22},{x:0.3,y:0.4},{x:0.38,y:0.62},{x:0.5,y:0.75},
   {x:0.62,y:0.62},{x:0.7,y:0.4},{x:0.82,y:0.22},{x:0.92,y:0.4},{x:1.0,y:0.4}],
];

const TOWER_DEFS: Record<TowerType,{name:string;cost:number;dmg:number;range:number;rate:number;aoe:number;slow:number;color:string;desc:string}> = {
  archer:    {name:'Archer',    cost:80,  dmg:12,  range:3.5, rate:1.2, aoe:0,   slow:0,   color:'#8B6914', desc:'Rapide, longue portée'},
  mage:      {name:'Mage',      cost:130, dmg:35,  range:4.5, rate:0.7, aoe:0.5, slow:0,   color:'#7B2FBE', desc:'Dégâts splash magiques'},
  cannon:    {name:'Canon',     cost:180, dmg:80,  range:3.0, rate:0.4, aoe:1.2, slow:0,   color:'#555',    desc:'Explosion AOE puissante'},
  catapult:  {name:'Catapulte', cost:220, dmg:45,  range:5.0, rate:0.35,aoe:1.8, slow:0.4, color:'#7A5C2E', desc:'Ralentit, grande portée'},
  ice:       {name:'Glace',     cost:160, dmg:8,   range:3.8, rate:0.9, aoe:0,   slow:1.0, color:'#5BE8FF', desc:'Gèle les ennemis'},
  lightning: {name:'Foudre',    cost:300, dmg:60,  range:4.0, rate:0.5, aoe:0,   slow:0,   color:'#FFD700', desc:'Chaîne sur 4 ennemis'},
};

const UPGRADE_COSTS = [0, 0.6, 1.2]; // multiplier of base cost per level (lv1=base, lv2=+60%, lv3=+120%)
const UPGRADE_DMG   = [1.0, 1.4, 1.8];
const UPGRADE_RNG   = [1.0, 1.15, 1.25];

const ENEMY_DEFS: Record<EnemyType,{hp:number;speed:number;reward:number;armor:number;flying:boolean;phased:boolean;color:string}> = {
  goblin:      {hp:80,   speed:0.55, reward:8,   armor:0,    flying:false, phased:false, color:'#5aad3a'},
  orc:         {hp:220,  speed:0.35, reward:18,  armor:0,    flying:false, phased:false, color:'#c05030'},
  spider:      {hp:150,  speed:0.70, reward:15,  armor:0,    flying:false, phased:false, color:'#333'},
  golem:       {hp:600,  speed:0.20, reward:40,  armor:0.3,  flying:false, phased:false, color:'#888'},
  sorcerer:    {hp:300,  speed:0.45, reward:35,  armor:0,    flying:false, phased:false, color:'#4444aa'},
  werewolf:    {hp:400,  speed:0.80, reward:45,  armor:0,    flying:false, phased:false, color:'#6b4423'},
  dragon_whelp:{hp:350,  speed:0.65, reward:50,  armor:0,    flying:true,  phased:false, color:'#e05020'},
  lava_titan:  {hp:1200, speed:0.25, reward:80,  armor:0,    flying:false, phased:false, color:'#e07030'},
  phantom:     {hp:200,  speed:0.90, reward:60,  armor:0,    flying:false, phased:true,  color:'rgba(200,220,255,0.7)'},
  boss_dragon: {hp:2500, speed:0.30, reward:200, armor:0,    flying:false, phased:false, color:'#8B0000'},
};

// Wave compositions per map
function buildWave(wave: number, mode: ModeId): {type:EnemyType;delay:number}[] {
  const q: {type:EnemyType;delay:number}[] = [];
  const add = (t:EnemyType, count:number, spacing:number) => {
    for(let i=0;i<count;i++) q.push({type:t, delay: spacing*i + (q.length>0?600:0)});
  };
  const w = mode==='endless' ? wave : Math.min(wave,10);
  if(w<=2)      { add('goblin', 8+w*2, 900); }
  else if(w<=4) { add('goblin',6,900); add('orc',3+w,1200); }
  else if(w<=6) { add('spider',5,700); add('orc',4,1100); if(w>=6) add('golem',2,2000); }
  else if(w<=8) { add('sorcerer',4,1000); add('werewolf',3,900); add('golem',2,2000); }
  else if(w<=9) { add('dragon_whelp',4,800); add('lava_titan',2,2500); add('phantom',3,700); }
  else          { add('phantom',4,700); add('lava_titan',3,2000); }
  // Boss every 5 waves
  if(wave%5===0) q.push({type:'boss_dragon', delay:3000});
  return q;
}

// ─── Canvas Drawing ────────────────────────────────────────────────────────────
function drawMapBackground(ctx: CanvasRenderingContext2D, w: number, h: number, map: MapId) {
  if(map===0) {
    const g = ctx.createLinearGradient(0,0,0,h);
    g.addColorStop(0,'#0d2605'); g.addColorStop(1,'#1a3d0a');
    ctx.fillStyle=g; ctx.fillRect(0,0,w,h);
    // tree silhouettes
    ctx.fillStyle='#0a2004';
    for(const [tx,ty,r] of [[0.05,0.1,0.06],[0.95,0.1,0.06],[0.02,0.85,0.055],[0.97,0.9,0.05],[0.08,0.9,0.05],[0.92,0.15,0.05]] as [number,number,number][]) {
      ctx.beginPath(); ctx.arc(tx*w, ty*h, r*w, 0, Math.PI*2); ctx.fill();
      ctx.fillRect(tx*w-0.008*w, ty*h+r*w*0.7, 0.016*w, 0.05*h);
    }
  } else if(map===1) {
    const g = ctx.createLinearGradient(0,0,0,h);
    g.addColorStop(0,'#c8965a'); g.addColorStop(1,'#a0704a');
    ctx.fillStyle=g; ctx.fillRect(0,0,w,h);
    // rock pillars
    ctx.fillStyle='#7a5a3a';
    for(const [rx,ry,rw,rh] of [[0.03,0.5,0.04,0.4],[0.93,0.4,0.04,0.45],[0.88,0.6,0.03,0.3],[0.07,0.3,0.03,0.35]] as number[][]) {
      ctx.fillRect(rx*w, ry*h, rw*w, rh*h);
    }
  } else {
    const g = ctx.createLinearGradient(0,0,0,h);
    g.addColorStop(0,'#c5dff0'); g.addColorStop(1,'#7aaac5');
    ctx.fillStyle=g; ctx.fillRect(0,0,w,h);
    // snowflakes
    ctx.strokeStyle='rgba(255,255,255,0.4)'; ctx.lineWidth=1;
    for(const [sx,sy] of [[0.1,0.1],[0.9,0.2],[0.15,0.8],[0.85,0.85],[0.5,0.05]] as number[][]) {
      for(let a=0;a<6;a++) {
        const ax=Math.cos(a*Math.PI/3)*0.025*w, ay=Math.sin(a*Math.PI/3)*0.025*h;
        ctx.beginPath(); ctx.moveTo(sx*w,sy*h); ctx.lineTo(sx*w+ax,sy*h+ay); ctx.stroke();
      }
    }
  }
}

function drawPath(ctx: CanvasRenderingContext2D, w: number, h: number, path: Vec2[], map: MapId) {
  if(path.length<2) return;
  const pts = path.map(p=>({x:p.x*w, y:p.y*h}));
  const pathColor = map===0?'#c8a060': map===1?'#b08050':'#a8c8e0';
  const edgeColor = map===0?'rgba(120,90,40,0.5)': map===1?'rgba(90,60,30,0.4)':'rgba(150,190,220,0.5)';
  const roadW = Math.min(w,h)*0.072;

  ctx.lineCap='round'; ctx.lineJoin='round';
  // Shadow
  ctx.strokeStyle='rgba(0,0,0,0.3)'; ctx.lineWidth=roadW+6;
  ctx.beginPath(); ctx.moveTo(pts[0].x,pts[0].y);
  for(let i=1;i<pts.length-1;i++) {
    const mx=(pts[i].x+pts[i+1].x)/2, my=(pts[i].y+pts[i+1].y)/2;
    ctx.quadraticCurveTo(pts[i].x,pts[i].y,mx,my);
  }
  ctx.lineTo(pts[pts.length-1].x,pts[pts.length-1].y); ctx.stroke();
  // Edge
  ctx.strokeStyle=edgeColor; ctx.lineWidth=roadW;
  ctx.beginPath(); ctx.moveTo(pts[0].x,pts[0].y);
  for(let i=1;i<pts.length-1;i++) {
    const mx=(pts[i].x+pts[i+1].x)/2, my=(pts[i].y+pts[i+1].y)/2;
    ctx.quadraticCurveTo(pts[i].x,pts[i].y,mx,my);
  }
  ctx.lineTo(pts[pts.length-1].x,pts[pts.length-1].y); ctx.stroke();
  // Road
  ctx.strokeStyle=pathColor; ctx.lineWidth=roadW*0.85;
  ctx.beginPath(); ctx.moveTo(pts[0].x,pts[0].y);
  for(let i=1;i<pts.length-1;i++) {
    const mx=(pts[i].x+pts[i+1].x)/2, my=(pts[i].y+pts[i+1].y)/2;
    ctx.quadraticCurveTo(pts[i].x,pts[i].y,mx,my);
  }
  ctx.lineTo(pts[pts.length-1].x,pts[pts.length-1].y); ctx.stroke();
  // Center line
  ctx.strokeStyle='rgba(255,255,200,0.15)'; ctx.lineWidth=2;
  ctx.setLineDash([12,18]);
  ctx.beginPath(); ctx.moveTo(pts[0].x,pts[0].y);
  for(let i=1;i<pts.length-1;i++) {
    const mx=(pts[i].x+pts[i+1].x)/2, my=(pts[i].y+pts[i+1].y)/2;
    ctx.quadraticCurveTo(pts[i].x,pts[i].y,mx,my);
  }
  ctx.lineTo(pts[pts.length-1].x,pts[pts.length-1].y); ctx.stroke();
  ctx.setLineDash([]);
}

function drawGrid(ctx: CanvasRenderingContext2D, _w: number, _h: number, cs: number, pathCells: Set<string>,
  hovered: {col:number;row:number}|null, towers: Tower[], placingType: TowerType|null) {
  for(let r=0;r<GRID_ROWS;r++) {
    for(let c=0;c<GRID_COLS;c++) {
      const key=`${c},${r}`;
      if(pathCells.has(key)) continue;
      const x=c*cs, y=r*cs;
      if(hovered && hovered.col===c && hovered.row===r && placingType) {
        const canPlace=!towers.find(t=>t.col===c&&t.row===r);
        ctx.fillStyle=canPlace?'rgba(100,255,100,0.18)':'rgba(255,60,60,0.18)';
        ctx.fillRect(x,y,cs,cs);
        ctx.strokeStyle=canPlace?'rgba(100,255,100,0.5)':'rgba(255,60,60,0.5)';
        ctx.lineWidth=1; ctx.strokeRect(x,y,cs,cs);
        // Range preview
        if(canPlace && placingType) {
          const def=TOWER_DEFS[placingType];
          ctx.strokeStyle='rgba(255,255,255,0.2)'; ctx.lineWidth=1;
          ctx.beginPath();
          ctx.arc(x+cs/2, y+cs/2, def.range*cs, 0, Math.PI*2);
          ctx.stroke();
        }
      }
    }
  }
}

// ─── Enemy Drawing ─────────────────────────────────────────────────────────────
function drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy, cs: number) {
  ctx.save();
  ctx.translate(e.x, e.y);
  const now=performance.now();
  const frozen = e.freezeUntil > now;
  const slow = e.slowUntil > now && !frozen;
  const sz = cs * 0.38;

  if(frozen) { ctx.shadowBlur=12; ctx.shadowColor='#5BE8FF'; }
  else if(slow) { ctx.shadowBlur=6; ctx.shadowColor='#88aaff'; }

  if(e.type==='goblin') {
    // Body
    const bg=ctx.createRadialGradient(0,0,sz*0.1,0,sz*0.1,sz);
    bg.addColorStop(0,'#7dcc50'); bg.addColorStop(1,'#3d8020');
    ctx.fillStyle=bg; ctx.beginPath(); ctx.ellipse(0,sz*0.2,sz*0.55,sz*0.7,0,0,Math.PI*2); ctx.fill();
    // Head
    const hg=ctx.createRadialGradient(0,-sz*0.6,sz*0.1,0,-sz*0.6,sz*0.5);
    hg.addColorStop(0,'#90dd60'); hg.addColorStop(1,'#4a9a28');
    ctx.fillStyle=hg; ctx.beginPath(); ctx.arc(0,-sz*0.6,sz*0.45,0,Math.PI*2); ctx.fill();
    // Ears
    ctx.fillStyle='#5aad3a';
    ctx.beginPath(); ctx.moveTo(-sz*0.4,-sz*0.9); ctx.lineTo(-sz*0.55,-sz*1.2); ctx.lineTo(-sz*0.25,-sz*0.75); ctx.fill();
    ctx.beginPath(); ctx.moveTo(sz*0.4,-sz*0.9); ctx.lineTo(sz*0.55,-sz*1.2); ctx.lineTo(sz*0.25,-sz*0.75); ctx.fill();
    // Eyes
    ctx.fillStyle='#ffee00';
    ctx.beginPath(); ctx.ellipse(-sz*0.17,-sz*0.62,sz*0.13,sz*0.1,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(sz*0.17,-sz*0.62,sz*0.13,sz*0.1,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#000';
    ctx.beginPath(); ctx.arc(-sz*0.17,-sz*0.62,sz*0.06,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(sz*0.17,-sz*0.62,sz*0.06,0,Math.PI*2); ctx.fill();

  } else if(e.type==='orc') {
    const bg=ctx.createRadialGradient(0,0,sz*0.1,0,sz*0.1,sz*1.1);
    bg.addColorStop(0,'#d06040'); bg.addColorStop(1,'#802820');
    ctx.fillStyle=bg; ctx.beginPath(); ctx.ellipse(0,sz*0.1,sz*0.75,sz*0.85,0,0,Math.PI*2); ctx.fill();
    // Shoulder pads
    ctx.fillStyle='#888';
    ctx.beginPath(); ctx.ellipse(-sz*0.8,sz*0.0,sz*0.35,sz*0.25,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(sz*0.8,sz*0.0,sz*0.35,sz*0.25,0,0,Math.PI*2); ctx.fill();
    // Head
    const hg=ctx.createRadialGradient(0,-sz*0.75,sz*0.1,0,-sz*0.7,sz*0.6);
    hg.addColorStop(0,'#d87050'); hg.addColorStop(1,'#903030');
    ctx.fillStyle=hg; ctx.beginPath(); ctx.arc(0,-sz*0.75,sz*0.55,0,Math.PI*2); ctx.fill();
    // Tusks
    ctx.fillStyle='#ffe0a0';
    ctx.beginPath(); ctx.moveTo(-sz*0.2,-sz*0.4); ctx.lineTo(-sz*0.3,-sz*0.05); ctx.lineTo(-sz*0.1,-sz*0.4); ctx.fill();
    ctx.beginPath(); ctx.moveTo(sz*0.2,-sz*0.4); ctx.lineTo(sz*0.3,-sz*0.05); ctx.lineTo(sz*0.1,-sz*0.4); ctx.fill();
    // Eyes
    ctx.fillStyle='#ff2200';
    ctx.beginPath(); ctx.ellipse(-sz*0.2,-sz*0.8,sz*0.12,sz*0.1,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(sz*0.2,-sz*0.8,sz*0.12,sz*0.1,0,0,Math.PI*2); ctx.fill();

  } else if(e.type==='spider') {
    // Body
    ctx.fillStyle='#2a2a2a';
    ctx.beginPath(); ctx.ellipse(0,sz*0.1,sz*0.55,sz*0.65,0,0,Math.PI*2); ctx.fill();
    // Head
    ctx.fillStyle='#111';
    ctx.beginPath(); ctx.arc(0,-sz*0.65,sz*0.35,0,Math.PI*2); ctx.fill();
    // 8 legs
    ctx.strokeStyle='#1a1a1a'; ctx.lineWidth=sz*0.12; ctx.lineCap='round';
    for(let i=0;i<4;i++) {
      const side=i<2?-1:1; const idx=i%2;
      const ang=-0.4-idx*0.4; const len=sz*0.85;
      const mx=side*sz*0.55, my=(idx===0?-sz*0.1:sz*0.2);
      const ex=side*(sz*0.55+Math.cos(ang)*len), ey=my+Math.sin(ang*side)*len;
      ctx.beginPath(); ctx.moveTo(side*sz*0.5,my); ctx.quadraticCurveTo(mx+side*sz*0.3,my-sz*0.3,ex,ey); ctx.stroke();
    }
    // 6 red eyes
    ctx.fillStyle='#ff2200';
    for(let i=0;i<6;i++) {
      const a=(i/6)*Math.PI-Math.PI*0.5, r2=sz*0.22;
      ctx.beginPath(); ctx.arc(Math.cos(a)*r2,-sz*0.65+Math.sin(a)*r2*0.5,sz*0.07,0,Math.PI*2); ctx.fill();
    }

  } else if(e.type==='golem') {
    // Large square body
    const bg=ctx.createLinearGradient(-sz*0.8,-sz*0.9,sz*0.8,sz*0.9);
    bg.addColorStop(0,'#aaa'); bg.addColorStop(1,'#666');
    ctx.fillStyle=bg;
    ctx.beginPath(); ctx.roundRect(-sz*0.75,-sz*0.8,sz*1.5,sz*1.6,sz*0.15); ctx.fill();
    // Rocky patches
    ctx.fillStyle='rgba(80,80,80,0.5)';
    for(const [px,py,pw,ph] of [[-0.4,-0.5,0.3,0.25],[0.1,-0.6,0.35,0.2],[-0.3,0.1,0.25,0.3],[0.2,0.3,0.3,0.2]] as number[][]) {
      ctx.beginPath(); ctx.ellipse(px*sz,py*sz,pw*sz,ph*sz,0.3,0,Math.PI*2); ctx.fill();
    }
    // Glowing cracks
    ctx.strokeStyle='#ff7700'; ctx.lineWidth=sz*0.05; ctx.shadowBlur=8; ctx.shadowColor='#ff5500';
    ctx.beginPath(); ctx.moveTo(-sz*0.3,-sz*0.5); ctx.lineTo(0,-sz*0.2); ctx.lineTo(sz*0.3,-sz*0.4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-sz*0.1,sz*0.1); ctx.lineTo(sz*0.2,sz*0.4); ctx.stroke();
    ctx.shadowBlur=0;
    // Eyes
    ctx.fillStyle='#ff6600'; ctx.shadowBlur=10; ctx.shadowColor='#ff4400';
    ctx.beginPath(); ctx.arc(-sz*0.28,-sz*0.48,sz*0.12,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(sz*0.28,-sz*0.48,sz*0.12,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;

  } else if(e.type==='sorcerer') {
    // Robe
    const rg=ctx.createLinearGradient(0,-sz,0,sz);
    rg.addColorStop(0,'#5555cc'); rg.addColorStop(1,'#222288');
    ctx.fillStyle=rg;
    ctx.beginPath(); ctx.moveTo(-sz*0.45,-sz*0.3); ctx.lineTo(-sz*0.6,sz*0.8); ctx.lineTo(sz*0.6,sz*0.8); ctx.lineTo(sz*0.45,-sz*0.3); ctx.closePath(); ctx.fill();
    // Body
    ctx.fillStyle='#4444aa';
    ctx.beginPath(); ctx.ellipse(0,sz*0.0,sz*0.35,sz*0.5,0,0,Math.PI*2); ctx.fill();
    // Head
    ctx.fillStyle='#e0c090';
    ctx.beginPath(); ctx.arc(0,-sz*0.7,sz*0.38,0,Math.PI*2); ctx.fill();
    // Hat
    ctx.fillStyle='#222288';
    ctx.beginPath(); ctx.moveTo(-sz*0.5,-sz*0.8); ctx.lineTo(sz*0.5,-sz*0.8); ctx.lineTo(sz*0.0,-sz*1.5); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0,-sz*0.8,sz*0.55,sz*0.12,0,0,Math.PI*2); ctx.fill();
    // Stars
    ctx.fillStyle='#ffcc00'; ctx.font=`${sz*0.35}px sans-serif`; ctx.textAlign='center';
    ctx.fillText('★',0,-sz*1.55);
    // Shield visual
    if(e.shieldHp>0) {
      ctx.strokeStyle='rgba(100,180,255,0.6)'; ctx.lineWidth=sz*0.12; ctx.shadowBlur=15; ctx.shadowColor='#88aaff';
      ctx.beginPath(); ctx.arc(0,0,sz*1.0,0,Math.PI*2); ctx.stroke(); ctx.shadowBlur=0;
    }

  } else if(e.type==='werewolf') {
    const t = e.animT || 0;
    // Body
    const bg=ctx.createRadialGradient(0,0,sz*0.1,0,sz*0.1,sz);
    bg.addColorStop(0,'#8a5c2e'); bg.addColorStop(1,'#4a2c0e');
    ctx.fillStyle=bg; ctx.beginPath(); ctx.ellipse(0,sz*0.1,sz*0.6,sz*0.75,0,0,Math.PI*2); ctx.fill();
    // Wolf head
    ctx.fillStyle='#7a4c1e';
    ctx.beginPath(); ctx.ellipse(0,-sz*0.7,sz*0.45,sz*0.42,0,0,Math.PI*2); ctx.fill();
    // Ears
    ctx.fillStyle='#5a3010';
    ctx.beginPath(); ctx.moveTo(-sz*0.3,-sz*0.95); ctx.lineTo(-sz*0.5,-sz*1.3); ctx.lineTo(-sz*0.1,-sz*0.9); ctx.fill();
    ctx.beginPath(); ctx.moveTo(sz*0.3,-sz*0.95); ctx.lineTo(sz*0.5,-sz*1.3); ctx.lineTo(sz*0.1,-sz*0.9); ctx.fill();
    // Snout
    ctx.fillStyle='#c0906a';
    ctx.beginPath(); ctx.ellipse(0,-sz*0.52,sz*0.28,sz*0.2,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#222';
    ctx.beginPath(); ctx.arc(0,-sz*0.52,sz*0.1,0,Math.PI*2); ctx.fill();
    // Eyes
    ctx.fillStyle='#ff8800';
    ctx.beginPath(); ctx.arc(-sz*0.18,-sz*0.73,sz*0.1,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(sz*0.18,-sz*0.73,sz*0.1,0,Math.PI*2); ctx.fill();
    // Running legs animation
    const legAngle=Math.sin(t*0.015)*0.4;
    ctx.strokeStyle='#5a3010'; ctx.lineWidth=sz*0.18; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(-sz*0.3,sz*0.5); ctx.lineTo(-sz*0.3+Math.sin(legAngle)*sz*0.4, sz*0.9); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sz*0.3,sz*0.5); ctx.lineTo(sz*0.3-Math.sin(legAngle)*sz*0.4, sz*0.9); ctx.stroke();

  } else if(e.type==='dragon_whelp') {
    const t = e.animT || 0;
    const wingFlap = Math.sin(t*0.02)*0.3;
    // Wings
    ctx.fillStyle='rgba(180,60,20,0.7)';
    ctx.beginPath(); ctx.moveTo(-sz*0.2,0); ctx.bezierCurveTo(-sz*0.8,-sz*0.5+wingFlap*sz,-sz*1.2,-sz*0.2+wingFlap*sz,-sz*1.0,sz*0.3); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(sz*0.2,0); ctx.bezierCurveTo(sz*0.8,-sz*0.5-wingFlap*sz,sz*1.2,-sz*0.2-wingFlap*sz,sz*1.0,sz*0.3); ctx.closePath(); ctx.fill();
    // Body
    const bg=ctx.createRadialGradient(0,0,sz*0.1,0,sz*0.1,sz*0.7);
    bg.addColorStop(0,'#f07040'); bg.addColorStop(1,'#802010');
    ctx.fillStyle=bg; ctx.beginPath(); ctx.ellipse(0,sz*0.1,sz*0.5,sz*0.65,0,0,Math.PI*2); ctx.fill();
    // Head
    ctx.fillStyle='#d05030';
    ctx.beginPath(); ctx.arc(sz*0.1,-sz*0.6,sz*0.38,0,Math.PI*2); ctx.fill();
    // Horns
    ctx.fillStyle='#4a2010';
    ctx.beginPath(); ctx.moveTo(-sz*0.05,-sz*0.9); ctx.lineTo(-sz*0.2,-sz*1.25); ctx.lineTo(sz*0.05,-sz*0.85); ctx.fill();
    ctx.beginPath(); ctx.moveTo(sz*0.25,-sz*0.85); ctx.lineTo(sz*0.4,-sz*1.2); ctx.lineTo(sz*0.35,-sz*0.78); ctx.fill();
    // Tail
    ctx.strokeStyle='#c04020'; ctx.lineWidth=sz*0.18; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(-sz*0.4,sz*0.5); ctx.quadraticCurveTo(-sz*0.8,sz*0.7,-sz*0.6,sz*1.0); ctx.stroke();
    // Eye
    ctx.fillStyle='#ffdd00';
    ctx.beginPath(); ctx.arc(sz*0.2,-sz*0.62,sz*0.1,0,Math.PI*2); ctx.fill();

  } else if(e.type==='lava_titan') {
    // Large fiery body
    const bg=ctx.createRadialGradient(0,-sz*0.2,sz*0.1,0,-sz*0.2,sz*1.2);
    bg.addColorStop(0,'#ff9040'); bg.addColorStop(0.5,'#e05020'); bg.addColorStop(1,'#802010');
    ctx.fillStyle=bg; ctx.beginPath(); ctx.ellipse(0,sz*0.1,sz*0.85,sz*1.0,0,0,Math.PI*2); ctx.fill();
    // Lava cracks
    ctx.strokeStyle='#ffcc00'; ctx.lineWidth=sz*0.07; ctx.shadowBlur=10; ctx.shadowColor='#ff8800';
    ctx.beginPath(); ctx.moveTo(-sz*0.5,-sz*0.5); ctx.lineTo(sz*0.1,0); ctx.lineTo(-sz*0.2,sz*0.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sz*0.4,-sz*0.3); ctx.lineTo(0,sz*0.2); ctx.lineTo(sz*0.5,sz*0.6); ctx.stroke();
    ctx.shadowBlur=0;
    // Head
    const hg=ctx.createRadialGradient(0,-sz*0.9,sz*0.1,0,-sz*0.9,sz*0.65);
    hg.addColorStop(0,'#ff7030'); hg.addColorStop(1,'#802010');
    ctx.fillStyle=hg; ctx.beginPath(); ctx.arc(0,-sz*0.9,sz*0.62,0,Math.PI*2); ctx.fill();
    // Eyes — glowing
    ctx.fillStyle='#ffffff'; ctx.shadowBlur=15; ctx.shadowColor='#ffcc00';
    ctx.beginPath(); ctx.arc(-sz*0.22,-sz*0.92,sz*0.14,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(sz*0.22,-sz*0.92,sz*0.14,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;
    // Lava drips (particles)
    if(e.lavaParticles) {
      for(const lp of e.lavaParticles) {
        const a=lp.life/12; ctx.fillStyle=`rgba(255,${100+Math.floor(a*100)},0,${a})`;
        ctx.beginPath(); ctx.arc(lp.x,lp.y,sz*0.08,0,Math.PI*2); ctx.fill();
      }
    }

  } else if(e.type==='phantom') {
    ctx.globalAlpha=0.75;
    const t = e.animT || 0;
    const bob=Math.sin(t*0.012)*sz*0.1;
    // Flowing bottom
    ctx.fillStyle='rgba(220,235,255,0.8)';
    ctx.beginPath(); ctx.moveTo(-sz*0.6,sz*0.3+bob);
    ctx.bezierCurveTo(-sz*0.6,sz*1.0+bob,-sz*0.2,sz*0.7+bob,0,sz*0.9+bob);
    ctx.bezierCurveTo(sz*0.2,sz*0.7+bob,sz*0.6,sz*1.0+bob,sz*0.6,sz*0.3+bob);
    ctx.closePath(); ctx.fill();
    // Body
    ctx.fillStyle='rgba(210,225,255,0.85)';
    ctx.beginPath(); ctx.ellipse(0,-sz*0.2+bob,sz*0.6,sz*0.65,0,0,Math.PI*2); ctx.fill();
    // Dark eyes
    ctx.fillStyle='rgba(20,20,50,0.9)';
    ctx.beginPath(); ctx.ellipse(-sz*0.18,-sz*0.25+bob,sz*0.15,sz*0.22,-0.2,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(sz*0.18,-sz*0.25+bob,sz*0.15,sz*0.22,0.2,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha=1.0;

  } else if(e.type==='boss_dragon') {
    const sc=1.6;
    // Wings
    ctx.fillStyle='rgba(100,0,0,0.8)';
    ctx.beginPath(); ctx.moveTo(-sz*0.3*sc,0); ctx.bezierCurveTo(-sz*1.2*sc,-sz*0.8*sc,-sz*1.8*sc,-sz*0.5*sc,-sz*1.5*sc,sz*0.5*sc); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(sz*0.3*sc,0); ctx.bezierCurveTo(sz*1.2*sc,-sz*0.8*sc,sz*1.8*sc,-sz*0.5*sc,sz*1.5*sc,sz*0.5*sc); ctx.closePath(); ctx.fill();
    // Body
    const bg=ctx.createRadialGradient(0,sz*0.1,sz*0.1,0,sz*0.1,sz*1.0*sc);
    bg.addColorStop(0,'#cc2020'); bg.addColorStop(1,'#660000');
    ctx.fillStyle=bg; ctx.beginPath(); ctx.ellipse(0,sz*0.1,sz*0.8*sc,sz*0.9*sc,0,0,Math.PI*2); ctx.fill();
    // Scales
    ctx.fillStyle='rgba(0,0,0,0.2)';
    for(let i=0;i<8;i++) {
      const a=(i/8)*Math.PI*2;
      ctx.beginPath(); ctx.ellipse(Math.cos(a)*sz*0.5*sc,sz*0.1+Math.sin(a)*sz*0.7*sc,sz*0.15,sz*0.12,-a,0,Math.PI*2); ctx.fill();
    }
    // Neck + Head
    ctx.fillStyle='#aa1010';
    ctx.beginPath(); ctx.moveTo(-sz*0.25,-sz*0.8); ctx.lineTo(sz*0.25,-sz*0.8); ctx.lineTo(sz*0.35,-sz*1.6); ctx.lineTo(-sz*0.35,-sz*1.6); ctx.closePath(); ctx.fill();
    ctx.fillStyle='#cc1515';
    ctx.beginPath(); ctx.arc(0,-sz*1.9,sz*0.62,0,Math.PI*2); ctx.fill();
    // Horns
    ctx.fillStyle='#2a0000';
    ctx.beginPath(); ctx.moveTo(-sz*0.2,-sz*2.2); ctx.lineTo(-sz*0.5,-sz*2.8); ctx.lineTo(sz*0.0,-sz*2.1); ctx.fill();
    ctx.beginPath(); ctx.moveTo(sz*0.2,-sz*2.2); ctx.lineTo(sz*0.5,-sz*2.8); ctx.lineTo(sz*0.0,-sz*2.1); ctx.fill();
    // Fangs
    ctx.fillStyle='#ffe8a0';
    ctx.beginPath(); ctx.moveTo(-sz*0.2,-sz*1.5); ctx.lineTo(-sz*0.3,-sz*1.1); ctx.lineTo(-sz*0.05,-sz*1.5); ctx.fill();
    ctx.beginPath(); ctx.moveTo(sz*0.2,-sz*1.5); ctx.lineTo(sz*0.3,-sz*1.1); ctx.lineTo(sz*0.05,-sz*1.5); ctx.fill();
    // Eyes — glowing
    ctx.fillStyle='#ff4400'; ctx.shadowBlur=20; ctx.shadowColor='#ff2200';
    ctx.beginPath(); ctx.arc(-sz*0.22,-sz*1.95,sz*0.18,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(sz*0.22,-sz*1.95,sz*0.18,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#ffcc00';
    ctx.beginPath(); ctx.arc(-sz*0.22,-sz*1.95,sz*0.09,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(sz*0.22,-sz*1.95,sz*0.09,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;
  }

  // Freeze effect
  if(frozen) {
    ctx.fillStyle='rgba(100,220,255,0.3)';
    ctx.beginPath(); ctx.arc(0,0,sz*1.0,0,Math.PI*2); ctx.fill();
  }
  // HP bar
  const barW=sz*1.8, barH=sz*0.18, barX=-barW/2, barY=sz*(e.type==='boss_dragon'?-3.5:-1.4);
  ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(barX,barY,barW,barH);
  const pct=e.hp/e.maxHp;
  const hpCol=pct>0.5?`hsl(${100*pct},80%,45%)`:'#e84040';
  ctx.fillStyle=hpCol; ctx.fillRect(barX,barY,barW*pct,barH);
  ctx.strokeStyle='rgba(0,0,0,0.4)'; ctx.lineWidth=0.5; ctx.strokeRect(barX,barY,barW,barH);
  ctx.restore();
}

// ─── Tower Drawing ─────────────────────────────────────────────────────────────
function drawTower(ctx: CanvasRenderingContext2D, t: Tower, cs: number) {
  const x=t.col*cs+cs/2, y=t.row*cs+cs/2;
  ctx.save(); ctx.translate(x,y);
  const sz=cs*0.42;

  if(t.type==='archer') {
    // Stone base
    const bg=ctx.createLinearGradient(-sz,-sz*1.6,sz,sz*0.4);
    bg.addColorStop(0,'#c0a060'); bg.addColorStop(1,'#7a6030');
    ctx.fillStyle=bg; ctx.beginPath(); ctx.roundRect(-sz*0.65,-sz*1.5,sz*1.3,sz*1.9,sz*0.1); ctx.fill();
    // Battlements
    ctx.fillStyle='#a08050';
    for(let i=0;i<3;i++) ctx.fillRect(-sz*0.55+i*sz*0.4,-sz*1.75,sz*0.25,sz*0.32);
    // Archer figure
    ctx.fillStyle='#f0c890'; ctx.beginPath(); ctx.arc(0,-sz*0.95,sz*0.2,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#4a2a0e'; ctx.beginPath(); ctx.ellipse(0,-sz*0.65,sz*0.15,sz*0.28,0,0,Math.PI*2); ctx.fill();
    // Bow
    ctx.strokeStyle='#8B4513'; ctx.lineWidth=sz*0.08;
    ctx.beginPath(); ctx.arc(sz*0.28,-sz*0.78,sz*0.35,Math.PI*0.75,Math.PI*1.6); ctx.stroke();
    ctx.strokeStyle='rgba(200,180,120,0.5)'; ctx.lineWidth=sz*0.04;
    ctx.beginPath(); ctx.moveTo(sz*0.1,-sz*0.55); ctx.lineTo(sz*0.1,-sz*1.0); ctx.stroke();

  } else if(t.type==='mage') {
    // Purple spire
    const bg=ctx.createLinearGradient(-sz*0.6,-sz*2.0,sz*0.6,sz*0.3);
    bg.addColorStop(0,'#9955cc'); bg.addColorStop(1,'#441166');
    ctx.fillStyle=bg;
    ctx.beginPath(); ctx.moveTo(-sz*0.55,sz*0.3); ctx.lineTo(sz*0.55,sz*0.3); ctx.lineTo(sz*0.35,-sz*2.0); ctx.lineTo(-sz*0.35,-sz*2.0); ctx.closePath(); ctx.fill();
    // Glow window
    ctx.fillStyle='rgba(0,220,255,0.6)'; ctx.shadowBlur=15; ctx.shadowColor='#00ccff';
    ctx.beginPath(); ctx.ellipse(0,-sz*0.8,sz*0.25,sz*0.18,0,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;
    // Star finial
    ctx.fillStyle='#ffd700'; ctx.shadowBlur=10; ctx.shadowColor='#ffaa00';
    ctx.font=`${sz*0.5}px sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('★',0,-sz*2.1); ctx.shadowBlur=0;
    // Aura
    const lvl=t.level; const auraAlpha=0.08+lvl*0.04;
    const ag=ctx.createRadialGradient(0,0,sz*0.3,0,0,sz*1.1);
    ag.addColorStop(0,`rgba(150,80,255,${auraAlpha*2})`); ag.addColorStop(1,`rgba(100,40,200,0)`);
    ctx.fillStyle=ag; ctx.beginPath(); ctx.arc(0,0,sz*1.1,0,Math.PI*2); ctx.fill();

  } else if(t.type==='cannon') {
    // Stone fortress base
    const bg=ctx.createLinearGradient(-sz,-sz*1.2,sz,sz*0.3);
    bg.addColorStop(0,'#888'); bg.addColorStop(1,'#444');
    ctx.fillStyle=bg; ctx.beginPath(); ctx.roundRect(-sz*0.7,-sz*1.1,sz*1.4,sz*1.4,sz*0.08); ctx.fill();
    // Battlements
    ctx.fillStyle='#555';
    for(let i=0;i<4;i++) ctx.fillRect(-sz*0.65+i*sz*0.35,-sz*1.25,sz*0.25,sz*0.22);
    // Cannon barrel (rotated toward a default direction)
    ctx.save(); ctx.rotate(-Math.PI*0.25);
    const cg=ctx.createLinearGradient(-sz*0.18,0,sz*0.18,0);
    cg.addColorStop(0,'#333'); cg.addColorStop(0.5,'#666'); cg.addColorStop(1,'#333');
    ctx.fillStyle=cg; ctx.beginPath(); ctx.roundRect(-sz*0.18,-sz*0.9,sz*0.36,sz*0.9,sz*0.1); ctx.fill();
    ctx.restore();

  } else if(t.type==='catapult') {
    // A-frame wooden structure
    ctx.strokeStyle='#6b4423'; ctx.lineWidth=sz*0.18; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(-sz*0.7,sz*0.3); ctx.lineTo(0,-sz*0.5); ctx.lineTo(sz*0.7,sz*0.3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-sz*0.5,sz*0.0); ctx.lineTo(sz*0.5,sz*0.0); ctx.stroke();
    // Throwing arm
    ctx.strokeStyle='#8B5A2B'; ctx.lineWidth=sz*0.14;
    ctx.beginPath(); ctx.moveTo(-sz*0.3,sz*0.0); ctx.lineTo(sz*0.4,-sz*1.1); ctx.stroke();
    // Rock in sling
    const rg=ctx.createRadialGradient(sz*0.45,-sz*1.15,sz*0.05,sz*0.4,-sz*1.1,sz*0.22);
    rg.addColorStop(0,'#bbb'); rg.addColorStop(1,'#666');
    ctx.fillStyle=rg; ctx.beginPath(); ctx.arc(sz*0.45,-sz*1.15,sz*0.2,0,Math.PI*2); ctx.fill();
    // Wheels
    ctx.fillStyle='#5a3010';
    ctx.beginPath(); ctx.arc(-sz*0.65,sz*0.32,sz*0.2,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(sz*0.65,sz*0.32,sz*0.2,0,Math.PI*2); ctx.fill();

  } else if(t.type==='ice') {
    // Crystal tower — layered diamonds
    const colors=['#9be8ff','#5be8ff','#a8f0ff'];
    for(let i=0;i<3;i++) {
      const s=0.9-i*0.2, yoff=i*sz*0.4-sz*1.2;
      ctx.fillStyle=colors[i];
      ctx.shadowBlur=10; ctx.shadowColor='#aaf0ff';
      ctx.beginPath();
      ctx.moveTo(0,yoff-sz*0.55*s); ctx.lineTo(sz*0.35*s,yoff); ctx.lineTo(0,yoff+sz*0.4*s); ctx.lineTo(-sz*0.35*s,yoff); ctx.closePath(); ctx.fill();
      ctx.shadowBlur=0;
    }
    // Sparkles
    ctx.fillStyle='rgba(255,255,255,0.8)';
    for(const [sx,sy] of [[-0.5,-1.8],[0.5,-1.5],[-0.3,-0.5]] as number[][]) {
      ctx.beginPath(); ctx.arc(sx*sz,sy*sz,sz*0.07,0,Math.PI*2); ctx.fill();
    }

  } else if(t.type==='lightning') {
    // Metal conductor
    const bg=ctx.createLinearGradient(-sz*0.6,-sz*1.8,sz*0.6,sz*0.3);
    bg.addColorStop(0,'#8888cc'); bg.addColorStop(1,'#444466');
    ctx.fillStyle=bg; ctx.beginPath(); ctx.roundRect(-sz*0.55,-sz*1.6,sz*1.1,sz*1.9,sz*0.12); ctx.fill();
    // Lightning rod
    ctx.strokeStyle='#aaaaee'; ctx.lineWidth=sz*0.12;
    ctx.beginPath(); ctx.moveTo(0,-sz*1.6); ctx.lineTo(0,-sz*2.1); ctx.stroke();
    ctx.fillStyle='#ffdd00'; ctx.shadowBlur=12; ctx.shadowColor='#ffdd00';
    ctx.beginPath(); ctx.arc(0,-sz*2.1,sz*0.14,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;
    // Crackling arcs
    ctx.strokeStyle='rgba(200,200,255,0.6)'; ctx.lineWidth=sz*0.05;
    for(let a=0;a<6;a++) {
      const ang=a*Math.PI/3;
      ctx.beginPath(); ctx.moveTo(0,-sz*0.4);
      ctx.lineTo(Math.cos(ang)*sz*0.55+Math.random()*sz*0.1,-sz*0.4+Math.sin(ang)*sz*0.55);
      ctx.stroke();
    }
  }

  // Level indicator dots
  if(t.level>1) {
    ctx.fillStyle=t.level===3?'#ffd700':'#00aaff';
    for(let i=0;i<t.level-1;i++) {
      ctx.beginPath(); ctx.arc(-sz*0.25+i*sz*0.28,sz*0.55,sz*0.1,0,Math.PI*2); ctx.fill();
    }
  }
  ctx.restore();
}

// ─── Projectile Drawing ────────────────────────────────────────────────────────
function drawProjectiles(ctx: CanvasRenderingContext2D, projectiles: Projectile[]) {
  for(const p of projectiles) {
    if(p.dead) continue;
    ctx.save();
    if(p.type==='archer') {
      const dx=p.tx-p.x, dy=p.ty-p.y, ang=Math.atan2(dy,dx);
      ctx.translate(p.x,p.y); ctx.rotate(ang);
      ctx.fillStyle='#f0c060';
      ctx.beginPath(); ctx.moveTo(8,0); ctx.lineTo(-6,-3); ctx.lineTo(-4,0); ctx.lineTo(-6,3); ctx.closePath(); ctx.fill();
      ctx.strokeStyle='rgba(255,220,100,0.4)'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-12,0); ctx.stroke();

    } else if(p.type==='mage') {
      ctx.translate(p.x,p.y);
      const mg=ctx.createRadialGradient(0,0,2,0,0,9);
      mg.addColorStop(0,'#ffffff'); mg.addColorStop(0.4,'#cc44ff'); mg.addColorStop(1,'rgba(100,0,200,0)');
      ctx.fillStyle=mg; ctx.shadowBlur=15; ctx.shadowColor='#aa00ff';
      ctx.beginPath(); ctx.arc(0,0,9,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0;

    } else if(p.type==='cannon') {
      ctx.translate(p.x,p.y);
      const cg=ctx.createRadialGradient(-2,-2,1,0,0,7);
      cg.addColorStop(0,'#888'); cg.addColorStop(1,'#222');
      ctx.fillStyle=cg; ctx.beginPath(); ctx.arc(0,0,7,0,Math.PI*2); ctx.fill();

    } else if(p.type==='catapult') {
      // Arc parabola: compute position
      const ap=p.arcProgress;
      const arcY=Math.sin(ap*Math.PI)*-30;
      const lx=p.sx+(p.tx-p.sx)*ap, ly=p.sy+(p.ty-p.sy)*ap+arcY;
      ctx.translate(lx,ly);
      const rg=ctx.createRadialGradient(-1,-1,1,0,0,8);
      rg.addColorStop(0,'#ccc'); rg.addColorStop(1,'#555');
      ctx.fillStyle=rg; ctx.beginPath(); ctx.arc(0,0,8,0,Math.PI*2); ctx.fill();

    } else if(p.type==='ice') {
      ctx.translate(p.x,p.y);
      ctx.fillStyle='#aaf0ff'; ctx.shadowBlur=10; ctx.shadowColor='#5be8ff';
      ctx.beginPath(); ctx.arc(0,0,6,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0;

    } else if(p.type==='lightning' && p.chainTargets) {
      // Draw chain between positions (we store positions in tx/ty as last target)
      ctx.strokeStyle='rgba(255,230,50,0.85)'; ctx.lineWidth=3; ctx.shadowBlur=12; ctx.shadowColor='#ffee00';
      ctx.beginPath(); ctx.moveTo(p.sx,p.sy); ctx.lineTo(p.tx,p.ty); ctx.stroke();
      ctx.shadowBlur=0;
    }
    ctx.restore();
  }
}

// ─── Particle System ───────────────────────────────────────────────────────────
function updateAndDrawParticles(ctx: CanvasRenderingContext2D, particles: Particle[], dt: number) {
  let i=particles.length;
  while(i--) {
    const p=particles[i];
    p.life-=dt;
    if(p.life<=0) { particles.splice(i,1); continue; }
    p.x+=p.vx*dt*0.06; p.y+=p.vy*dt*0.06;
    if(p.type!=='text'&&p.type!=='gold') p.vy+=0.8*dt*0.06;
    const a=(p.life/p.maxLife)*(p.alpha??1);
    ctx.save(); ctx.globalAlpha=a;
    if(p.type==='text'||p.type==='gold') {
      ctx.fillStyle=p.color; ctx.font=`bold ${p.size}px sans-serif`;
      ctx.textAlign='center'; ctx.fillText(p.text||'',p.x,p.y);
    } else {
      ctx.fillStyle=p.color;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.size*(p.life/p.maxLife),0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }
}

function spawnExplosion(particles: Particle[], x: number, y: number, color: string, count=14) {
  for(let i=0;i<count;i++) {
    const a=Math.random()*Math.PI*2, v=1+Math.random()*3;
    particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:400+Math.random()*300,maxLife:700,color,size:3+Math.random()*4,type:'spark'});
  }
  for(let i=0;i<6;i++) {
    const a=Math.random()*Math.PI*2, v=0.5+Math.random()*1.5;
    particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-1,life:500+Math.random()*400,maxLife:900,color:'rgba(100,100,100,0.6)',size:5+Math.random()*6,type:'smoke'});
  }
}

function spawnGoldPopup(particles: Particle[], x: number, y: number, amount: number) {
  particles.push({x,y:y-10,vx:(Math.random()-0.5)*0.5,vy:-1.5,life:900,maxLife:900,color:'#ffd700',size:14,type:'gold',text:`+${amount}🪙`});
}

function spawnHitSpark(particles: Particle[], x: number, y: number) {
  for(let i=0;i<4;i++) {
    const a=Math.random()*Math.PI*2;
    particles.push({x,y,vx:Math.cos(a)*2,vy:Math.sin(a)*2,life:180,maxLife:180,color:'#ffffff',size:2,type:'spark'});
  }
}

function spawnIceEffect(particles: Particle[], x: number, y: number) {
  for(let i=0;i<8;i++) {
    const a=(i/8)*Math.PI*2;
    particles.push({x:x+Math.cos(a)*15,y:y+Math.sin(a)*15,vx:Math.cos(a)*0.3,vy:Math.sin(a)*0.3,life:600,maxLife:600,color:'#5be8ff',size:3,type:'ice'});
  }
}

// ─── Path helpers ─────────────────────────────────────────────────────────────
function buildPathCells(path: Vec2[], cols: number, rows: number, cs: number): Set<string> {
  const s=new Set<string>();
  const W=cols*cs, H=rows*cs;
  for(let i=0;i<path.length-1;i++) {
    const steps=60;
    for(let t=0;t<=steps;t++) {
      const tt=t/steps;
      // Use smooth quadratic interpolation between path points
      const px=path[i].x*W+(path[i+1].x-path[i].x)*W*tt;
      const py=path[i].y*H+(path[i+1].y-path[i].y)*H*tt;
      const c=Math.floor(px/cs), r=Math.floor(py/cs);
      if(c>=0&&c<cols&&r>=0&&r<rows) s.add(`${c},${r}`);
      // block adjacent cells too (road width ~2 cells)
      for(const dc of [-1,0,1]) for(const dr of [-1,0,1]) {
        const nc=c+dc, nr=r+dr;
        if(nc>=0&&nc<cols&&nr>=0&&nr<rows) s.add(`${nc},${nr}`);
      }
    }
  }
  return s;
}

function posOnPath(path: Vec2[], pathIndex: number, progress: number, W: number, H: number): Vec2 {
  if(pathIndex>=path.length-1) return {x:path[path.length-1].x*W, y:path[path.length-1].y*H};
  const a=path[pathIndex], b=path[pathIndex+1];
  return { x:(a.x+(b.x-a.x)*progress)*W, y:(a.y+(b.y-a.y)*progress)*H };
}

function segLen(path: Vec2[], i: number, W: number, H: number): number {
  if(i>=path.length-1) return 0;
  const dx=(path[i+1].x-path[i].x)*W, dy=(path[i+1].y-path[i].y)*H;
  return Math.sqrt(dx*dx+dy*dy);
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function TowerDefenseGame({ onBack }: { onBack: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gsRef = useRef<GameState>({
    phase:'menu', map:0, mode:'campaign', wave:0, gold:INITIAL_GOLD, lives:INITIAL_LIVES,
    score:0, speedMult:1, enemies:[], towers:[], projectiles:[], particles:[],
    spawnQueue:[], nextSpawnTime:0, hoveredCell:null, selectedTowerId:null,
    placingType:null, frameCount:0, waveStartTime:0, idCounter:0,
    totalWaves:5, bossActive:false, challengeStartTime:0,
    highScores: JSON.parse(localStorage.getItem('td_scores')||'[]'),
  });
  const [hud, setHud] = useState({wave:0,gold:INITIAL_GOLD,lives:INITIAL_LIVES,score:0,phase:'menu' as Phase,speedMult:1,bossActive:false});
  const [selectedMap, setSelectedMap] = useState<MapId>(0);
  const [selectedMode, setSelectedMode] = useState<ModeId>('campaign');
  const [placingType, setPlacingType] = useState<TowerType|null>(null);
  const [selectedTowerId, setSelectedTowerId] = useState<number|null>(null);
  const [storyMsg, setStoryMsg] = useState('');
  const cellSizeRef = useRef(40);
  const pathCellsRef = useRef<Set<string>>(new Set());
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  function startGame(map: MapId, mode: ModeId) {
    const gs = gsRef.current;
    gs.phase='prep'; gs.map=map; gs.mode=mode;
    gs.wave=0; gs.gold=INITIAL_GOLD; gs.lives=INITIAL_LIVES;
    gs.score=0; gs.speedMult=1; gs.enemies=[]; gs.towers=[];
    gs.projectiles=[]; gs.particles=[]; gs.spawnQueue=[];
    gs.selectedTowerId=null; gs.placingType=null;
    gs.frameCount=0; gs.bossActive=false;
    gs.totalWaves = mode==='campaign'?5 : mode==='challenge'?10 : 999;
    gs.challengeStartTime = mode==='challenge'?performance.now():0;
    gs.idCounter=1;
    // Recalculate path cells for chosen map
    const cs=cellSizeRef.current;
    pathCellsRef.current=buildPathCells(MAP_PATHS[map], GRID_COLS, GRID_ROWS, cs);
    setHud(h=>({...h,wave:0,gold:INITIAL_GOLD,lives:INITIAL_LIVES,score:0,phase:'prep',speedMult:1,bossActive:false}));
    setPlacingType(null); setSelectedTowerId(null); setStoryMsg('');
  }

  function launchWave() {
    const gs=gsRef.current;
    gs.wave++;
    gs.phase='wave';
    gs.spawnQueue=buildWave(gs.wave, gs.mode);
    gs.nextSpawnTime=performance.now()+500;
    gs.bossActive=gs.wave%5===0;
    if(gs.mode==='campaign' && STORY[gs.wave]) setStoryMsg(STORY[gs.wave]);
    else setStoryMsg('');
  }

  // Main game loop
  useEffect(()=>{
    const canvas=canvasRef.current;
    const container=containerRef.current;
    if(!canvas||!container) return;

    function resize() {
      const w=container!.clientWidth, h=container!.clientHeight;
      canvas!.width=w; canvas!.height=h;
      const cs=Math.floor(Math.min(w/GRID_COLS, h/GRID_ROWS));
      cellSizeRef.current=cs;
      const gs=gsRef.current;
      pathCellsRef.current=buildPathCells(MAP_PATHS[gs.map], GRID_COLS, GRID_ROWS, cs);
    }
    const ro=new ResizeObserver(resize);
    ro.observe(container);
    resize();

    function loop(now: number) {
      rafRef.current=requestAnimationFrame(loop);
      const dt=Math.min(now-lastTimeRef.current, 50);
      lastTimeRef.current=now;
      const gs=gsRef.current;
      const ctx=canvas!.getContext('2d');
      if(!ctx) return;
      const W=canvas!.width, H=canvas!.height;
      const cs=cellSizeRef.current;
      const path=MAP_PATHS[gs.map];

      if(gs.phase==='menu') {
        // Just draw background
        drawMapBackground(ctx,W,H,selectedMap);
        return;
      }

      // ── Update ──────────────────────────────────────────────────────────────
      const speed=gs.speedMult*(gs.mode==='endless'?1+gs.wave*0.03:1);
      const dtS=dt/1000*speed;

      // Spawn enemies
      if(gs.phase==='wave' && gs.spawnQueue.length>0 && now>=gs.nextSpawnTime) {
        const entry=gs.spawnQueue.shift()!;
        const def=ENEMY_DEFS[entry.type];
        const waveScale=gs.mode==='endless'?1+gs.wave*0.08:1;
        gs.enemies.push({
          id:gs.idCounter++, type:entry.type,
          hp:def.hp*waveScale, maxHp:def.hp*waveScale,
          speed:def.speed, pathIndex:0, progress:0,
          x:path[0].x*W, y:path[0].y*H,
          reward:def.reward, slowUntil:0, freezeUntil:0,
          dead:false, reachedEnd:false,
          shieldHp:entry.type==='sorcerer'?80:0, shieldCooldown:0,
          armor:def.armor, flying:def.flying, phased:def.phased,
          animT:0, lavaParticles:entry.type==='lava_titan'?[]:undefined,
        });
        if(gs.spawnQueue.length>0) gs.nextSpawnTime=now+gs.spawnQueue[0].delay;
      }

      // Move enemies
      for(const e of gs.enemies) {
        if(e.dead||e.reachedEnd) continue;
        e.animT+=dt;
        const frozen=e.freezeUntil>now;
        const slow=e.slowUntil>now&&!frozen;
        const effSpeed=frozen?0 : slow?e.speed*(1-0.7):e.speed;
        const dist=effSpeed*dtS*cs;
        let remaining=dist;
        while(remaining>0 && e.pathIndex<path.length-1) {
          const slen=segLen(path,e.pathIndex,W,H);
          const leftInSeg=(1-e.progress)*slen;
          if(remaining>=leftInSeg) { remaining-=leftInSeg; e.pathIndex++; e.progress=0; }
          else { e.progress+=remaining/slen; remaining=0; }
        }
        if(e.pathIndex>=path.length-1) { e.reachedEnd=true; gs.lives=Math.max(0,gs.lives-1); }
        const pos=posOnPath(path,e.pathIndex,e.progress,W,H);
        e.x=pos.x; e.y=pos.y;
        // Sorcerer shield regen
        if(e.type==='sorcerer') {
          e.shieldCooldown-=dt;
          if(e.shieldHp<=0 && e.shieldCooldown<=0) { e.shieldHp=80; e.shieldCooldown=0; }
          else if(e.shieldHp<=0) {} // waiting
        }
        // Lava titan particles
        if(e.type==='lava_titan' && e.lavaParticles) {
          e.lavaParticles.push({x:(Math.random()-0.5)*cs*0.7,y:cs*0.2,vx:(Math.random()-0.5)*1.5,vy:-2-Math.random()*2,life:12});
          e.lavaParticles=e.lavaParticles.filter(p=>{p.x+=p.vx;p.y+=p.vy;p.life--;return p.life>0;});
        }
      }

      // Tower shooting
      for(const tower of gs.towers) {
        if(tower.suppressedUntil>now) continue;
        tower.cooldown-=dt*speed;
        if(tower.cooldown>0) continue;
        const dmg=tower.damage*UPGRADE_DMG[tower.level-1];
        const range=tower.range*UPGRADE_RNG[tower.level-1]*cs;
        const tx2=tower.col*cs+cs/2, ty2=tower.row*cs+cs/2;

        if(tower.type==='lightning') {
          // Find closest enemy then chain
          const candidates=gs.enemies.filter(e=>!e.dead&&!e.reachedEnd&&(!e.flying||range+cs*0.5>range));
          candidates.sort((a,b)=>{ const da=Math.hypot(a.x-tx2,a.y-ty2), db=Math.hypot(b.x-tx2,b.y-ty2); return da-db; });
          const first=candidates.find(e=>Math.hypot(e.x-tx2,e.y-ty2)<=range);
          if(first) {
            tower.cooldown=1000/tower.fireRate;
            let prev={x:tx2,y:ty2}, curDmg=dmg, chainCount=0, lastId=first.id;
            let ce=first;
            while(chainCount<4 && ce) {
              const actualDmg=curDmg*(1-ce.armor);
              if(ce.shieldHp>0) { ce.shieldHp=Math.max(0,ce.shieldHp-actualDmg); }
              else { ce.hp-=actualDmg; }
              spawnHitSpark(gs.particles,ce.x,ce.y);
              gs.projectiles.push({
                id:gs.idCounter++, type:'lightning',
                x:prev.x, y:prev.y, tx:ce.x, ty:ce.y,
                speed:0, damage:curDmg, aoe:0, slow:0, freeze:false,
                sx:prev.x, sy:prev.y, arc:0, arcProgress:1, dead:false,
                chainTargets:[], chainDmg:curDmg,
                enemyId:ce.id,
              });
              // schedule removal
              setTimeout(()=>{ const p=gs.projectiles.find(pp=>pp.id===gs.projectiles[gs.projectiles.length-1]?.id); if(p)p.dead=true; },120);
              prev={x:ce.x,y:ce.y}; curDmg=Math.max(5,curDmg-15); chainCount++;
              lastId=ce.id;
              const next=candidates.filter(e=>!e.dead&&e.id!==lastId&&Math.hypot(e.x-prev.x,e.y-prev.y)<=cs*2.5);
              ce=next[0];
            }
          }
          continue;
        }

        // Find target
        let target: Enemy|undefined;
        let bestProgress=-1;
        for(const e of gs.enemies) {
          if(e.dead||e.reachedEnd) continue;
          if(e.flying && range<tower.range*UPGRADE_RNG[tower.level-1]*cs+cs*0.5) continue;
          const dist2=Math.hypot(e.x-tx2,e.y-ty2);
          if(dist2<=range) {
            const prog=e.pathIndex+e.progress;
            if(prog>bestProgress) { bestProgress=prog; target=e; }
          }
        }
        if(!target) continue;
        tower.cooldown=1000/tower.fireRate;

        gs.projectiles.push({
          id:gs.idCounter++, type:tower.type,
          x:tx2, y:ty2, tx:target.x, ty:target.y,
          speed: tower.type==='archer'?10 : tower.type==='catapult'?4 : 8,
          damage:dmg, aoe:tower.aoe, slow:tower.slow, freeze:tower.type==='ice',
          enemyId:target.id, chainTargets:[], chainDmg:0,
          sx:tx2, sy:ty2, arc:tower.type==='catapult'?1:0, arcProgress:0, dead:false,
        });
      }

      // Move projectiles + collision
      for(const p of gs.projectiles) {
        if(p.dead) continue;
        if(p.type==='lightning') continue; // instant
        if(p.type==='catapult') {
          p.arcProgress+=dtS*p.speed*0.5;
          if(p.arcProgress>=1) {
            p.dead=true;
            // AOE
            for(const e of gs.enemies) {
              if(e.dead||e.reachedEnd||e.phased) continue;
              if(Math.hypot(e.x-p.tx,e.y-p.ty)<=p.aoe*cs) {
                const d=p.damage*(1-e.armor);
                if(e.shieldHp>0){e.shieldHp=Math.max(0,e.shieldHp-d);}else{e.hp-=d;}
                if(p.slow>0) e.slowUntil=now+2000;
              }
            }
            spawnExplosion(gs.particles,p.tx,p.ty,'#aa8844');
          }
          continue;
        }
        // Move toward target
        const dx=p.tx-p.x, dy=p.ty-p.y, dist3=Math.hypot(dx,dy);
        const step=p.speed*cs*dtS;
        if(dist3<=step) {
          p.dead=true;
          // Hit
          const hitX=p.tx, hitY=p.ty;
          if(p.aoe>0) {
            for(const e of gs.enemies) {
              if(e.dead||e.reachedEnd) continue;
              if(e.phased && (p.type==='cannon'||(p.type as string)==='catapult')) continue;
              if(Math.hypot(e.x-hitX,e.y-hitY)<=p.aoe*cs) {
                const d=p.damage*(1-e.armor);
                if(e.shieldHp>0){e.shieldHp=Math.max(0,e.shieldHp-d);}else{e.hp-=d;}
                if(p.freeze) { e.freezeUntil=now+1500; spawnIceEffect(gs.particles,e.x,e.y); }
                else if(p.slow>0) e.slowUntil=now+2000;
                spawnHitSpark(gs.particles,e.x,e.y);
              }
            }
            spawnExplosion(gs.particles,hitX,hitY,p.type==='mage'?'#aa44ff':'#ff8822');
          } else {
            const e=gs.enemies.find(en=>en.id===p.enemyId);
            if(e&&!e.dead&&!e.reachedEnd) {
              const d=p.damage*(1-e.armor);
              if(e.shieldHp>0){e.shieldHp=Math.max(0,e.shieldHp-d);}else{e.hp-=d;}
              if(p.freeze) { e.freezeUntil=now+1500; spawnIceEffect(gs.particles,e.x,e.y); }
              else if(p.slow>0) e.slowUntil=now+2000;
              spawnHitSpark(gs.particles,e.x,e.y);
            }
          }
        } else {
          p.x+=dx/dist3*step; p.y+=dy/dist3*step;
        }
      }
      gs.projectiles=gs.projectiles.filter(p=>!p.dead);

      // Check enemy deaths
      for(const e of gs.enemies) {
        if(e.dead||e.hp>0) continue;
        e.dead=true;
        gs.gold+=e.reward; gs.score+=e.reward*10;
        spawnExplosion(gs.particles,e.x,e.y,ENEMY_DEFS[e.type].color);
        spawnGoldPopup(gs.particles,e.x,e.y,e.reward);
        // Lava titan AOE on death
        if(e.type==='lava_titan') {
          for(const t of gs.towers) {
            if(Math.hypot(t.col*cs+cs/2-e.x, t.row*cs+cs/2-e.y)<=cs*2) {
              t.suppressedUntil=now+5000;
            }
          }
        }
      }

      // Remove dead/finished
      gs.enemies=gs.enemies.filter(e=>!e.dead&&!e.reachedEnd);

      // Check wave end
      if(gs.phase==='wave' && gs.spawnQueue.length===0 && gs.enemies.length===0) {
        gs.phase='prep';
        gs.bossActive=false;
        if(gs.mode!=='endless' && gs.wave>=gs.totalWaves) {
          gs.phase='victory';
          if(gs.mode==='challenge') {
            const elapsed=(now-gs.challengeStartTime)/1000;
            gs.score+=Math.floor(gs.gold*10+Math.max(0,300-elapsed)*100);
          }
          // Save scores
          const scores=[...gs.highScores, gs.score].sort((a,b)=>b-a).slice(0,3);
          gs.highScores=scores;
          localStorage.setItem('td_scores',JSON.stringify(scores));
        }
      }
      if(gs.lives<=0 && gs.phase==='wave') { gs.phase='gameover'; }

      // ── Render ───────────────────────────────────────────────────────────────
      ctx.clearRect(0,0,W,H);
      drawMapBackground(ctx,W,H,gs.map);
      drawPath(ctx,W,H,MAP_PATHS[gs.map].map(p=>({x:p.x,y:p.y})),gs.map);
      drawGrid(ctx,W,H,cs,pathCellsRef.current,gs.hoveredCell,gs.towers,gs.placingType);
      for(const t of gs.towers) drawTower(ctx,t,cs);
      for(const e of gs.enemies) drawEnemy(ctx,e,cs);
      drawProjectiles(ctx,gs.projectiles);
      updateAndDrawParticles(ctx,gs.particles,dt);

      // Boss HP bar overlay
      const boss=gs.enemies.find(e=>e.type==='boss_dragon');
      if(boss) {
        const bw=W*0.7, bx=(W-bw)/2, by=8;
        ctx.fillStyle='rgba(0,0,0,0.7)'; ctx.beginPath(); ctx.roundRect(bx-4,by-2,bw+8,24,6); ctx.fill();
        const bp=boss.hp/boss.maxHp;
        const bg2=ctx.createLinearGradient(bx,0,bx+bw,0);
        bg2.addColorStop(0,'#8B0000'); bg2.addColorStop(1,'#ff2222');
        ctx.fillStyle=bg2; ctx.beginPath(); ctx.roundRect(bx,by,bw*bp,20,4); ctx.fill();
        ctx.fillStyle='#fff'; ctx.font='bold 13px sans-serif'; ctx.textAlign='center';
        ctx.fillText(`🐉 Dragon Boss — ${Math.ceil(boss.hp)} / ${Math.ceil(boss.maxHp)} HP`,W/2,by+14);
      }

      // HUD sync every 6 frames
      gs.frameCount++;
      if(gs.frameCount%6===0) {
        setHud({wave:gs.wave,gold:gs.gold,lives:gs.lives,score:gs.score,phase:gs.phase,speedMult:gs.speedMult,bossActive:gs.bossActive});
        if(gs.placingType!==placingType) setPlacingType(gs.placingType);
        if(gs.selectedTowerId!==selectedTowerId) setSelectedTowerId(gs.selectedTowerId);
      }
    }

    rafRef.current=requestAnimationFrame((now)=>{ lastTimeRef.current=now; loop(now); });
    return ()=>{ cancelAnimationFrame(rafRef.current); ro.disconnect(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  // Mouse interaction
  function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const gs=gsRef.current;
    if(gs.phase==='menu'||gs.phase==='gameover'||gs.phase==='victory') return;
    const rect=canvasRef.current!.getBoundingClientRect();
    const mx=e.clientX-rect.left, my=e.clientY-rect.top;
    const cs=cellSizeRef.current;
    const col=Math.floor(mx/cs), row=Math.floor(my/cs);

    if(gs.placingType) {
      const key=`${col},${row}`;
      if(!pathCellsRef.current.has(key) && !gs.towers.find(t=>t.col===col&&t.row===row)) {
        const def=TOWER_DEFS[gs.placingType];
        if(gs.gold>=def.cost) {
          const lv=1;
          gs.towers.push({
            id:gs.idCounter++, type:gs.placingType, col, row,
            damage:def.dmg, range:def.range, fireRate:def.rate,
            cooldown:0, level:lv, cost:def.cost,
            aoe:def.aoe, slow:def.slow, suppressedUntil:0,
          });
          gs.gold-=def.cost;
          gs.placingType=null; setPlacingType(null);
        }
      }
      return;
    }

    // Select tower
    const clicked=gs.towers.find(t=>t.col===col&&t.row===row);
    gs.selectedTowerId=clicked?.id??null;
    setSelectedTowerId(clicked?.id??null);
  }

  function handleCanvasMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const gs=gsRef.current;
    if(!gs.placingType) { gs.hoveredCell=null; return; }
    const rect=canvasRef.current!.getBoundingClientRect();
    const mx=e.clientX-rect.left, my=e.clientY-rect.top;
    const cs=cellSizeRef.current;
    gs.hoveredCell={col:Math.floor(mx/cs), row:Math.floor(my/cs)};
  }

  function upgradeTower(id: number) {
    const gs=gsRef.current;
    const t=gs.towers.find(t=>t.id===id); if(!t||t.level>=3) return;
    const upgCost=Math.floor(TOWER_DEFS[t.type].cost*UPGRADE_COSTS[t.level]);
    if(gs.gold<upgCost) return;
    gs.gold-=upgCost; t.level++;
  }

  function sellTower(id: number) {
    const gs=gsRef.current;
    const t=gs.towers.find(t=>t.id===id); if(!t) return;
    gs.gold+=Math.floor(t.cost*0.5);
    gs.towers=gs.towers.filter(t=>t.id!==id);
    gs.selectedTowerId=null; setSelectedTowerId(null);
  }

  const selectedTower = gsRef.current.towers.find(t=>t.id===selectedTowerId);
  const showOverlay = hud.phase==='gameover'||hud.phase==='victory';

  return (
    <div style={{width:'100%',height:'100%',display:'flex',flexDirection:'column',background:'#0a0a14',fontFamily:'system-ui,sans-serif',overflow:'hidden'}}>
    {/* ─── Menu overlay (always keep canvas mounted beneath) ─── */}
    {hud.phase==='menu' && (
      <div style={{position:'absolute',inset:0,zIndex:10,background:'linear-gradient(135deg,rgba(10,22,40,0.97),rgba(26,10,46,0.97))',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:20,padding:20,overflowY:'auto'}}>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:38,fontWeight:900,color:'#ffd700',textShadow:'0 0 30px rgba(255,215,0,0.6)',letterSpacing:2}}>⚔️ TOWER DEFENSE</div>
          <div style={{fontSize:14,color:'#aaa',marginTop:4}}>La Forteresse des Cristaux</div>
        </div>
        <div style={{display:'flex',gap:10,flexWrap:'wrap',justifyContent:'center'}}>
          {([0,1,2] as MapId[]).map(i=>(
            <button key={i} onClick={()=>setSelectedMap(i)} style={{
              padding:'12px 16px', borderRadius:12, cursor:'pointer',
              background:selectedMap===i?'linear-gradient(135deg,#1a3a5c,#2a5a8c)':'rgba(255,255,255,0.07)',
              border:selectedMap===i?'2px solid #5be8ff':'2px solid rgba(255,255,255,0.1)',
              color:'#fff', minWidth:150, transition:'all 0.2s',
            }}>
              <div style={{fontSize:20}}>{MAP_NAMES[i].split(' ')[0]}</div>
              <div style={{fontWeight:700,fontSize:13,margin:'3px 0'}}>{MAP_NAMES[i].substring(2)}</div>
              <div style={{fontSize:11,color:'#aaa'}}>{MAP_DESCS[i]}</div>
            </button>
          ))}
        </div>
        <div style={{display:'flex',gap:10,flexWrap:'wrap',justifyContent:'center'}}>
          {(['campaign','endless','challenge'] as ModeId[]).map(m=>(
            <button key={m} onClick={()=>setSelectedMode(m)} style={{
              padding:'10px 16px', borderRadius:12, cursor:'pointer',
              background:selectedMode===m?'linear-gradient(135deg,#2a1a4a,#4a2a6a)':'rgba(255,255,255,0.07)',
              border:selectedMode===m?'2px solid #aa55ff':'2px solid rgba(255,255,255,0.1)',
              color:'#fff', minWidth:140, transition:'all 0.2s',
            }}>
              <div style={{fontWeight:700,fontSize:13}}>{MODE_NAMES[['campaign','endless','challenge'].indexOf(m)]}</div>
              <div style={{fontSize:11,color:'#aaa',marginTop:3}}>{MODE_DESCS[['campaign','endless','challenge'].indexOf(m)]}</div>
            </button>
          ))}
        </div>
        {gsRef.current.highScores.length>0 && (
          <div style={{color:'#ffd700',fontSize:12,textAlign:'center'}}>
            🏆 {gsRef.current.highScores.map((s,i)=>`#${i+1} ${s.toLocaleString()}`).join('  |  ')}
          </div>
        )}
        <button onClick={()=>{ startGame(selectedMap,selectedMode); }} style={{
          padding:'14px 44px', fontSize:17, fontWeight:800, borderRadius:14, cursor:'pointer',
          background:'linear-gradient(135deg,#f0a020,#e06010)',
          border:'none', color:'#fff', letterSpacing:1,
          boxShadow:'0 4px 20px rgba(240,160,32,0.5)',
        }}>▶ JOUER</button>
        <button onClick={onBack} style={{background:'none',border:'1px solid rgba(255,255,255,0.2)',color:'#aaa',padding:'7px 18px',borderRadius:8,cursor:'pointer',fontSize:12}}>← Retour</button>
      </div>
    )}
      {/* HUD — hidden in menu */}
      {hud.phase!=='menu' && <div style={{display:'flex',alignItems:'center',gap:8,padding:'6px 12px',background:'rgba(0,0,0,0.7)',borderBottom:'1px solid rgba(255,255,255,0.1)',flexShrink:0,flexWrap:'wrap'}}>
        <button onClick={()=>{cancelAnimationFrame(rafRef.current);gsRef.current.phase='menu';setHud(h=>({...h,phase:'menu'}));}} style={{background:'rgba(255,255,255,0.1)',border:'none',color:'#fff',padding:'4px 10px',borderRadius:6,cursor:'pointer',fontSize:13}}>← Retour</button>
        <span style={{color:'#aaa',fontSize:13}}>Vague <span style={{color:'#fff',fontWeight:700}}>{hud.wave}</span>{gsRef.current.mode!=='endless'&&`/${gsRef.current.totalWaves}`}</span>
        <span style={{fontSize:13}}>❤️ <span style={{color:hud.lives<=5?'#ff4444':'#fff',fontWeight:700}}>{hud.lives}</span></span>
        <span style={{fontSize:13}}>🪙 <span style={{color:'#ffd700',fontWeight:700}}>{hud.gold}</span></span>
        <span style={{fontSize:13}}>⭐ <span style={{color:'#aaffaa',fontWeight:700}}>{hud.score.toLocaleString()}</span></span>
        <div style={{marginLeft:'auto',display:'flex',gap:6}}>
          <button onClick={()=>{const gs=gsRef.current;gs.speedMult=gs.speedMult===1?2:1;}} style={{background:hud.speedMult===2?'#f0a020':'rgba(255,255,255,0.15)',border:'none',color:'#fff',padding:'4px 10px',borderRadius:6,cursor:'pointer',fontSize:12,fontWeight:700}}>
            {hud.speedMult===1?'1×':'2×'}
          </button>
        </div>
      </div>}

      <div style={{flex:1,display:'flex',overflow:'hidden',position:'relative'}}>
        {/* Canvas */}
        <div ref={containerRef} style={{flex:1,position:'relative',cursor:placingType?'crosshair':'default'}}>
          <canvas ref={canvasRef} onClick={handleCanvasClick} onMouseMove={handleCanvasMouseMove}
            onMouseLeave={()=>{gsRef.current.hoveredCell=null;}}
            style={{display:'block',width:'100%',height:'100%'}} />
          {showOverlay && (
            <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.75)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16}}>
              <div style={{fontSize:36,fontWeight:900,color:hud.phase==='victory'?'#ffd700':'#ff4444'}}>
                {hud.phase==='victory'?'🏆 VICTOIRE !':'💀 DÉFAITE'}
              </div>
              <div style={{color:'#fff',fontSize:18}}>Score: <span style={{color:'#ffd700',fontWeight:700}}>{hud.score.toLocaleString()}</span></div>
              <button onClick={()=>startGame(gsRef.current.map,gsRef.current.mode)} style={{padding:'12px 32px',fontSize:16,fontWeight:700,borderRadius:10,cursor:'pointer',background:'linear-gradient(135deg,#2266cc,#4488ff)',border:'none',color:'#fff'}}>🔄 Recommencer</button>
              <button onClick={()=>{gsRef.current.phase='menu';setHud(h=>({...h,phase:'menu'}));}} style={{padding:'10px 24px',fontSize:14,fontWeight:600,borderRadius:10,cursor:'pointer',background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.2)',color:'#fff'}}>🗺️ Changer de carte</button>
            </div>
          )}
          {storyMsg && (
            <div style={{position:'absolute',top:8,left:'50%',transform:'translateX(-50%)',background:'rgba(0,0,0,0.8)',color:'#ffe0a0',padding:'8px 18px',borderRadius:8,fontSize:13,maxWidth:'80%',textAlign:'center',border:'1px solid rgba(255,200,80,0.3)',pointerEvents:'none'}}>
              {storyMsg}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div style={{width:170,background:'rgba(0,0,0,0.8)',borderLeft:'1px solid rgba(255,255,255,0.1)',display:'flex',flexDirection:'column',gap:0,overflowY:'auto',flexShrink:0}}>
          {/* Tower shop */}
          <div style={{padding:'8px 8px 4px',color:'#888',fontSize:11,fontWeight:700,letterSpacing:1,textTransform:'uppercase'}}>Tours</div>
          {(Object.entries(TOWER_DEFS) as [TowerType, typeof TOWER_DEFS[TowerType]][]).map(([type,def])=>(
            <button key={type} onClick={()=>{const gs=gsRef.current;gs.placingType=gs.placingType===type?null:type;gs.selectedTowerId=null;setPlacingType(gs.placingType);setSelectedTowerId(null);}}
              style={{
                display:'flex',alignItems:'center',gap:6,padding:'7px 8px',
                background:placingType===type?'rgba(100,180,255,0.2)':'transparent',
                border:placingType===type?'1px solid rgba(100,180,255,0.5)':'1px solid transparent',
                color:'#fff',cursor:hud.gold>=def.cost?'pointer':'not-allowed',
                opacity:hud.gold>=def.cost?1:0.45,
                transition:'background 0.15s',textAlign:'left',
              }}>
              <div style={{width:28,height:28,borderRadius:6,background:def.color,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>
                {type==='archer'?'🏹':type==='mage'?'🔮':type==='cannon'?'⚙️':type==='catapult'?'🪨':type==='ice'?'❄️':'⚡'}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:600,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{def.name}</div>
                <div style={{fontSize:11,color:'#ffd700'}}>{def.cost}🪙</div>
              </div>
            </button>
          ))}

          {/* Selected tower info */}
          {selectedTower && (
            <div style={{margin:8,padding:10,background:'rgba(255,255,255,0.07)',borderRadius:10,border:'1px solid rgba(255,255,255,0.15)'}}>
              <div style={{fontWeight:700,fontSize:13,color:'#fff',marginBottom:6}}>
                {TOWER_DEFS[selectedTower.type].name} Lv{selectedTower.level}
              </div>
              <div style={{fontSize:11,color:'#ccc',lineHeight:1.8}}>
                ⚔️ {Math.round(selectedTower.damage*UPGRADE_DMG[selectedTower.level-1])}<br/>
                🎯 {(selectedTower.range*UPGRADE_RNG[selectedTower.level-1]).toFixed(1)} cells
              </div>
              {selectedTower.level<3 && (
                <button onClick={()=>upgradeTower(selectedTower.id)} style={{
                  marginTop:6,width:'100%',padding:'5px 0',borderRadius:6,cursor:'pointer',
                  background:'linear-gradient(135deg,#1a5ca0,#2a8cd0)',border:'none',color:'#fff',fontSize:11,fontWeight:700,
                  opacity:hud.gold>=Math.floor(TOWER_DEFS[selectedTower.type].cost*UPGRADE_COSTS[selectedTower.level])?1:0.5,
                }}>
                  ⬆ Lv{selectedTower.level+1} — {Math.floor(TOWER_DEFS[selectedTower.type].cost*UPGRADE_COSTS[selectedTower.level])}🪙
                </button>
              )}
              <button onClick={()=>sellTower(selectedTower.id)} style={{
                marginTop:4,width:'100%',padding:'5px 0',borderRadius:6,cursor:'pointer',
                background:'rgba(200,50,50,0.4)',border:'1px solid rgba(200,80,80,0.4)',color:'#ffaaaa',fontSize:11,fontWeight:700,
              }}>
                💰 Vendre ({Math.floor(selectedTower.cost*0.5)}🪙)
              </button>
            </div>
          )}

          {/* Launch wave button */}
          <div style={{marginTop:'auto',padding:8}}>
            {hud.phase==='prep' && (
              <button onClick={launchWave} style={{
                width:'100%',padding:'10px 0',fontWeight:800,fontSize:13,borderRadius:10,cursor:'pointer',
                background:'linear-gradient(135deg,#e05010,#f07020)',border:'none',color:'#fff',
                boxShadow:'0 2px 12px rgba(240,112,32,0.4)',
              }}>
                ▶ Vague {(gsRef.current.wave+1)}
              </button>
            )}
            {hud.phase==='wave' && (
              <div style={{color:'#aaa',fontSize:12,textAlign:'center',padding:'8px 0'}}>
                ⚔️ Vague en cours...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
