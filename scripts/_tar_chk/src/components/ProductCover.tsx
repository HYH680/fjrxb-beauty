"use client";

import type { Category, Product } from "@/types";
import { useLocale } from "@/hooks/useLocale";
import { SCENE_LABEL_KEYS, sceneForProduct } from "@/lib/product-meta";
import { localizedProductName } from "@/lib/i18n/localize-copy";

type Palette = {
  bg0: string;
  bg1: string;
  a: string;
  b: string;
  c: string;
  ink: string;
};

const BASE: Record<Category, Palette> = {
  llm: { bg0: "#07101f", bg1: "#132447", a: "#3b82f6", b: "#22d3ee", c: "#a5b4fc", ink: "#020617" },
  image: { bg0: "#1a0b18", bg1: "#3b1233", a: "#f472b6", b: "#fb923c", c: "#f0abfc", ink: "#1f0518" },
  speech: { bg0: "#12081d", bg1: "#2a1450", a: "#a78bfa", b: "#f9a8d4", c: "#c4b5fd", ink: "#12081d" },
  "video-edit": { bg0: "#1a080c", bg1: "#4c1020", a: "#fb7185", b: "#fbbf24", c: "#fda4af", ink: "#1a080c" },
  creative: { bg0: "#1a0f14", bg1: "#4a1838", a: "#f472b6", b: "#fb923c", c: "#fda4af", ink: "#2a0a1c" },
  "we-media": { bg0: "#1a1008", bg1: "#4a2a0c", a: "#f59e0b", b: "#fb7185", c: "#fcd34d", ink: "#431407" },
  "dev-tools": { bg0: "#041411", bg1: "#0d3b32", a: "#34d399", b: "#22d3ee", c: "#6ee7b7", ink: "#022c22" },
  "vector-db": { bg0: "#04161a", bg1: "#0b3b42", a: "#2dd4bf", b: "#67e8f9", c: "#99f6e4", ink: "#042f2e" },
  api: { bg0: "#071225", bg1: "#123057", a: "#60a5fa", b: "#38bdf8", c: "#93c5fd", ink: "#0b1220" },
  retail: { bg0: "#1a0d06", bg1: "#4a220c", a: "#fb923c", b: "#fcd34d", c: "#fdba74", ink: "#431407" },
  ecommerce: { bg0: "#041613", bg1: "#0c3d36", a: "#14b8a6", b: "#5eead4", c: "#fbbf24", ink: "#042f2e" },
  docs: { bg0: "#0d0d1c", bg1: "#24205c", a: "#818cf8", b: "#c4b5fd", c: "#e0e7ff", ink: "#1e1b4b" },
  finance: { bg0: "#07140e", bg1: "#14532d", a: "#4ade80", b: "#facc15", c: "#86efac", ink: "#052e16" },
  education: { bg0: "#071222", bg1: "#1e3a5f", a: "#38bdf8", b: "#a78bfa", c: "#7dd3fc", ink: "#0c4a6e" },
  hr: { bg0: "#180910", bg1: "#4a1530", a: "#fb7185", b: "#fda4af", c: "#f9a8d4", ink: "#4c0519" },
};

function hash(value: string) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h = Math.imul(h ^ value.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

function mixHue(hex: string, delta: number) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  r = Math.max(0, Math.min(255, r + delta));
  g = Math.max(0, Math.min(255, g + Math.round(delta * 0.4)));
  b = Math.max(0, Math.min(255, b - Math.round(delta * 0.35)));
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function SoftCard({
  x,
  y,
  w,
  h,
  fill,
  rotate = 0,
  opacity = 1,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  rotate?: number;
  opacity?: number;
}) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate})`} opacity={opacity}>
      <rect width={w} height={h} rx={Math.min(28, h / 4)} fill={fill} />
      <rect
        width={w}
        height={h * 0.35}
        rx={Math.min(28, h / 4)}
        fill="white"
        opacity="0.12"
      />
    </g>
  );
}

function Scene({
  category,
  palette,
  seed,
}: {
  category: Category;
  palette: Palette;
  seed: number;
}) {
  const v = seed % 4;
  const drift = (seed % 37) - 18;

  if (category === "llm") {
    if (v === 0) {
      return (
        <g>
          <SoftCard x={188 + drift} y={68} w={250} h={150} fill={palette.a} rotate={-4} />
          <SoftCard x={220 + drift} y={108} w={250} h={150} fill={palette.b} rotate={5} opacity={0.92} />
          <circle cx={150} cy={230} r={46} fill={palette.c} />
          <circle cx={138} cy={220} r={7} fill={palette.ink} />
          <circle cx={162} cy={220} r={7} fill={palette.ink} />
          <path d="M134 242c8 10 24 10 32 0" stroke={palette.ink} strokeWidth="5" fill="none" strokeLinecap="round" />
        </g>
      );
    }
    if (v === 1) {
      return (
        <g>
          {[0, 1, 2].map((i) => (
            <SoftCard
              key={i}
              x={150 + i * 34 + drift}
              y={78 + i * 34}
              w={280}
              h={78}
              fill={i === 1 ? palette.b : palette.a}
              opacity={0.95 - i * 0.08}
            />
          ))}
          <circle cx={470} cy={88} r={28} fill={palette.c} />
        </g>
      );
    }
    if (v === 2) {
      return (
        <g>
          <circle cx={250 + drift} cy={160} r={86} fill={palette.a} />
          <circle cx={360 + drift} cy={130} r={58} fill={palette.b} />
          <SoftCard x={400} y={210} w={140} h={58} fill={palette.c} />
          <circle cx={236 + drift} cy={146} r={9} fill={palette.ink} />
          <circle cx={264 + drift} cy={146} r={9} fill={palette.ink} />
        </g>
      );
    }
    return (
      <g>
        <SoftCard x={170 + drift} y={70} w={220} h={180} fill={palette.a} />
        <rect x={190 + drift} y={100} width={140} height={10} rx={5} fill="white" opacity="0.35" />
        <rect x={190 + drift} y={126} width={170} height={10} rx={5} fill="white" opacity="0.22" />
        <rect x={190 + drift} y={152} width={110} height={10} rx={5} fill={palette.c} opacity="0.8" />
        <circle cx={420} cy={210} r={70} fill={palette.b} opacity="0.9" />
      </g>
    );
  }

  if (category === "image" || category === "creative") {
    return (
      <g>
        <SoftCard x={140 + drift} y={60} w={160} h={160} fill={palette.a} rotate={-8} />
        <SoftCard x={220 + drift} y={100} w={170} h={170} fill={palette.b} rotate={6} />
        <circle cx={280 + drift} cy={170} r={40} fill={palette.c} />
        <path
          d={`M${340 + drift} 250c40-70 90-70 130 0`}
          stroke={palette.c}
          strokeWidth="12"
          fill="none"
          strokeLinecap="round"
        />
      </g>
    );
  }

  if (category === "speech") {
    const heights = [52, 96, 68, 128, 84, 112, 60, 100].map(
      (h, i) => h + ((seed >> i) % 18)
    );
    return (
      <g>
        {heights.map((h, i) => (
          <rect
            key={i}
            x={150 + i * 40 + drift}
            y={250 - h}
            width="24"
            height={h}
            rx="12"
            fill={i % 2 ? palette.b : palette.a}
            opacity={0.78 + (i % 3) * 0.07}
          />
        ))}
        <circle cx={470} cy={92} r={30} fill={palette.c} />
      </g>
    );
  }

  if (category === "video-edit") {
    return (
      <g>
        {[0, 1, 2].map((i) => (
          <g key={i} transform={`translate(${150 + i * 95 + drift} ${90 + i * 20}) rotate(${-10 + i * 7})`}>
            <SoftCard x={0} y={0} w={128} h={92} fill={i === 1 ? palette.b : palette.a} />
            <polygon points="52,24 52,68 92,46" fill={palette.c} />
          </g>
        ))}
      </g>
    );
  }

  if (category === "dev-tools") {
    return (
      <g>
        <SoftCard x={150 + drift} y={62} w={320} h={210} fill="#07131a" />
        <rect x={150 + drift} y={62} width={320} height={40} fill={palette.a} />
        <circle cx={176 + drift} cy={82} r={6} fill="#fecaca" />
        <circle cx={196 + drift} cy={82} r={6} fill="#fde68a" />
        <circle cx={216 + drift} cy={82} r={6} fill="#bbf7d0" />
        <rect x={178 + drift} y={128} width={170} height={9} rx={4} fill={palette.b} />
        <rect x={178 + drift} y={152} width={230} height={9} rx={4} fill="white" opacity="0.22" />
        <rect x={178 + drift} y={176} width={130} height={9} rx={4} fill={palette.c} />
        <rect x={178 + drift} y={200} width={200} height={9} rx={4} fill="white" opacity="0.16" />
      </g>
    );
  }

  if (category === "vector-db") {
    const nodes = [
      [210, 110, 18],
      [340, 84, 14],
      [400, 180, 24],
      [250, 230, 16],
      [310, 150, 30],
    ] as const;
    return (
      <g>
        <path
          d="M210 110L310 150L340 84M310 150L400 180L250 230L210 110"
          stroke={palette.c}
          strokeWidth="3"
          fill="none"
          opacity="0.75"
          transform={`translate(${drift} 0)`}
        />
        {nodes.map(([cx, cy, r], i) => (
          <circle
            key={i}
            cx={cx + drift}
            cy={cy}
            r={r}
            fill={i % 2 ? palette.b : palette.a}
            opacity={0.95}
          />
        ))}
      </g>
    );
  }

  if (category === "api") {
    return (
      <g>
        {[0, 1, 2].map((i) => (
          <SoftCard
            key={i}
            x={160 + i * 24 + drift}
            y={68 + i * 70}
            w={250}
            h={52}
            fill={i === 0 ? palette.a : i === 1 ? palette.b : palette.c}
          />
        ))}
        {[0, 1, 2].map((i) => (
          <circle key={i} cx={188 + i * 24 + drift} cy={94 + i * 70} r={8} fill={palette.ink} />
        ))}
      </g>
    );
  }

  if (category === "retail") {
    return (
      <g>
        <path d={`M${170 + drift} 110h270l-24 48H${194 + drift}z`} fill={palette.a} />
        <SoftCard x={188 + drift} y={158} w={234} h={130} fill={palette.b} />
        <rect x={220 + drift} y={188} width={72} height={100} rx={10} fill={palette.c} />
        <rect x={312 + drift} y={204} width={72} height={38} rx={10} fill="#fff7ed" />
      </g>
    );
  }

  if (category === "ecommerce") {
    return (
      <g>
        <SoftCard x={190 + drift} y={100} w={150} h={140} fill={palette.a} />
        <path
          d={`M${220 + drift} 100c0-36 24-56 45-56s45 20 45 56`}
          stroke={palette.c}
          strokeWidth="14"
          fill="none"
        />
        <circle cx={400 + drift} cy={210} r={72} fill={palette.b} opacity="0.9" />
        <path
          d={`M${370 + drift} 210h60M${400 + drift} 180v60`}
          stroke={palette.ink}
          strokeWidth="8"
          strokeLinecap="round"
        />
      </g>
    );
  }

  if (category === "docs") {
    return (
      <g>
        <SoftCard x={160 + drift} y={56} w={168} h={220} fill={palette.c} />
        <rect x={180 + drift} y={88} width={128} height={11} rx={5} fill={palette.a} />
        <rect x={180 + drift} y={116} width={100} height={9} rx={4} fill={palette.a} opacity="0.5" />
        <rect x={180 + drift} y={142} width={128} height={9} rx={4} fill={palette.a} opacity="0.35" />
        <circle cx={400 + drift} cy={205} r={80} fill={palette.a} />
        <circle cx={400 + drift} cy={205} r={44} fill={palette.ink} />
        <rect
          x={440 + drift}
          y={250}
          width={22}
          height={58}
          rx={8}
          transform={`rotate(-38 ${440 + drift} 250)`}
          fill={palette.b}
        />
      </g>
    );
  }

  if (category === "finance") {
    const bars = [72, 116, 156, 204, 168].map((h, i) => h + ((seed >> (i + 2)) % 16));
    return (
      <g>
        {bars.map((h, i) => (
          <rect
            key={i}
            x={170 + i * 44 + drift}
            y={258 - h}
            width={30}
            height={h}
            rx={9}
            fill={i === bars.length - 1 ? palette.b : palette.a}
          />
        ))}
        <circle cx={440} cy={118} r={50} fill={palette.b} />
        <text
          x={440}
          y={132}
          textAnchor="middle"
          fontSize="34"
          fill={palette.ink}
          fontWeight="700"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
        >
          ¥
        </text>
      </g>
    );
  }

  if (category === "education") {
    return (
      <g>
        <path
          d={`M${150 + drift} 150l150-54 150 54v96l-150 54-150-54z`}
          fill={palette.a}
        />
        <path d={`M${300 + drift} 96v150`} stroke={palette.b} strokeWidth="8" />
        <path
          d={`M${150 + drift} 150l150 54 150-54`}
          fill={palette.c}
          opacity="0.88"
        />
        <circle cx={450} cy={84} r={24} fill={palette.b} />
      </g>
    );
  }

  return (
    <g>
      <circle cx={240 + drift} cy={160} r={68} fill={palette.a} />
      <circle cx={340 + drift} cy={160} r={68} fill={palette.b} />
      <circle cx={226 + drift} cy={148} r={8} fill={palette.ink} />
      <circle cx={254 + drift} cy={148} r={8} fill={palette.ink} />
      <circle cx={326 + drift} cy={148} r={8} fill={palette.ink} />
      <circle cx={354 + drift} cy={148} r={8} fill={palette.ink} />
      <SoftCard x={200 + drift} y={244} w={180} h={22} fill={palette.c} />
    </g>
  );
}

export function ProductCover({
  product,
  className = "",
}: {
  product: Product;
  priority?: boolean;
  className?: string;
}) {
  const { t, locale } = useLocale();
  const coverName = localizedProductName(product, locale);
  const seed = hash(product.id);
  const base = BASE[product.category] ?? BASE.llm;
  const delta = ((seed % 41) - 20) * 2;
  const palette: Palette = {
    bg0: mixHue(base.bg0, Math.round(delta * 0.2)),
    bg1: mixHue(base.bg1, Math.round(delta * 0.35)),
    a: mixHue(base.a, delta),
    b: mixHue(base.b, -delta),
    c: mixHue(base.c, Math.round(delta * 0.5)),
    ink: base.ink,
  };
  const uid = `c-${product.id.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const mark = t(SCENE_LABEL_KEYS[sceneForProduct(product)]);

  return (
    <div className={`relative aspect-[16/9] overflow-hidden bg-[#0b0d10] ${className}`}>
      <svg
        viewBox="0 0 640 360"
        className="h-full w-full"
        role="img"
        aria-label={coverName}
      >
        <defs>
          <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={palette.bg0} />
            <stop offset="55%" stopColor="#05070c" />
            <stop offset="100%" stopColor={palette.bg1} />
          </linearGradient>
          <radialGradient id={`${uid}-orb`} cx={`${58 + (seed % 20)}%`} cy="18%" r="58%">
            <stop offset="0%" stopColor={palette.b} stopOpacity="0.5" />
            <stop offset="100%" stopColor={palette.b} stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${uid}-shine`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="white" stopOpacity="0.14" />
            <stop offset="45%" stopColor="white" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect width="640" height="360" fill={`url(#${uid}-bg)`} />
        <circle cx={470 + (seed % 50)} cy={36} r={170} fill={`url(#${uid}-orb)`} />
        <circle cx={70} cy={310} r={130} fill={palette.a} opacity="0.14" />
        <Scene category={product.category} palette={palette} seed={seed} />
        <rect width="640" height="360" fill={`url(#${uid}-shine)`} />
        <rect x="24" y="292" width="160" height="36" rx="18" fill="black" opacity="0.28" />
        <text
          x="44"
          y="316"
          fill="white"
          opacity="0.78"
          fontSize="16"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
        >
          {mark}
        </text>
      </svg>
    </div>
  );
}
