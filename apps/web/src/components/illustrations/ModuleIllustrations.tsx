/**
 * v3.18.7 — Module Illustrations 3D-style (28 modules)
 *
 * Une illustration SVG sur-mesure pour chaque module Creorga.
 * Chaque SVG :
 *  - 80×80 viewBox (s'adapte au container)
 *  - Gradient principal aux couleurs du module
 *  - Forme 3D-ish avec ombres + reflets
 *  - Icône thématique distinctive
 *
 * Utilisation : <ModuleIllustration id="pos" size={56} />
 */

import type { ModuleId } from '@/stores/moduleStore'

// ─── Helpers SVG ──────────────────────────────────────────────────────
function Bg({ color, id }: { color: string; id: string }) {
  return (
    <defs>
      <linearGradient id={`bg-${id}`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity="0.95" />
        <stop offset="100%" stopColor={color} stopOpacity="0.55" />
      </linearGradient>
      <linearGradient id={`shine-${id}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#fff" stopOpacity="0.4" />
        <stop offset="50%" stopColor="#fff" stopOpacity="0" />
      </linearGradient>
      <filter id={`shadow-${id}`} x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="2" />
      </filter>
    </defs>
  )
}

// ─── 28 Illustrations (une par module) ────────────────────────────────
// Pattern : <svg viewBox="0 0 80 80"> avec rounded rect background + élément central + accents

const POS = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 80 80">
    <Bg color="#1E3A5F" id="pos" />
    <rect x="4" y="4" width="72" height="72" rx="18" fill="url(#bg-pos)" />
    <rect x="4" y="4" width="72" height="36" rx="18" fill="url(#shine-pos)" />
    {/* Caisse écran */}
    <rect x="20" y="20" width="40" height="22" rx="3" fill="#fff" opacity="0.95" />
    <rect x="24" y="25" width="32" height="3" rx="1" fill="#1E3A5F" />
    <rect x="24" y="30" width="20" height="2" rx="1" fill="#94a3b8" />
    <rect x="48" y="30" width="8" height="2" rx="1" fill="#10b981" />
    {/* Boutons */}
    <circle cx="28" cy="55" r="4" fill="#fbbf24" />
    <circle cx="40" cy="55" r="4" fill="#10b981" />
    <circle cx="52" cy="55" r="4" fill="#ef4444" />
    {/* Reflet */}
    <ellipse cx="20" cy="14" rx="14" ry="3" fill="#fff" opacity="0.3" />
  </svg>
)

const Clients = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 80 80">
    <Bg color="#7c3aed" id="cli" />
    <rect x="4" y="4" width="72" height="72" rx="18" fill="url(#bg-cli)" />
    <rect x="4" y="4" width="72" height="36" rx="18" fill="url(#shine-cli)" />
    {/* Téléphone */}
    <rect x="26" y="14" width="28" height="50" rx="6" fill="#fff" />
    <rect x="29" y="20" width="22" height="38" rx="2" fill="#7c3aed" opacity="0.15" />
    <circle cx="40" cy="62" r="2" fill="#7c3aed" opacity="0.4" />
    {/* QR sur écran */}
    <g transform="translate(33,28)">
      <rect width="14" height="14" fill="none" />
      <rect x="0" y="0" width="4" height="4" fill="#7c3aed" />
      <rect x="10" y="0" width="4" height="4" fill="#7c3aed" />
      <rect x="0" y="10" width="4" height="4" fill="#7c3aed" />
      <rect x="6" y="6" width="2" height="2" fill="#7c3aed" />
      <rect x="9" y="9" width="3" height="3" fill="#7c3aed" />
    </g>
  </svg>
)

const Invoices = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 80 80">
    <Bg color="#10b981" id="inv" />
    <rect x="4" y="4" width="72" height="72" rx="18" fill="url(#bg-inv)" />
    <rect x="4" y="4" width="72" height="36" rx="18" fill="url(#shine-inv)" />
    {/* Document */}
    <path d="M 22 14 L 22 64 L 58 64 L 58 22 L 50 14 Z" fill="#fff" />
    <path d="M 50 14 L 50 22 L 58 22 Z" fill="#86efac" />
    {/* Lignes */}
    <rect x="28" y="28" width="22" height="2" rx="1" fill="#10b981" opacity="0.4" />
    <rect x="28" y="34" width="24" height="2" rx="1" fill="#10b981" opacity="0.3" />
    <rect x="28" y="40" width="18" height="2" rx="1" fill="#10b981" opacity="0.3" />
    <rect x="28" y="50" width="22" height="6" rx="2" fill="#10b981" />
    <text x="32" y="54.5" fontSize="6" fontWeight="800" fill="#fff">€ 850</text>
  </svg>
)

const QrMenu = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 80 80">
    <Bg color="#0ea5e9" id="qr" />
    <rect x="4" y="4" width="72" height="72" rx="18" fill="url(#bg-qr)" />
    <rect x="4" y="4" width="72" height="36" rx="18" fill="url(#shine-qr)" />
    {/* QR central */}
    <rect x="22" y="22" width="36" height="36" rx="4" fill="#fff" />
    <g transform="translate(26,26)" fill="#0ea5e9">
      <rect x="0" y="0" width="8" height="8" />
      <rect x="2" y="2" width="4" height="4" fill="#fff" />
      <rect x="20" y="0" width="8" height="8" />
      <rect x="22" y="2" width="4" height="4" fill="#fff" />
      <rect x="0" y="20" width="8" height="8" />
      <rect x="2" y="22" width="4" height="4" fill="#fff" />
      <rect x="12" y="2" width="2" height="2" />
      <rect x="16" y="6" width="2" height="2" />
      <rect x="14" y="10" width="2" height="2" />
      <rect x="18" y="14" width="3" height="3" />
      <rect x="14" y="18" width="2" height="2" />
      <rect x="20" y="22" width="2" height="2" />
      <rect x="22" y="20" width="2" height="2" />
      <rect x="24" y="24" width="4" height="4" />
    </g>
  </svg>
)

const Contracts = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 80 80">
    <Bg color="#0E7490" id="ctr" />
    <rect x="4" y="4" width="72" height="72" rx="18" fill="url(#bg-ctr)" />
    <rect x="4" y="4" width="72" height="36" rx="18" fill="url(#shine-ctr)" />
    {/* Documents empilés */}
    <rect x="20" y="22" width="36" height="44" rx="3" fill="#0E7490" opacity="0.6" />
    <rect x="22" y="20" width="36" height="44" rx="3" fill="#fff" />
    <rect x="26" y="28" width="28" height="2" fill="#0E7490" opacity="0.4" />
    <rect x="26" y="34" width="24" height="2" fill="#0E7490" opacity="0.3" />
    <rect x="26" y="40" width="26" height="2" fill="#0E7490" opacity="0.3" />
    {/* Sceau */}
    <circle cx="48" cy="56" r="6" fill="#fbbf24" />
    <text x="44" y="59" fontSize="6" fontWeight="800" fill="#78350f">✓</text>
  </svg>
)

const HR = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 80 80">
    <Bg color="#991B1B" id="hr" />
    <rect x="4" y="4" width="72" height="72" rx="18" fill="url(#bg-hr)" />
    <rect x="4" y="4" width="72" height="36" rx="18" fill="url(#shine-hr)" />
    {/* 3 personnes */}
    <circle cx="28" cy="32" r="6" fill="#fff" />
    <path d="M 18 56 Q 28 44 38 56" stroke="#fff" strokeWidth="3" fill="none" />
    <circle cx="40" cy="28" r="7" fill="#fff" />
    <path d="M 28 60 Q 40 46 52 60" stroke="#fff" strokeWidth="3" fill="none" />
    <circle cx="52" cy="32" r="6" fill="#fff" />
    <path d="M 42 56 Q 52 44 62 56" stroke="#fff" strokeWidth="3" fill="none" />
  </svg>
)

const Accounting = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 80 80">
    <Bg color="#1F2937" id="acc" />
    <rect x="4" y="4" width="72" height="72" rx="18" fill="url(#bg-acc)" />
    <rect x="4" y="4" width="72" height="36" rx="18" fill="url(#shine-acc)" />
    {/* Bar chart */}
    <rect x="20" y="50" width="8" height="14" rx="1" fill="#10b981" />
    <rect x="32" y="42" width="8" height="22" rx="1" fill="#3b82f6" />
    <rect x="44" y="34" width="8" height="30" rx="1" fill="#fbbf24" />
    <rect x="56" y="38" width="8" height="26" rx="1" fill="#ec4899" />
    {/* Trend line */}
    <path d="M 24 52 L 36 44 L 48 36 L 60 40" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" />
    <circle cx="60" cy="40" r="3" fill="#fff" />
  </svg>
)

const Marketing = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 80 80">
    <Bg color="#BE185D" id="mkt" />
    <rect x="4" y="4" width="72" height="72" rx="18" fill="url(#bg-mkt)" />
    <rect x="4" y="4" width="72" height="36" rx="18" fill="url(#shine-mkt)" />
    {/* Megaphone */}
    <path d="M 16 36 L 40 24 L 40 56 L 16 44 Z" fill="#fff" />
    <rect x="40" y="32" width="20" height="16" rx="3" fill="#fff" />
    <circle cx="58" cy="40" r="3" fill="#fbbf24" />
    {/* Sound waves */}
    <path d="M 64 30 Q 70 40 64 50" stroke="#fff" strokeWidth="2" fill="none" />
    <path d="M 68 26 Q 76 40 68 54" stroke="#fff" strokeWidth="2" fill="none" opacity="0.6" />
  </svg>
)

const Inventory = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 80 80">
    <Bg color="#92400E" id="iv" />
    <rect x="4" y="4" width="72" height="72" rx="18" fill="url(#bg-iv)" />
    <rect x="4" y="4" width="72" height="36" rx="18" fill="url(#shine-iv)" />
    {/* Boxes empilées */}
    <g fill="#fff">
      <rect x="20" y="44" width="18" height="20" rx="2" />
      <rect x="40" y="44" width="20" height="20" rx="2" />
      <rect x="30" y="22" width="20" height="20" rx="2" />
    </g>
    <g stroke="#92400E" strokeWidth="1" fill="none" opacity="0.4">
      <line x1="20" y1="54" x2="38" y2="54" />
      <line x1="40" y1="54" x2="60" y2="54" />
      <line x1="30" y1="32" x2="50" y2="32" />
    </g>
    {/* Tape */}
    <rect x="38" y="22" width="4" height="20" fill="#fbbf24" />
    <rect x="48" y="44" width="4" height="20" fill="#fbbf24" />
  </svg>
)

const HACCP = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 80 80">
    <Bg color="#B45309" id="ha" />
    <rect x="4" y="4" width="72" height="72" rx="18" fill="url(#bg-ha)" />
    <rect x="4" y="4" width="72" height="36" rx="18" fill="url(#shine-ha)" />
    {/* Thermomètre */}
    <rect x="36" y="14" width="8" height="40" rx="4" fill="#fff" />
    <circle cx="40" cy="60" r="9" fill="#fff" />
    <rect x="38" y="20" width="4" height="34" fill="#dc2626" />
    <circle cx="40" cy="60" r="6" fill="#dc2626" />
    {/* Marks */}
    <line x1="46" y1="22" x2="50" y2="22" stroke="#fff" strokeWidth="1.5" />
    <line x1="46" y1="30" x2="50" y2="30" stroke="#fff" strokeWidth="1.5" />
    <line x1="46" y1="38" x2="50" y2="38" stroke="#fff" strokeWidth="1.5" />
    <line x1="46" y1="46" x2="50" y2="46" stroke="#fff" strokeWidth="1.5" />
    {/* Check shield */}
    <circle cx="60" cy="20" r="9" fill="#10b981" />
    <text x="56" y="24" fontSize="10" fontWeight="800" fill="#fff">✓</text>
  </svg>
)

const Reputation = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 80 80">
    <Bg color="#0369A1" id="rep" />
    <rect x="4" y="4" width="72" height="72" rx="18" fill="url(#bg-rep)" />
    <rect x="4" y="4" width="72" height="36" rx="18" fill="url(#shine-rep)" />
    {/* 5 stars */}
    {[0, 1, 2, 3, 4].map((i) => (
      <text key={i} x={14 + i * 11} y="38" fontSize="12" fill="#fbbf24">★</text>
    ))}
    {/* Speech bubble */}
    <path d="M 18 46 L 62 46 L 62 64 L 36 64 L 30 70 L 32 64 L 18 64 Z" fill="#fff" />
    <line x1="22" y1="54" x2="58" y2="54" stroke="#0369A1" strokeWidth="1.5" opacity="0.4" />
    <line x1="22" y1="58" x2="48" y2="58" stroke="#0369A1" strokeWidth="1.5" opacity="0.4" />
  </svg>
)

const Formation = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 80 80">
    <Bg color="#7c3aed" id="frm" />
    <rect x="4" y="4" width="72" height="72" rx="18" fill="url(#bg-frm)" />
    <rect x="4" y="4" width="72" height="36" rx="18" fill="url(#shine-frm)" />
    {/* Mortarboard */}
    <path d="M 40 16 L 16 28 L 40 38 L 64 28 Z" fill="#fff" />
    <path d="M 24 32 L 24 46 Q 40 54 56 46 L 56 32" fill="none" stroke="#fff" strokeWidth="2.5" />
    <line x1="64" y1="28" x2="64" y2="44" stroke="#fff" strokeWidth="2" />
    <circle cx="64" cy="46" r="3" fill="#fbbf24" />
    {/* Book */}
    <path d="M 24 56 L 40 60 L 56 56 L 56 68 L 40 72 L 24 68 Z" fill="#fff" opacity="0.85" />
    <line x1="40" y1="60" x2="40" y2="72" stroke="#7c3aed" strokeWidth="1" />
  </svg>
)

const Maintenance = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 80 80">
    <Bg color="#475569" id="mn" />
    <rect x="4" y="4" width="72" height="72" rx="18" fill="url(#bg-mn)" />
    <rect x="4" y="4" width="72" height="36" rx="18" fill="url(#shine-mn)" />
    {/* Wrench */}
    <g transform="rotate(-30 40 40)">
      <rect x="36" y="20" width="8" height="35" fill="#fff" />
      <path d="M 30 14 L 36 14 L 36 26 L 44 26 L 44 14 L 50 14 L 50 24 L 56 30 L 50 36 L 44 36 L 36 36 L 30 30 L 30 24 Z" fill="#fff" />
    </g>
    {/* Screwdriver */}
    <g transform="rotate(45 40 40)">
      <rect x="38" y="48" width="4" height="20" fill="#fff" opacity="0.7" />
      <rect x="36" y="44" width="8" height="6" rx="2" fill="#fbbf24" opacity="0.9" />
    </g>
  </svg>
)

const RGPD = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 80 80">
    <Bg color="#059669" id="rg" />
    <rect x="4" y="4" width="72" height="72" rx="18" fill="url(#bg-rg)" />
    <rect x="4" y="4" width="72" height="36" rx="18" fill="url(#shine-rg)" />
    {/* Shield */}
    <path d="M 40 14 L 22 22 L 22 42 Q 22 58 40 66 Q 58 58 58 42 L 58 22 Z" fill="#fff" />
    {/* Lock inside */}
    <rect x="34" y="38" width="12" height="14" rx="2" fill="#059669" />
    <path d="M 36 38 L 36 32 Q 36 26 40 26 Q 44 26 44 32 L 44 38" stroke="#059669" strokeWidth="2.5" fill="none" />
    <circle cx="40" cy="44" r="2" fill="#fff" />
  </svg>
)

const Sites = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 80 80">
    <Bg color="#db2777" id="st" />
    <rect x="4" y="4" width="72" height="72" rx="18" fill="url(#bg-st)" />
    <rect x="4" y="4" width="72" height="36" rx="18" fill="url(#shine-st)" />
    {/* 3 buildings */}
    <rect x="14" y="34" width="14" height="32" rx="1" fill="#fff" />
    <rect x="32" y="22" width="16" height="44" rx="1" fill="#fff" />
    <rect x="52" y="40" width="14" height="26" rx="1" fill="#fff" />
    {/* Windows */}
    <g fill="#db2777" opacity="0.4">
      <rect x="17" y="38" width="3" height="3" />
      <rect x="22" y="38" width="3" height="3" />
      <rect x="17" y="46" width="3" height="3" />
      <rect x="22" y="46" width="3" height="3" />
      <rect x="36" y="28" width="3" height="3" />
      <rect x="42" y="28" width="3" height="3" />
      <rect x="36" y="36" width="3" height="3" />
      <rect x="42" y="36" width="3" height="3" />
      <rect x="36" y="44" width="3" height="3" />
      <rect x="42" y="44" width="3" height="3" />
      <rect x="55" y="44" width="3" height="3" />
      <rect x="60" y="44" width="3" height="3" />
    </g>
    {/* Pin */}
    <circle cx="40" cy="14" r="4" fill="#fbbf24" />
  </svg>
)

const API = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 80 80">
    <Bg color="#475569" id="api" />
    <rect x="4" y="4" width="72" height="72" rx="18" fill="url(#bg-api)" />
    <rect x="4" y="4" width="72" height="36" rx="18" fill="url(#shine-api)" />
    {/* Connected nodes */}
    <circle cx="22" cy="24" r="6" fill="#fff" />
    <circle cx="58" cy="24" r="6" fill="#fff" />
    <circle cx="40" cy="56" r="6" fill="#fff" />
    <line x1="22" y1="24" x2="40" y2="56" stroke="#fff" strokeWidth="2" opacity="0.6" />
    <line x1="58" y1="24" x2="40" y2="56" stroke="#fff" strokeWidth="2" opacity="0.6" />
    <line x1="22" y1="24" x2="58" y2="24" stroke="#fff" strokeWidth="2" opacity="0.6" />
    {/* Inner dots */}
    <circle cx="22" cy="24" r="2" fill="#475569" />
    <circle cx="58" cy="24" r="2" fill="#475569" />
    <circle cx="40" cy="56" r="2" fill="#475569" />
    {/* Code symbols */}
    <text x="34" y="44" fontSize="9" fontWeight="800" fill="#fff">{'</>'}</text>
  </svg>
)

const AI = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 80 80">
    <Bg color="#8b5cf6" id="ai" />
    <rect x="4" y="4" width="72" height="72" rx="18" fill="url(#bg-ai)" />
    <rect x="4" y="4" width="72" height="36" rx="18" fill="url(#shine-ai)" />
    {/* Brain / robot head */}
    <rect x="22" y="20" width="36" height="32" rx="6" fill="#fff" />
    <circle cx="32" cy="34" r="3" fill="#8b5cf6" />
    <circle cx="48" cy="34" r="3" fill="#8b5cf6" />
    <path d="M 30 42 Q 40 48 50 42" stroke="#8b5cf6" strokeWidth="2" fill="none" />
    {/* Antenna */}
    <line x1="40" y1="20" x2="40" y2="14" stroke="#fff" strokeWidth="2" />
    <circle cx="40" cy="12" r="3" fill="#fbbf24" />
    {/* Sparkles */}
    <text x="14" y="62" fontSize="10" fill="#fbbf24">✨</text>
    <text x="60" y="68" fontSize="9" fill="#fbbf24">✨</text>
  </svg>
)

const Backup = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 80 80">
    <Bg color="#0284c7" id="bk" />
    <rect x="4" y="4" width="72" height="72" rx="18" fill="url(#bg-bk)" />
    <rect x="4" y="4" width="72" height="36" rx="18" fill="url(#shine-bk)" />
    {/* Cloud */}
    <ellipse cx="40" cy="36" rx="24" ry="14" fill="#fff" />
    <ellipse cx="28" cy="40" rx="12" ry="10" fill="#fff" />
    <ellipse cx="52" cy="38" rx="14" ry="11" fill="#fff" />
    {/* Shield (security) */}
    <path d="M 40 50 L 28 56 L 28 62 Q 28 68 40 72 Q 52 68 52 62 L 52 56 Z" fill="#fbbf24" />
    <text x="36" y="65" fontSize="9" fontWeight="800" fill="#78350f">✓</text>
  </svg>
)

const Owner = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 80 80">
    <Bg color="#166534" id="ow" />
    <rect x="4" y="4" width="72" height="72" rx="18" fill="url(#bg-ow)" />
    <rect x="4" y="4" width="72" height="36" rx="18" fill="url(#shine-ow)" />
    {/* Crown */}
    <path d="M 18 22 L 26 30 L 32 18 L 40 30 L 48 18 L 54 30 L 62 22 L 60 44 L 20 44 Z" fill="#fbbf24" />
    <rect x="18" y="44" width="44" height="6" rx="1" fill="#fbbf24" />
    {/* Gems */}
    <circle cx="32" cy="38" r="2.5" fill="#dc2626" />
    <circle cx="40" cy="38" r="2.5" fill="#10b981" />
    <circle cx="48" cy="38" r="2.5" fill="#3b82f6" />
    {/* Chart underneath */}
    <path d="M 22 60 L 30 56 L 38 62 L 46 54 L 54 58 L 62 52" stroke="#fff" strokeWidth="2.5" fill="none" />
    <circle cx="62" cy="52" r="3" fill="#fff" />
  </svg>
)

const Delivery = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 80 80">
    <Bg color="#ea580c" id="dl" />
    <rect x="4" y="4" width="72" height="72" rx="18" fill="url(#bg-dl)" />
    <rect x="4" y="4" width="72" height="36" rx="18" fill="url(#shine-dl)" />
    {/* Scooter / truck */}
    <rect x="22" y="36" width="28" height="14" rx="2" fill="#fff" />
    <path d="M 50 36 L 60 36 L 60 50 L 50 50 Z" fill="#fff" opacity="0.8" />
    <circle cx="28" cy="56" r="6" fill="#1e293b" />
    <circle cx="28" cy="56" r="2.5" fill="#fff" />
    <circle cx="54" cy="56" r="6" fill="#1e293b" />
    <circle cx="54" cy="56" r="2.5" fill="#fff" />
    {/* Box on top */}
    <rect x="28" y="22" width="14" height="14" rx="1" fill="#fbbf24" />
    <line x1="35" y1="22" x2="35" y2="36" stroke="#78350f" strokeWidth="1.5" />
  </svg>
)

const ClickCollect = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 80 80">
    <Bg color="#0d9488" id="cc" />
    <rect x="4" y="4" width="72" height="72" rx="18" fill="url(#bg-cc)" />
    <rect x="4" y="4" width="72" height="36" rx="18" fill="url(#shine-cc)" />
    {/* Bag */}
    <path d="M 24 32 L 24 64 L 56 64 L 56 32 Z" fill="#fff" />
    <path d="M 30 32 Q 30 22 40 22 Q 50 22 50 32" stroke="#fff" strokeWidth="3" fill="none" />
    <circle cx="32" cy="44" r="2" fill="#0d9488" />
    <circle cx="48" cy="44" r="2" fill="#0d9488" />
    <path d="M 32 52 Q 40 58 48 52" stroke="#0d9488" strokeWidth="2" fill="none" />
  </svg>
)

const Catering = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 80 80">
    <Bg color="#9333ea" id="cat" />
    <rect x="4" y="4" width="72" height="72" rx="18" fill="url(#bg-cat)" />
    <rect x="4" y="4" width="72" height="36" rx="18" fill="url(#shine-cat)" />
    {/* Cloche service */}
    <path d="M 16 50 Q 16 30 40 30 Q 64 30 64 50 Z" fill="#fff" />
    <line x1="16" y1="50" x2="64" y2="50" stroke="#9333ea" strokeWidth="2" />
    <circle cx="40" cy="26" r="3" fill="#fbbf24" />
    {/* Steam */}
    <path d="M 28 24 Q 28 18 32 16" stroke="#fff" strokeWidth="2" fill="none" opacity="0.6" />
    <path d="M 40 22 Q 40 14 44 12" stroke="#fff" strokeWidth="2" fill="none" opacity="0.6" />
    <path d="M 52 24 Q 52 18 56 16" stroke="#fff" strokeWidth="2" fill="none" opacity="0.6" />
    {/* Plate base */}
    <ellipse cx="40" cy="58" rx="28" ry="4" fill="#fff" opacity="0.7" />
  </svg>
)

const CentralKitchen = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 80 80">
    <Bg color="#be185d" id="ck" />
    <rect x="4" y="4" width="72" height="72" rx="18" fill="url(#bg-ck)" />
    <rect x="4" y="4" width="72" height="36" rx="18" fill="url(#shine-ck)" />
    {/* Pot */}
    <rect x="22" y="34" width="36" height="26" rx="3" fill="#fff" />
    <ellipse cx="40" cy="34" rx="20" ry="4" fill="#fff" />
    {/* Handles */}
    <rect x="14" y="40" width="10" height="4" rx="2" fill="#fff" />
    <rect x="56" y="40" width="10" height="4" rx="2" fill="#fff" />
    {/* Steam */}
    <path d="M 30 22 Q 30 16 34 14" stroke="#fff" strokeWidth="2" fill="none" />
    <path d="M 40 20 Q 40 12 44 10" stroke="#fff" strokeWidth="2" fill="none" />
    <path d="M 50 22 Q 50 16 54 14" stroke="#fff" strokeWidth="2" fill="none" />
    {/* Soup pattern */}
    <circle cx="32" cy="46" r="2" fill="#fbbf24" />
    <circle cx="42" cy="50" r="2" fill="#fbbf24" />
    <circle cx="50" cy="44" r="2" fill="#fbbf24" />
  </svg>
)

const Billing = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 80 80">
    <Bg color="#0ea5e9" id="bl" />
    <rect x="4" y="4" width="72" height="72" rx="18" fill="url(#bg-bl)" />
    <rect x="4" y="4" width="72" height="36" rx="18" fill="url(#shine-bl)" />
    {/* Carte bancaire */}
    <rect x="14" y="24" width="52" height="32" rx="4" fill="#fff" />
    <rect x="14" y="32" width="52" height="6" fill="#1e293b" />
    {/* Chip */}
    <rect x="20" y="44" width="10" height="8" rx="1" fill="#fbbf24" />
    {/* Numbers */}
    <text x="36" y="51" fontSize="6" fill="#1e293b" letterSpacing="1">•••• 4242</text>
  </svg>
)

const Changelog = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 80 80">
    <Bg color="#8b5cf6" id="cl" />
    <rect x="4" y="4" width="72" height="72" rx="18" fill="url(#bg-cl)" />
    <rect x="4" y="4" width="72" height="36" rx="18" fill="url(#shine-cl)" />
    {/* Timeline */}
    <line x1="28" y1="20" x2="28" y2="62" stroke="#fff" strokeWidth="2" />
    <circle cx="28" cy="26" r="4" fill="#fbbf24" />
    <circle cx="28" cy="42" r="4" fill="#10b981" />
    <circle cx="28" cy="58" r="4" fill="#fff" />
    <rect x="38" y="22" width="22" height="3" fill="#fff" opacity="0.8" />
    <rect x="38" y="38" width="26" height="3" fill="#fff" opacity="0.8" />
    <rect x="38" y="54" width="20" height="3" fill="#fff" opacity="0.8" />
    <rect x="38" y="28" width="14" height="2" fill="#fff" opacity="0.4" />
    <rect x="38" y="44" width="18" height="2" fill="#fff" opacity="0.4" />
  </svg>
)

const Referral = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 80 80">
    <Bg color="#f59e0b" id="rf" />
    <rect x="4" y="4" width="72" height="72" rx="18" fill="url(#bg-rf)" />
    <rect x="4" y="4" width="72" height="36" rx="18" fill="url(#shine-rf)" />
    {/* Gift box */}
    <rect x="22" y="32" width="36" height="32" rx="3" fill="#fff" />
    <rect x="22" y="40" width="36" height="3" fill="#fbbf24" />
    <rect x="38" y="32" width="4" height="32" fill="#fbbf24" />
    {/* Bow */}
    <ellipse cx="34" cy="32" rx="6" ry="4" fill="#fbbf24" />
    <ellipse cx="46" cy="32" rx="6" ry="4" fill="#fbbf24" />
    <circle cx="40" cy="32" r="2" fill="#fff" />
    {/* € */}
    <text x="36" y="58" fontSize="10" fontWeight="800" fill="#f59e0b">€</text>
  </svg>
)

const Ads = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 80 80">
    <Bg color="#ef4444" id="ad" />
    <rect x="4" y="4" width="72" height="72" rx="18" fill="url(#bg-ad)" />
    <rect x="4" y="4" width="72" height="36" rx="18" fill="url(#shine-ad)" />
    {/* TV / Screen */}
    <rect x="14" y="22" width="52" height="36" rx="3" fill="#fff" />
    <rect x="18" y="26" width="44" height="28" rx="1" fill="#1e293b" />
    {/* Ad content */}
    <rect x="22" y="30" width="20" height="2" fill="#fbbf24" />
    <rect x="22" y="36" width="36" height="2" fill="#fff" opacity="0.7" />
    <rect x="22" y="42" width="28" height="2" fill="#fff" opacity="0.7" />
    <rect x="22" y="48" width="16" height="3" fill="#10b981" />
    {/* Stand */}
    <rect x="36" y="58" width="8" height="8" fill="#fff" />
    <rect x="28" y="64" width="24" height="3" fill="#fff" />
  </svg>
)

const Music = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 80 80">
    <Bg color="#8b5cf6" id="mu" />
    <rect x="4" y="4" width="72" height="72" rx="18" fill="url(#bg-mu)" />
    <rect x="4" y="4" width="72" height="36" rx="18" fill="url(#shine-mu)" />
    {/* Vinyle */}
    <circle cx="40" cy="40" r="22" fill="#1e293b" />
    <circle cx="40" cy="40" r="8" fill="#fbbf24" />
    <circle cx="40" cy="40" r="2" fill="#1e293b" />
    {/* Reflets */}
    <path d="M 30 28 Q 24 38 28 50" stroke="#fff" strokeWidth="1" fill="none" opacity="0.2" />
    <path d="M 50 28 Q 56 38 52 50" stroke="#fff" strokeWidth="1" fill="none" opacity="0.2" />
    {/* Notes */}
    <text x="14" y="22" fontSize="14" fill="#fff">♪</text>
    <text x="62" y="64" fontSize="14" fill="#fff">♫</text>
  </svg>
)

// ─── Map ID → Component ────────────────────────────────────────────────
const MAP: Record<ModuleId, (props: { size: number }) => JSX.Element> = {
  pos: POS,
  clients: Clients,
  invoices: Invoices,
  qrmenu: QrMenu,
  contracts: Contracts,
  hr: HR,
  accounting: Accounting,
  marketing: Marketing,
  inventory: Inventory,
  haccp: HACCP,
  reputation: Reputation,
  formation: Formation,
  maintenance: Maintenance,
  rgpd: RGPD,
  sites: Sites,
  api: API,
  ai: AI,
  backup: Backup,
  owner: Owner,
  delivery: Delivery,
  clickcollect: ClickCollect,
  catering: Catering,
  centralkitchen: CentralKitchen,
  billing: Billing,
  changelog: Changelog,
  referral: Referral,
  ads: Ads,
  music: Music,
  sales: Delivery,
}

export function ModuleIllustration({ id, size = 56 }: { id: ModuleId; size?: number }) {
  const Comp = MAP[id]
  if (!Comp) return null
  return <Comp size={size} />
}

// Permet aussi de récupérer un fallback emoji si besoin
export const MODULE_EMOJI: Partial<Record<ModuleId, string>> = {
  pos: '🛒',
  clients: '📱',
  invoices: '🧾',
  qrmenu: '📲',
  contracts: '📜',
  hr: '👥',
  accounting: '📊',
  marketing: '📣',
  inventory: '📦',
  haccp: '🌡',
  reputation: '⭐',
  formation: '🎓',
  maintenance: '🔧',
  rgpd: '🔒',
  sites: '🏢',
  api: '🔌',
  ai: '🤖',
  backup: '☁️',
  owner: '👑',
  delivery: '🛵',
  clickcollect: '🛍',
  catering: '🍽',
  centralkitchen: '🍳',
  billing: '💳',
  changelog: '📝',
  referral: '🎁',
  ads: '📺',
  music: '🎵',
}
