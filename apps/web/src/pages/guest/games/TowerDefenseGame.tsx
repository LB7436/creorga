import { useEffect, useRef, useState, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Vec2 { x: number; y: number; }

type EnemyType = 'goblin' | 'orc' | 'boss';
type TowerType = 'archer' | 'mage' | 'cannon' | 'catapulte';
type Phase = 'prep' | 'wave' | 'gameover' | 'victory';

interface Enemy {
  id: number;
  type: EnemyType;
  hp: number;
  maxHp: number;
  speed: number;        // cells/sec
  pathIndex: number;    // current segment index
  progress: number;     // 0..1 along current segment
  x: number;
  y: number;
  reward: number;
  slowUntil: number;   // timestamp ms
  dead: boolean;
  reachedEnd: boolean;
}

interface Tower {
  id: number;
  type: TowerType;
  col: number;
  row: number;
  damage: number;
  range: number;        // cells
  fireRate: number;     // shots/sec
  cooldown: number;     // ms until next shot
  kills: number;
  level: number;
  cost: number;
}

interface Projectile {
  id: number;
  type: TowerType;
  x: number;
  y: number;
  tx: number;
  ty: number;
  speed: number;        // cells/sec
  damage: number;
  aoe: number;          // radius in cells (0 = single)
  slowDuration: number; // ms
  targetId: number;
  dead: boolean;
  trail: Vec2[];
}

interface GoldPopup {
  id: number;
  x: number;
  y: number;
  amount: number;
  age: number;          // ms
  maxAge: number;
}

interface GameState {
  phase: Phase;
  wave: number;
  gold: number;
  lives: number;
  score: number;
  speed: number;        // 1 or 2
  frameCount: number;

  enemies: Enemy[];
  towers: Tower[];
  projectiles: Projectile[];
  popups: GoldPopup[];

  placingType: TowerType | null;
  selectedTowerId: number | null;
  hoveredCell: Vec2 | null;

  enemyIdSeq: number;
  towerIdSeq: number;
  projectileIdSeq: number;
  popupIdSeq: number;

  spawnQueue: Array<{ type: EnemyType; delay: number }>;
  spawnTimer: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COLS = 20;
const ROWS = 12;

const PATH_WAYPOINTS: Vec2[] = [
  { x: 0, y: 3 },
  { x: 4, y: 3 },
  { x: 4, y: 8 },
  { x: 10, y: 8 },
  { x: 10, y: 2 },
  { x: 16, y: 2 },
  { x: 16, y: 9 },
  { x: 19, y: 9 },
];

// Build a set of grid cells that the path passes through
const PATH_CELLS = new Set<string>();
for (let i = 0; i < PATH_WAYPOINTS.length - 1; i++) {
  const a = PATH_WAYPOINTS[i];
  const b = PATH_WAYPOINTS[i + 1];
  if (a.x === b.x) {
    const mn = Math.min(a.y, b.y);
    const mx = Math.max(a.y, b.y);
    for (let r = mn; r <= mx; r++) PATH_CELLS.add(`${a.x},${r}`);
  } else {
    const mn = Math.min(a.x, b.x);
    const mx = Math.max(a.x, b.x);
    for (let c = mn; c <= mx; c++) PATH_CELLS.add(`${c},${a.y}`);
  }
}

const TOWER_DEFS: Record<TowerType, {
  name: string; cost: number; damage: number;
  range: number; fireRate: number; aoe: number; slowDuration: number;
}> = {
  archer:    { name: 'Archer',    cost: 100, damage: 15,  range: 3.5, fireRate: 1.5, aoe: 0,   slowDuration: 0    },
  mage:      { name: 'Mage',      cost: 150, damage: 30,  range: 4.0, fireRate: 0.8, aoe: 0,   slowDuration: 0    },
  cannon:    { name: 'Canon',     cost: 200, damage: 60,  range: 3.0, fireRate: 0.4, aoe: 1.0, slowDuration: 0    },
  catapulte: { name: 'Catapulte', cost: 250, damage: 20,  range: 4.5, fireRate: 0.5, aoe: 1.5, slowDuration: 2000 },
};

const ENEMY_DEFS: Record<EnemyType, {
  hp: number; speed: number; reward: number; size: number;
}> = {
  goblin: { hp: 80,  speed: 0.40, reward: 10, size: 0.35 },
  orc:    { hp: 220, speed: 0.25, reward: 20, size: 0.45 },
  boss:   { hp: 900, speed: 0.15, reward: 75, size: 0.65 },
};

const WAVES: Array<Array<{ type: EnemyType; count: number; interval: number }>> = [
  [{ type: 'goblin', count: 6,  interval: 1200 }],
  [{ type: 'goblin', count: 10, interval: 1000 }],
  [{ type: 'goblin', count: 8,  interval: 900  }, { type: 'orc', count: 2, interval: 1500 }],
  [{ type: 'orc',    count: 6,  interval: 1200 }],
  [{ type: 'goblin', count: 12, interval: 700  }, { type: 'orc', count: 4, interval: 1200 }],
  [{ type: 'orc',    count: 8,  interval: 1000 }, { type: 'boss', count: 1, interval: 3000 }],
  [{ type: 'goblin', count: 15, interval: 600  }, { type: 'orc', count: 6, interval: 1000 }],
  [{ type: 'orc',    count: 10, interval: 800  }, { type: 'boss', count: 2, interval: 2500 }],
];

const UPGRADE_COST_RATIO = 0.75;

// ─── Canvas drawing helpers ───────────────────────────────────────────────────

function drawHealthBar(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, width: number,
  hp: number, maxHp: number,
) {
  const h = 4;
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(cx - width / 2, cy, width, h);
  const ratio = Math.max(0, hp / maxHp);
  ctx.fillStyle = ratio > 0.5 ? '#22cc22' : ratio > 0.25 ? '#ddcc00' : '#cc2222';
  ctx.fillRect(cx - width / 2, cy, width * ratio, h);
}

function drawGoblin(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, r: number,
  legPhase: number, hp: number, maxHp: number,
) {
  const lo = Math.sin(legPhase * Math.PI * 2) * r * 0.4;

  // legs
  ctx.strokeStyle = '#2d6b2d';
  ctx.lineWidth = r * 0.18;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x - r * 0.2, y + r * 0.5); ctx.lineTo(x - r * 0.2, y + r * 0.9 + lo);  ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + r * 0.2, y + r * 0.5); ctx.lineTo(x + r * 0.2, y + r * 0.9 - lo);  ctx.stroke();

  // body
  ctx.fillStyle = '#3a8a3a';
  ctx.beginPath(); ctx.ellipse(x, y + r * 0.25, r * 0.55, r * 0.45, 0, 0, Math.PI * 2); ctx.fill();

  // head
  ctx.fillStyle = '#4dab4d';
  ctx.beginPath(); ctx.arc(x, y - r * 0.15, r * 0.4, 0, Math.PI * 2); ctx.fill();

  // horns
  ctx.fillStyle = '#2a5a2a';
  ctx.beginPath(); ctx.moveTo(x - r * 0.25, y - r * 0.5); ctx.lineTo(x - r * 0.1, y - r * 0.58); ctx.lineTo(x - r * 0.18, y - r * 0.35); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x + r * 0.25, y - r * 0.5); ctx.lineTo(x + r * 0.1, y - r * 0.58); ctx.lineTo(x + r * 0.18, y - r * 0.35); ctx.closePath(); ctx.fill();

  // eyes
  ctx.fillStyle = 'white';
  ctx.beginPath(); ctx.arc(x - r * 0.15, y - r * 0.18, r * 0.1,  0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.15, y - r * 0.18, r * 0.1,  0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#111';
  ctx.beginPath(); ctx.arc(x - r * 0.13, y - r * 0.16, r * 0.05, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.17, y - r * 0.16, r * 0.05, 0, Math.PI * 2); ctx.fill();

  drawHealthBar(ctx, x, y - r * 0.65, r * 1.2, hp, maxHp);
}

function drawOrc(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, r: number,
  legPhase: number, hp: number, maxHp: number,
) {
  const lo = Math.sin(legPhase * Math.PI * 2) * r * 0.35;

  // legs
  ctx.strokeStyle = '#b04000';
  ctx.lineWidth = r * 0.22;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x - r * 0.25, y + r * 0.55); ctx.lineTo(x - r * 0.25, y + r * 1.0 + lo); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + r * 0.25, y + r * 0.55); ctx.lineTo(x + r * 0.25, y + r * 1.0 - lo); ctx.stroke();

  // shoulders
  ctx.fillStyle = '#cc5500';
  ctx.beginPath(); ctx.arc(x - r * 0.6, y + r * 0.1, r * 0.28, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.6, y + r * 0.1, r * 0.28, 0, Math.PI * 2); ctx.fill();

  // body
  ctx.fillStyle = '#e05500';
  ctx.beginPath(); ctx.ellipse(x, y + r * 0.15, r * 0.65, r * 0.55, 0, 0, Math.PI * 2); ctx.fill();

  // head
  ctx.fillStyle = '#d04800';
  ctx.beginPath(); ctx.arc(x, y - r * 0.2, r * 0.48, 0, Math.PI * 2); ctx.fill();

  // angry eyebrows
  ctx.strokeStyle = '#6b1a00';
  ctx.lineWidth = r * 0.1;
  ctx.beginPath(); ctx.moveTo(x - r * 0.38, y - r * 0.35); ctx.lineTo(x - r * 0.1, y - r * 0.25); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + r * 0.38, y - r * 0.35); ctx.lineTo(x + r * 0.1, y - r * 0.25); ctx.stroke();

  // eyes
  ctx.fillStyle = '#ffdd00';
  ctx.beginPath(); ctx.arc(x - r * 0.18, y - r * 0.18, r * 0.1, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.18, y - r * 0.18, r * 0.1, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#111';
  ctx.beginPath(); ctx.arc(x - r * 0.17, y - r * 0.17, r * 0.05, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.19, y - r * 0.17, r * 0.05, 0, Math.PI * 2); ctx.fill();

  drawHealthBar(ctx, x, y - r * 0.82, r * 1.4, hp, maxHp);
}

function drawBoss(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, r: number,
  legPhase: number, now: number, hp: number, maxHp: number,
) {
  const lo = Math.sin(legPhase * Math.PI * 2) * r * 0.3;
  const pulse = 0.7 + 0.3 * Math.sin(now / 300);

  // glow aura
  const grd = ctx.createRadialGradient(x, y, r * 0.2, x, y, r * 1.5);
  grd.addColorStop(0, `rgba(120,0,200,${0.3 * pulse})`);
  grd.addColorStop(1, 'rgba(120,0,200,0)');
  ctx.fillStyle = grd;
  ctx.beginPath(); ctx.arc(x, y, r * 1.5, 0, Math.PI * 2); ctx.fill();

  // legs
  ctx.strokeStyle = '#2d0060';
  ctx.lineWidth = r * 0.28;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x - r * 0.3, y + r * 0.7); ctx.lineTo(x - r * 0.3, y + r * 0.7 + r * 0.55 + lo); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + r * 0.3, y + r * 0.7); ctx.lineTo(x + r * 0.3, y + r * 0.7 + r * 0.55 - lo); ctx.stroke();

  // body
  ctx.fillStyle = '#3d0080';
  ctx.beginPath(); ctx.ellipse(x, y + r * 0.2, r * 0.8, r * 0.7, 0, 0, Math.PI * 2); ctx.fill();

  // head
  ctx.fillStyle = '#4a0099';
  ctx.beginPath(); ctx.arc(x, y - r * 0.3, r * 0.6, 0, Math.PI * 2); ctx.fill();

  // crown
  ctx.fillStyle = '#ffd700';
  ctx.beginPath();
  ctx.moveTo(x - r * 0.5,  y - r * 0.85);
  ctx.lineTo(x - r * 0.5,  y - r * 1.15);
  ctx.lineTo(x - r * 0.25, y - r * 1.0);
  ctx.lineTo(x,             y - r * 1.22);
  ctx.lineTo(x + r * 0.25, y - r * 1.0);
  ctx.lineTo(x + r * 0.5,  y - r * 1.15);
  ctx.lineTo(x + r * 0.5,  y - r * 0.85);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#cc8800';
  ctx.lineWidth = r * 0.05;
  ctx.stroke();

  // glowing red eyes
  const eyeAlpha = 0.8 + 0.2 * Math.sin(now / 200);
  ctx.shadowColor = 'red';
  ctx.shadowBlur = r * 0.35;
  ctx.fillStyle = `rgba(255,0,0,${eyeAlpha})`;
  ctx.beginPath(); ctx.arc(x - r * 0.2, y - r * 0.35, r * 0.13, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.2, y - r * 0.35, r * 0.13, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;

  drawHealthBar(ctx, x, y - r * 1.38, r * 1.9, hp, maxHp);
}

function drawArcherTower(ctx: CanvasRenderingContext2D, cx: number, cy: number, cw: number) {
  const r = cw * 0.42;
  const bg = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  bg.addColorStop(0, '#aaa'); bg.addColorStop(1, '#777');
  ctx.fillStyle = bg;
  ctx.strokeStyle = '#555'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(cx - r, cy - r * 0.6, r * 2, r * 1.6, 4); ctx.fill(); ctx.stroke();
  // battlements
  ctx.fillStyle = '#999';
  for (let i = 0; i < 3; i++) ctx.fillRect(cx - r + i * r * 0.7, cy - r * 0.6 - 6, r * 0.45, 7);
  // platform
  ctx.fillStyle = '#8B5E3C';
  ctx.fillRect(cx - r * 0.6, cy - r * 0.5, r * 1.2, 4);
  // archer figure head
  ctx.fillStyle = '#ffcc99';
  ctx.beginPath(); ctx.arc(cx, cy - r * 0.3, 4, 0, Math.PI * 2); ctx.fill();
  // body
  ctx.strokeStyle = '#eee'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx, cy - r * 0.3 + 4); ctx.lineTo(cx, cy + r * 0.1); ctx.stroke();
  // bow
  ctx.strokeStyle = '#8B5E3C'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(cx + 6, cy - r * 0.1, 6, -Math.PI / 2, Math.PI / 2); ctx.stroke();
  // arrow
  ctx.strokeStyle = '#ccc'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(cx - 4, cy - r * 0.1); ctx.lineTo(cx + 6, cy - r * 0.1); ctx.stroke();
}

function drawMageTower(ctx: CanvasRenderingContext2D, cx: number, cy: number, cw: number, now: number) {
  const r = cw * 0.4;
  const pulse = 0.7 + 0.3 * Math.sin(now / 400);
  // aura
  const aura = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r * 1.5);
  aura.addColorStop(0, `rgba(100,0,220,${0.2 * pulse})`);
  aura.addColorStop(1, 'rgba(100,0,220,0)');
  ctx.fillStyle = aura;
  ctx.beginPath(); ctx.arc(cx, cy, r * 1.5, 0, Math.PI * 2); ctx.fill();
  // tower body
  const tg = ctx.createLinearGradient(cx - r * 0.7, cy, cx + r * 0.7, cy);
  tg.addColorStop(0, '#4a0099'); tg.addColorStop(0.5, '#7700ee'); tg.addColorStop(1, '#3a0077');
  ctx.fillStyle = tg; ctx.strokeStyle = '#9933ff'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(cx - r * 0.55, cy - r * 1.1, r * 1.1, r * 2, [r * 0.3, r * 0.3, 4, 4]); ctx.fill(); ctx.stroke();
  // spire
  ctx.fillStyle = '#5500bb';
  ctx.beginPath(); ctx.moveTo(cx - r * 0.55, cy - r * 1.1); ctx.lineTo(cx, cy - r * 1.7); ctx.lineTo(cx + r * 0.55, cy - r * 1.1); ctx.closePath(); ctx.fill(); ctx.stroke();
  // star
  ctx.fillStyle = `rgba(200,150,255,${pulse})`;
  ctx.shadowColor = '#cc88ff'; ctx.shadowBlur = 8;
  drawStar(ctx, cx, cy - r * 1.62, 4, 5);
  ctx.shadowBlur = 0;
  // window
  ctx.fillStyle = `rgba(180,100,255,${0.5 * pulse})`;
  ctx.beginPath(); ctx.arc(cx, cy - r * 0.3, r * 0.22, 0, Math.PI * 2); ctx.fill();
}

function drawCannonTower(ctx: CanvasRenderingContext2D, cx: number, cy: number, cw: number) {
  const r = cw * 0.42;
  const bg = ctx.createLinearGradient(cx - r, cy - r * 0.5, cx + r, cy + r);
  bg.addColorStop(0, '#666'); bg.addColorStop(1, '#333');
  ctx.fillStyle = bg; ctx.strokeStyle = '#222'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(cx - r, cy - r * 0.5, r * 2, r * 1.5, 5); ctx.fill(); ctx.stroke();
  // mount
  ctx.fillStyle = '#444'; ctx.strokeStyle = '#222';
  ctx.beginPath(); ctx.arc(cx, cy + r * 0.1, r * 0.55, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // barrel
  ctx.save(); ctx.translate(cx + r * 0.15, cy + r * 0.05); ctx.rotate(-0.2);
  ctx.fillStyle = '#111'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(-r * 0.12, -r * 0.08, r * 0.7, r * 0.16, 3); ctx.fill(); ctx.stroke();
  ctx.restore();
  // wheels
  ctx.fillStyle = '#5a3a1a'; ctx.strokeStyle = '#2a1a00'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(cx - r * 0.35, cy + r * 0.55, r * 0.22, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx + r * 0.35, cy + r * 0.55, r * 0.22, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
}

function drawCatapulteTower(ctx: CanvasRenderingContext2D, cx: number, cy: number, cw: number) {
  const r = cw * 0.42;
  ctx.fillStyle = '#6B3A2A'; ctx.strokeStyle = '#3a1a00'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(cx - r, cy - r * 0.3, r * 2, r * 1.3, 4); ctx.fill(); ctx.stroke();
  // frame
  ctx.strokeStyle = '#4a2010'; ctx.lineWidth = r * 0.12; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx - r * 0.5, cy); ctx.lineTo(cx - r * 0.3, cy - r * 0.9); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + r * 0.5, cy); ctx.lineTo(cx + r * 0.3, cy - r * 0.9); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - r * 0.3, cy - r * 0.9); ctx.lineTo(cx + r * 0.3, cy - r * 0.9); ctx.stroke();
  // arm
  ctx.strokeStyle = '#7a4a30'; ctx.lineWidth = r * 0.1;
  ctx.beginPath(); ctx.moveTo(cx - r * 0.05, cy - r * 0.9); ctx.lineTo(cx + r * 0.55, cy - r * 0.4); ctx.stroke();
  // sling rock
  ctx.fillStyle = '#cc6600';
  ctx.beginPath(); ctx.arc(cx + r * 0.6, cy - r * 0.35, r * 0.15, 0, Math.PI * 2); ctx.fill();
  // wheels
  ctx.fillStyle = '#5a3a1a'; ctx.strokeStyle = '#2a1a00'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(cx - r * 0.4, cy + r * 0.6, r * 0.25, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx + r * 0.4, cy + r * 0.6, r * 0.25, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, points: number) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const radius = i % 2 === 0 ? r : r * 0.45;
    ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
  }
  ctx.closePath();
  ctx.fill();
}

// ─── Geometry helpers ─────────────────────────────────────────────────────────

function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}

function segmentLength(idx: number): number {
  if (idx >= PATH_WAYPOINTS.length - 1) return 0;
  const a = PATH_WAYPOINTS[idx];
  const b = PATH_WAYPOINTS[idx + 1];
  return Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
}

function posOnPath(pathIndex: number, progress: number, cw: number, ch: number): Vec2 {
  if (pathIndex >= PATH_WAYPOINTS.length - 1) {
    const last = PATH_WAYPOINTS[PATH_WAYPOINTS.length - 1];
    return { x: (last.x + 0.5) * cw, y: (last.y + 0.5) * ch };
  }
  const a = PATH_WAYPOINTS[pathIndex];
  const b = PATH_WAYPOINTS[pathIndex + 1];
  return {
    x: (a.x + (b.x - a.x) * progress + 0.5) * cw,
    y: (a.y + (b.y - a.y) * progress + 0.5) * ch,
  };
}

// ─── Wave queue builder ───────────────────────────────────────────────────────

function buildSpawnQueue(waveIndex: number): Array<{ type: EnemyType; delay: number }> {
  const def = WAVES[waveIndex] ?? WAVES[WAVES.length - 1];
  const queue: Array<{ type: EnemyType; delay: number }> = [];
  for (const group of def) {
    for (let i = 0; i < group.count; i++) queue.push({ type: group.type, delay: group.interval });
  }
  return queue;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props { onBack: () => void; }

export default function TowerDefenseGame({ onBack }: Props) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cellRef      = useRef({ w: 64, h: 48 });
  const rafRef       = useRef<number>(0);

  const gs = useRef<GameState>({
    phase: 'prep', wave: 0, gold: 150, lives: 30, score: 0, speed: 1, frameCount: 0,
    enemies: [], towers: [], projectiles: [], popups: [],
    placingType: null, selectedTowerId: null, hoveredCell: null,
    enemyIdSeq: 0, towerIdSeq: 0, projectileIdSeq: 0, popupIdSeq: 0,
    spawnQueue: [], spawnTimer: 0,
  });

  const [hud, setHud] = useState({
    gold: 150, lives: 30, wave: 0, score: 0,
    phase: 'prep' as Phase, speed: 1,
    placingType: null as TowerType | null,
    selectedTowerId: null as number | null,
  });

  const syncHud = useCallback(() => {
    const g = gs.current;
    setHud({ gold: g.gold, lives: g.lives, wave: g.wave, score: g.score, phase: g.phase, speed: g.speed, placingType: g.placingType, selectedTowerId: g.selectedTowerId });
  }, []);

  // ─── RAF loop ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const canvas    = canvasRef.current!;
    const container = containerRef.current!;
    const ctx       = canvas.getContext('2d')!;

    const resize = () => {
      const r = container.getBoundingClientRect();
      canvas.width  = r.width;
      canvas.height = r.height;
      cellRef.current = { w: r.width / COLS, h: r.height / ROWS };
    };
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();

    let prev = performance.now();

    const loop = (now: number) => {
      const g = gs.current;
      const rawDt = Math.min((now - prev) / 1000, 0.05);
      prev = now;
      const dt = rawDt * g.speed;
      const { w: cw, h: ch } = cellRef.current;
      const W = canvas.width, H = canvas.height;

      // ── UPDATE ────────────────────────────────────────────────────────────

      if (g.phase === 'wave') {
        // spawn
        if (g.spawnQueue.length > 0) {
          g.spawnTimer -= dt * 1000;
          if (g.spawnTimer <= 0) {
            const next = g.spawnQueue.shift()!;
            const def  = ENEMY_DEFS[next.type];
            const scl  = 1 + g.wave * 0.15;
            g.enemies.push({
              id: ++g.enemyIdSeq, type: next.type,
              hp: def.hp * scl, maxHp: def.hp * scl,
              speed: def.speed, pathIndex: 0, progress: 0,
              x: (PATH_WAYPOINTS[0].x + 0.5) * cw,
              y: (PATH_WAYPOINTS[0].y + 0.5) * ch,
              reward: def.reward, slowUntil: 0, dead: false, reachedEnd: false,
            });
            g.spawnTimer = g.spawnQueue.length > 0 ? g.spawnQueue[0].delay : 0;
          }
        }

        // move enemies
        for (const e of g.enemies) {
          if (e.dead || e.reachedEnd) continue;
          const slowed   = now < e.slowUntil;
          const spd      = e.speed * (slowed ? 0.4 : 1);
          let remaining  = spd * dt;

          while (remaining > 0 && e.pathIndex < PATH_WAYPOINTS.length - 1) {
            const seg = segmentLength(e.pathIndex);
            const avail = seg * (1 - e.progress);
            if (remaining >= avail) {
              remaining -= avail;
              e.pathIndex++;
              e.progress = 0;
            } else {
              e.progress += remaining / seg;
              remaining = 0;
            }
          }

          const pos = posOnPath(e.pathIndex, e.progress, cw, ch);
          e.x = pos.x; e.y = pos.y;

          if (e.pathIndex >= PATH_WAYPOINTS.length - 1) {
            e.reachedEnd = true;
            g.lives = Math.max(0, g.lives - 1);
            if (g.lives <= 0) g.phase = 'gameover';
          }
        }

        // tower shooting
        for (const t of g.towers) {
          t.cooldown -= dt * 1000;
          if (t.cooldown > 0) continue;
          const rPx = t.range * cw;
          const tx  = (t.col + 0.5) * cw;
          const ty  = (t.row + 0.5) * ch;

          // target furthest along path within range
          let target: Enemy | null = null;
          let bestScore = -Infinity;
          for (const e of g.enemies) {
            if (e.dead || e.reachedEnd) continue;
            if (dist(tx, ty, e.x, e.y) > rPx) continue;
            const score = e.pathIndex * 1000 + e.progress;
            if (score > bestScore) { bestScore = score; target = e; }
          }
          if (!target) continue;

          t.cooldown = 1000 / t.fireRate;
          const def = TOWER_DEFS[t.type];
          g.projectiles.push({
            id: ++g.projectileIdSeq, type: t.type,
            x: tx, y: ty, tx: target.x, ty: target.y,
            speed: t.type === 'cannon' ? 5 : t.type === 'catapulte' ? 3.5 : 8,
            damage: t.damage, aoe: def.aoe, slowDuration: def.slowDuration,
            targetId: target.id, dead: false, trail: [],
          });
        }

        // move projectiles
        for (const p of g.projectiles) {
          if (p.dead) continue;
          p.trail.push({ x: p.x, y: p.y });
          if (p.trail.length > 6) p.trail.shift();
          const dx = p.tx - p.x, dy = p.ty - p.y;
          const d  = Math.sqrt(dx * dx + dy * dy);
          const step = p.speed * cw * dt;

          if (d <= step + 2) {
            p.dead = true;
            if (p.aoe > 0) {
              const aoeR = p.aoe * cw;
              for (const e of g.enemies) {
                if (e.dead || e.reachedEnd) continue;
                if (dist(p.tx, p.ty, e.x, e.y) <= aoeR) {
                  e.hp -= p.damage;
                  if (p.slowDuration > 0) e.slowUntil = now + p.slowDuration;
                  if (e.hp <= 0) killEnemy(g, e, now, cw, ch);
                }
              }
            } else {
              const tgt = g.enemies.find(e => e.id === p.targetId);
              if (tgt && !tgt.dead) {
                tgt.hp -= p.damage;
                if (p.slowDuration > 0) tgt.slowUntil = now + p.slowDuration;
                if (tgt.hp <= 0) killEnemy(g, tgt, now, cw, ch);
              }
            }
          } else {
            p.x += (dx / d) * step;
            p.y += (dy / d) * step;
          }
        }

        // age popups
        for (const pop of g.popups) pop.age += dt * 1000;

        // cleanup
        g.enemies     = g.enemies.filter(e => !e.dead && !e.reachedEnd);
        g.projectiles = g.projectiles.filter(p => !p.dead);
        g.popups      = g.popups.filter(p => p.age < p.maxAge);

        // wave complete?
        if (g.spawnQueue.length === 0 && g.enemies.length === 0 && g.phase === 'wave') {
          g.phase = g.wave >= WAVES.length ? 'victory' : 'prep';
          if (g.phase === 'prep') g.score += 100 * g.wave;
        }
      }

      // ── DRAW ──────────────────────────────────────────────────────────────

      ctx.clearRect(0, 0, W, H);

      // grass
      ctx.fillStyle = '#2d5a1b';
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 0.5;
      for (let c = 0; c <= COLS; c++) { ctx.beginPath(); ctx.moveTo(c * cw, 0); ctx.lineTo(c * cw, H); ctx.stroke(); }
      for (let r = 0; r <= ROWS; r++) { ctx.beginPath(); ctx.moveTo(0, r * ch); ctx.lineTo(W, r * ch); ctx.stroke(); }

      // path (dirt road)
      for (const key of PATH_CELLS) {
        const [c, r] = key.split(',').map(Number);
        ctx.fillStyle = '#c8a96e';
        ctx.fillRect(c * cw + 0.5, r * ch + 0.5, cw - 1, ch - 1);
        ctx.strokeStyle = 'rgba(150,100,50,0.3)'; ctx.lineWidth = 1;
        for (let i = 1; i < 3; i++) {
          ctx.beginPath(); ctx.moveTo(c * cw + (cw * i) / 3, r * ch); ctx.lineTo(c * cw + (cw * i) / 3, (r + 1) * ch); ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(100,70,30,0.25)'; ctx.lineWidth = 1.5;
        ctx.strokeRect(c * cw + 0.5, r * ch + 0.5, cw - 1, ch - 1);
      }

      // placement hover highlight + range preview
      if (g.placingType && g.hoveredCell) {
        const { x: hc, y: hr } = g.hoveredCell;
        const valid = !PATH_CELLS.has(`${hc},${hr}`) && !g.towers.some(t => t.col === hc && t.row === hr);
        ctx.fillStyle = valid ? 'rgba(0,255,100,0.22)' : 'rgba(255,50,50,0.22)';
        ctx.fillRect(hc * cw, hr * ch, cw, ch);
        const rPx = TOWER_DEFS[g.placingType].range * cw;
        ctx.strokeStyle = valid ? 'rgba(0,255,100,0.5)' : 'rgba(255,50,50,0.5)';
        ctx.lineWidth = 1.5; ctx.setLineDash([6, 4]);
        ctx.beginPath(); ctx.arc((hc + 0.5) * cw, (hr + 0.5) * ch, rPx, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
      }

      // selected tower range ring
      if (g.selectedTowerId !== null && !g.placingType) {
        const st = g.towers.find(t => t.id === g.selectedTowerId);
        if (st) {
          const rPx = st.range * cw;
          ctx.fillStyle = 'rgba(255,220,50,0.05)';
          ctx.beginPath(); ctx.arc((st.col + 0.5) * cw, (st.row + 0.5) * ch, rPx, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = 'rgba(255,220,50,0.55)'; ctx.lineWidth = 1.5; ctx.setLineDash([6, 4]);
          ctx.beginPath(); ctx.arc((st.col + 0.5) * cw, (st.row + 0.5) * ch, rPx, 0, Math.PI * 2); ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // towers
      for (const t of g.towers) {
        const cx2 = (t.col + 0.5) * cw, cy2 = (t.row + 0.5) * ch;
        ctx.save();
        switch (t.type) {
          case 'archer':    drawArcherTower(ctx, cx2, cy2, cw);       break;
          case 'mage':      drawMageTower(ctx, cx2, cy2, cw, now);    break;
          case 'cannon':    drawCannonTower(ctx, cx2, cy2, cw);       break;
          case 'catapulte': drawCatapulteTower(ctx, cx2, cy2, cw);    break;
        }
        if (t.level > 1) {
          ctx.fillStyle = '#ffd700';
          ctx.font = `bold ${Math.max(9, cw * 0.18)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText(`★${t.level}`, cx2, cy2 + ch * 0.4);
        }
        if (t.id === g.selectedTowerId) {
          ctx.strokeStyle = 'rgba(255,220,50,0.9)'; ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.roundRect(t.col * cw + 2, t.row * ch + 2, cw - 4, ch - 4, 4); ctx.stroke();
        }
        ctx.restore();
      }

      // projectiles
      for (const p of g.projectiles) {
        ctx.save();
        if (p.type === 'archer') {
          if (p.trail.length > 1) {
            const prev2 = p.trail[p.trail.length - 1];
            const angle = Math.atan2(p.y - prev2.y, p.x - prev2.x);
            ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(p.x - Math.cos(angle) * 8, p.y - Math.sin(angle) * 8); ctx.lineTo(p.x, p.y); ctx.stroke();
            ctx.fillStyle = '#ffd700';
            ctx.beginPath(); ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x - Math.cos(angle - 0.4) * 5, p.y - Math.sin(angle - 0.4) * 5);
            ctx.lineTo(p.x - Math.cos(angle + 0.4) * 5, p.y - Math.sin(angle + 0.4) * 5);
            ctx.closePath(); ctx.fill();
          }
        } else if (p.type === 'mage') {
          for (let i = 0; i < p.trail.length; i++) {
            const t2 = p.trail[i];
            ctx.fillStyle = `rgba(180,50,255,${(i / p.trail.length) * 0.5})`;
            ctx.beginPath(); ctx.arc(t2.x, t2.y, 3 + i * 0.5, 0, Math.PI * 2); ctx.fill();
          }
          ctx.shadowColor = '#cc00ff'; ctx.shadowBlur = 12;
          const g2 = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 6);
          g2.addColorStop(0, '#ff88ff'); g2.addColorStop(1, '#8800cc');
          ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, Math.PI * 2); ctx.fill();
          ctx.shadowBlur = 0;
        } else {
          for (let i = 0; i < p.trail.length; i++) {
            const t2 = p.trail[i];
            ctx.fillStyle = `rgba(80,80,80,${(i / p.trail.length) * 0.3})`;
            ctx.beginPath(); ctx.arc(t2.x, t2.y, 4, 0, Math.PI * 2); ctx.fill();
          }
          const bg2 = ctx.createRadialGradient(p.x - 2, p.y - 2, 0, p.x, p.y, p.type === 'catapulte' ? 6 : 5);
          bg2.addColorStop(0, '#999'); bg2.addColorStop(1, '#222');
          ctx.fillStyle = bg2;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.type === 'catapulte' ? 6 : 5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }

      // enemies
      for (const e of g.enemies) {
        if (e.dead || e.reachedEnd) continue;
        const r = ENEMY_DEFS[e.type].size * cw;
        const legPhase = ((e.pathIndex + e.progress) * 3 + now * 0.004) % 1;
        ctx.save();
        switch (e.type) {
          case 'goblin': drawGoblin(ctx, e.x, e.y, r, legPhase, e.hp, e.maxHp); break;
          case 'orc':    drawOrc(ctx, e.x, e.y, r, legPhase, e.hp, e.maxHp);    break;
          case 'boss':   drawBoss(ctx, e.x, e.y, r, legPhase, now, e.hp, e.maxHp); break;
        }
        ctx.restore();
      }

      // gold popups
      for (const pop of g.popups) {
        const t = pop.age / pop.maxAge;
        ctx.save();
        ctx.globalAlpha = 1 - t;
        ctx.font = `bold ${Math.max(12, cw * 0.22)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#000'; ctx.lineWidth = 2.5;
        ctx.strokeText(`+${pop.amount}`, pop.x, pop.y - 30 * t);
        ctx.fillStyle = '#ffd700';
        ctx.fillText(`+${pop.amount}`, pop.x, pop.y - 30 * t);
        ctx.restore();
      }

      // HUD sync every 8 frames
      g.frameCount++;
      if (g.frameCount % 8 === 0) syncHud();

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect(); };
  }, [syncHud]);

  // ─── Enemy kill helper ────────────────────────────────────────────────────

  function killEnemy(g: GameState, e: Enemy, _now: number, cw: number, _ch: number) {
    e.dead = true;
    e.hp = 0;
    g.gold += e.reward;
    g.score += e.reward * 2;
    // credit a kill to nearest tower that could have shot it
    const nearest = g.towers.reduce<Tower | null>((best, t) => {
      const d2 = dist((t.col + 0.5) * cw, (t.row + 0.5) * cw, e.x, e.y);
      if (d2 > t.range * cw) return best;
      if (!best) return t;
      return d2 < dist((best.col + 0.5) * cw, (best.row + 0.5) * cw, e.x, e.y) ? t : best;
    }, null);
    if (nearest) nearest.kills++;
    g.popups.push({ id: ++g.popupIdSeq, x: e.x, y: e.y, amount: e.reward, age: 0, maxAge: 1000 });
  }

  // ─── Canvas event handlers ────────────────────────────────────────────────

  const handleClick = useCallback((ev: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect   = canvas.getBoundingClientRect();
    const mx = ev.clientX - rect.left;
    const my = ev.clientY - rect.top;
    const { w: cw, h: ch } = cellRef.current;
    const col = Math.floor(mx / cw);
    const row = Math.floor(my / ch);
    const g   = gs.current;

    if (g.placingType) {
      const valid = !PATH_CELLS.has(`${col},${row}`) && !g.towers.some(t => t.col === col && t.row === row);
      if (valid && g.gold >= TOWER_DEFS[g.placingType].cost) {
        const def = TOWER_DEFS[g.placingType];
        g.gold -= def.cost;
        g.towers.push({
          id: ++g.towerIdSeq, type: g.placingType, col, row,
          damage: def.damage, range: def.range, fireRate: def.fireRate,
          cooldown: 0, kills: 0, level: 1, cost: def.cost,
        });
        g.placingType = null;
        syncHud();
      }
    } else {
      const clicked = g.towers.find(t => t.col === col && t.row === row);
      g.selectedTowerId = clicked ? clicked.id : null;
      syncHud();
    }
  }, [syncHud]);

  const handleMouseMove = useCallback((ev: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect   = canvas.getBoundingClientRect();
    const { w: cw, h: ch } = cellRef.current;
    gs.current.hoveredCell = {
      x: Math.floor((ev.clientX - rect.left) / cw),
      y: Math.floor((ev.clientY - rect.top) / ch),
    };
  }, []);

  const handleMouseLeave = useCallback(() => { gs.current.hoveredCell = null; }, []);

  // ─── Control handlers ──────────────────────────────────────────────────────

  const startWave = useCallback(() => {
    const g = gs.current;
    if (g.phase !== 'prep' || g.wave >= WAVES.length) return;
    const queue  = buildSpawnQueue(g.wave);
    g.spawnQueue = queue;
    g.spawnTimer = queue[0]?.delay ?? 0;
    g.phase = 'wave';
    g.wave++;
    syncHud();
  }, [syncHud]);

  const selectTower = useCallback((type: TowerType) => {
    const g = gs.current;
    g.placingType     = g.placingType === type ? null : type;
    g.selectedTowerId = null;
    syncHud();
  }, [syncHud]);

  const setSpeed = useCallback((s: number) => { gs.current.speed = s; syncHud(); }, [syncHud]);

  const upgradeTower = useCallback(() => {
    const g = gs.current;
    if (g.selectedTowerId === null) return;
    const t = g.towers.find(t2 => t2.id === g.selectedTowerId);
    if (!t) return;
    const cost = Math.floor(t.cost * UPGRADE_COST_RATIO);
    if (g.gold < cost) return;
    g.gold   -= cost;
    t.damage  = Math.floor(t.damage * 1.3);
    t.range   = Math.round(t.range * 1.1 * 10) / 10;
    t.level++;
    syncHud();
  }, [syncHud]);

  const sellTower = useCallback(() => {
    const g = gs.current;
    if (g.selectedTowerId === null) return;
    const idx = g.towers.findIndex(t => t.id === g.selectedTowerId);
    if (idx === -1) return;
    g.gold += Math.floor(g.towers[idx].cost * 0.5);
    g.towers.splice(idx, 1);
    g.selectedTowerId = null;
    syncHud();
  }, [syncHud]);

  const restart = useCallback(() => {
    Object.assign(gs.current, {
      phase: 'prep', wave: 0, gold: 150, lives: 30, score: 0, speed: 1,
      enemies: [], towers: [], projectiles: [], popups: [],
      placingType: null, selectedTowerId: null,
      spawnQueue: [], spawnTimer: 0,
    } satisfies Partial<GameState>);
    syncHud();
  }, [syncHud]);

  // ─── Escape key ───────────────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      gs.current.placingType     = null;
      gs.current.selectedTowerId = null;
      syncHud();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [syncHud]);

  // ─── Derived UI ───────────────────────────────────────────────────────────

  const selectedTower = hud.selectedTowerId !== null
    ? gs.current.towers.find(t => t.id === hud.selectedTowerId)
    : null;

  const nextWavePreview = WAVES[hud.wave]
    ? WAVES[hud.wave].map(g => `${g.count}× ${g.type}`).join('  ')
    : null;

  // ─── JSX ──────────────────────────────────────────────────────────────────

  return (
    <div style={{
      width: '100%', height: '100vh',
      background: '#0d0d15',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'system-ui, sans-serif',
      userSelect: 'none', overflow: 'hidden',
    }}>
      {/* ── Top HUD ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        padding: '6px 12px',
        background: 'linear-gradient(to bottom, #1a1a2e, #12121e)',
        borderBottom: '2px solid #2a2a4a',
        flexShrink: 0,
      }}>
        <button onClick={onBack} style={btn('#334')}>← Retour</button>

        <Badge label="Vague"  value={`${hud.wave} / ${WAVES.length}`} color="#7799ff" />
        <Badge label="Or"     value={`${hud.gold} 🪙`}              color="#ffd700" />
        <Badge label="Vies"   value={`${hud.lives} ❤️`}              color={hud.lives <= 5 ? '#ff4444' : '#ff8888'} />
        <Badge label="Score"  value={String(hud.score)}              color="#aaffaa" />

        <div style={{ flex: 1 }} />

        <span style={{ color: '#666', fontSize: 11 }}>Vitesse:</span>
        {[1, 2].map(s => (
          <button key={s} onClick={() => setSpeed(s)}
            style={{ ...btn(hud.speed === s ? '#446' : '#223'), padding: '3px 8px', fontSize: 12 }}>
            {s}×
          </button>
        ))}

        {hud.phase === 'prep' && (
          <button onClick={startWave} disabled={hud.wave >= WAVES.length}
            style={{ ...btn('#1a5c1a'), fontWeight: 700, fontSize: 13 }}>
            {hud.wave >= WAVES.length ? 'Victoire !' : `Lancer vague ${hud.wave + 1} →`}
          </button>
        )}
        {hud.phase === 'wave' && (
          <span style={{ color: '#ffaa44', fontWeight: 700, fontSize: 13 }}>Vague en cours…</span>
        )}
      </div>

      {/* ── Main area ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Canvas */}
        <div ref={containerRef} style={{ flex: 1, position: 'relative' }}>
          <canvas
            ref={canvasRef}
            style={{ display: 'block', width: '100%', height: '100%', cursor: hud.placingType ? 'crosshair' : 'pointer' }}
            onClick={handleClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          />

          {/* Game-over / victory overlay */}
          {(hud.phase === 'gameover' || hud.phase === 'victory') && (
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.77)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16,
            }}>
              <div style={{
                fontSize: 44, fontWeight: 900,
                color: hud.phase === 'victory' ? '#ffd700' : '#ff4444',
                textShadow: '0 0 30px currentColor',
              }}>
                {hud.phase === 'victory' ? 'VICTOIRE !' : 'DÉFAITE'}
              </div>
              <div style={{ color: '#ccc', fontSize: 20 }}>Score : {hud.score}</div>
              <button onClick={restart} style={{ ...btn('#446'), fontSize: 16, padding: '10px 28px' }}>Recommencer</button>
              <button onClick={onBack}  style={{ ...btn('#334'), fontSize: 14 }}>Retour au menu</button>
            </div>
          )}
        </div>

        {/* ── Right panel ── */}
        <div style={{
          width: 205, background: '#111827', borderLeft: '2px solid #1e293b',
          display: 'flex', flexDirection: 'column', overflowY: 'auto',
        }}>
          {/* Tower shop */}
          <section style={{ padding: '10px 8px', borderBottom: '1px solid #1e293b' }}>
            <div style={sectionTitle}>TOURELLES</div>
            {(Object.keys(TOWER_DEFS) as TowerType[]).map(type => {
              const def       = TOWER_DEFS[type];
              const canAfford = hud.gold >= def.cost;
              const active    = hud.placingType === type;
              return (
                <button key={type} onClick={() => selectTower(type)}
                  disabled={!canAfford && !active}
                  style={{
                    ...btn(active ? '#264d26' : canAfford ? '#1e293b' : '#151f2e'),
                    width: '100%', marginBottom: 4, textAlign: 'left',
                    display: 'flex', flexDirection: 'column', gap: 2,
                    padding: '6px 8px',
                    border: active ? '1px solid #4ade80' : '1px solid #2a3a4a',
                    opacity: !canAfford && !active ? 0.5 : 1,
                    cursor: !canAfford && !active ? 'not-allowed' : 'pointer',
                  }}>
                  <span style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600 }}>{def.name}</span>
                  <span style={{ color: '#ffd700', fontSize: 11 }}>{def.cost} 🪙</span>
                  <span style={{ color: '#64748b', fontSize: 10 }}>
                    DMG {def.damage} | Portée {def.range}
                    {def.aoe > 0 && ` | AOE ${def.aoe}`}
                    {def.slowDuration > 0 && ' | Ralenti'}
                  </span>
                </button>
              );
            })}
          </section>

          {/* Selected tower info */}
          {selectedTower && (
            <section style={{ padding: '10px 8px', borderBottom: '1px solid #1e293b' }}>
              <div style={sectionTitle}>TOURELLE SÉLEC.</div>
              <div style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                {TOWER_DEFS[selectedTower.type].name} Niv.{selectedTower.level}
              </div>
              <div style={{ color: '#94a3b8', fontSize: 11, lineHeight: 1.8 }}>
                <div>Dégâts : {selectedTower.damage}</div>
                <div>Portée : {selectedTower.range.toFixed(1)}</div>
                <div>Cadence : {selectedTower.fireRate}/s</div>
                <div>Kills : {selectedTower.kills}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
                {(() => {
                  const cost = Math.floor(selectedTower.cost * UPGRADE_COST_RATIO);
                  return (
                    <button onClick={upgradeTower} disabled={hud.gold < cost}
                      style={{ ...btn('#1e3a5f'), width: '100%', fontSize: 11, opacity: hud.gold < cost ? 0.5 : 1, cursor: hud.gold < cost ? 'not-allowed' : 'pointer' }}>
                      Améliorer ({cost} 🪙)
                    </button>
                  );
                })()}
                <button onClick={sellTower} style={{ ...btn('#3f1515'), width: '100%', fontSize: 11 }}>
                  Vendre ({Math.floor(selectedTower.cost * 0.5)} 🪙)
                </button>
              </div>
            </section>
          )}

          {/* Next wave preview */}
          {hud.phase === 'prep' && nextWavePreview && (
            <section style={{ padding: '10px 8px', borderBottom: '1px solid #1e293b' }}>
              <div style={sectionTitle}>PROCHAINE VAGUE</div>
              <div style={{ color: '#fbbf24', fontSize: 11, lineHeight: 1.7 }}>{nextWavePreview}</div>
            </section>
          )}

          {/* Help */}
          <section style={{ padding: '10px 8px', marginTop: 'auto' }}>
            <div style={{ ...sectionTitle, color: '#475569' }}>AIDE</div>
            <div style={{ color: '#475569', fontSize: 10, lineHeight: 1.8 }}>
              <div>Clic canvas → poser</div>
              <div>Clic tourelle → sélec.</div>
              <div>Echap → annuler</div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

// ─── Tiny shared UI helpers ───────────────────────────────────────────────────

function Badge({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <span style={{ color: '#64748b', fontSize: 10, letterSpacing: 0.4 }}>{label}</span>
      <span style={{ color, fontSize: 14, fontWeight: 700 }}>{value}</span>
    </div>
  );
}

function btn(bg: string): React.CSSProperties {
  return {
    background: bg, color: '#e2e8f0',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 6, padding: '5px 12px',
    cursor: 'pointer', fontSize: 12,
  };
}

const sectionTitle: React.CSSProperties = {
  color: '#94a3b8', fontSize: 11, fontWeight: 700,
  marginBottom: 6, letterSpacing: 1,
};
