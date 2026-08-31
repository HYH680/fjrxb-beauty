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

function WindowChrome({
  x,
  y,
  w,
  h,
  fill,
  accent,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  accent: string;
}) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={14} fill={fill} opacity={0.94} />
      <rect x={x} y={y} width={w} height={28} rx={14} fill="black" opacity={0.22} />
      <rect x={x} y={y + 14} width={w} height={14} fill="black" opacity={0.12} />
      <circle cx={x + 18} cy={y + 14} r={4} fill={accent} opacity={0.9} />
      <circle cx={x + 34} cy={y + 14} r={4} fill="white" opacity={0.35} />
      <circle cx={x + 50} cy={y + 14} r={4} fill="white" opacity={0.2} />
    </g>
  );
}

function Grid({ color }: { color: string }) {
  return (
    <g opacity={0.18} stroke={color} strokeWidth={1}>
      {Array.from({ length: 8 }, (_, i) => (
        <line key={`v${i}`} x1={80 + i * 70} y1={40} x2={80 + i * 70} y2={320} />
      ))}
      {Array.from({ length: 5 }, (_, i) => (
        <line key={`h${i}`} x1={60} y1={60 + i * 55} x2={580} y2={60 + i * 55} />
      ))}
    </g>
  );
}

function Dots({ seed, color }: { seed: number; color: string }) {
  return (
    <g>
      {Array.from({ length: 14 }, (_, i) => {
        const x = 70 + ((seed * (i + 3)) % 500);
        const y = 50 + ((seed * (i + 7)) % 260);
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={1.2 + (i % 3) * 0.6}
            fill={color}
            opacity={0.25 + (i % 4) * 0.12}
          />
        );
      })}
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
  const v = seed % 3;
  const drift = (seed % 29) - 14;

  if (category === "llm" || category === "api") {
    return (
      <g>
        <Grid color={palette.b} />
        <WindowChrome x={90 + drift} y={54} w={420} h={240} fill={palette.a} accent={palette.c} />
        <rect x={112 + drift} y={100} width={210} height={36} rx={10} fill="white" opacity={0.14} />
        <rect x={280 + drift} y={148} width={200} height={44} rx={10} fill={palette.b} opacity={0.85} />
        <rect x={112 + drift} y={206} width={260} height={36} rx={10} fill="white" opacity={0.1} />
        <circle cx={500} cy={88} r={6} fill={palette.c} />
        <circle cx={518} cy={88} r={6} fill={palette.c} opacity={0.55} />
        <circle cx={536} cy={88} r={6} fill={palette.c} opacity={0.3} />
      </g>
    );
  }

  if (category === "image" || category === "creative") {
    return (
      <g>
        <Dots seed={seed} color={palette.c} />
        <WindowChrome x={70 + drift} y={48} w={360} h={250} fill={palette.a} accent={palette.b} />
        <rect x={92 + drift} y={92} width={200} height={160} rx={8} fill={palette.b} opacity={0.55} />
        <rect x={310 + drift} y={92} width={96} height={28} rx={6} fill="white" opacity={0.16} />
        <rect x={310 + drift} y={132} width={96} height={28} rx={6} fill="white" opacity={0.12} />
        <rect x={310 + drift} y={172} width={96} height={28} rx={6} fill={palette.c} opacity={0.7} />
        <rect x={460} y={70 + v * 12} width={120} height={160} rx={16} fill={palette.c} opacity={0.35} />
        <rect x={476} y={92 + v * 12} width={88} height={110} rx={8} fill={palette.b} opacity={0.75} />
      </g>
    );
  }

  if (category === "speech") {
    const bars = Array.from({ length: 22 }, (_, i) => {
      const h = 28 + ((seed >>> i) % 70);
      return (
        <rect
          key={i}
          x={120 + i * 16}
          y={180 - h / 2}
          width={8}
          height={h}
          rx={3}
          fill={i % 3 === 0 ? palette.b : palette.a}
          opacity={0.75 + (i % 4) * 0.05}
        />
      );
    });
    return (
      <g>
        <WindowChrome x={80} y={60} w={460} h={220} fill={palette.ink} accent={palette.a} />
        <rect x={100} y={100} width={420} height={140} rx={12} fill={palette.a} opacity={0.25} />
        {bars}
        <circle cx={160} cy={250} r={10} fill={palette.b} />
        <rect x={190} y={244} width={240} height={12} rx={6} fill="white" opacity={0.2} />
      </g>
    );
  }

  if (category === "video-edit") {
    return (
      <g>
        <WindowChrome x={60 + drift} y={42} w={500} h={260} fill={palette.ink} accent={palette.a} />
        <rect x={84 + drift} y={84} width={280} height={120} rx={8} fill={palette.a} opacity={0.45} />
        <rect x={380 + drift} y={84} width={150} height={28} rx={6} fill="white" opacity={0.14} />
        <rect x={380 + drift} y={124} width={150} height={28} rx={6} fill="white" opacity={0.1} />
        <rect x={84 + drift} y={220} width={90} height={48} rx={6} fill={palette.b} opacity={0.8} />
        <rect x={186 + drift} y={220} width={130} height={48} rx={6} fill={palette.a} opacity={0.65} />
        <rect x={328 + drift} y={220} width={100} height={48} rx={6} fill={palette.c} opacity={0.7} />
        <rect x={440 + drift} y={220} width={90} height={48} rx={6} fill="white" opacity={0.12} />
      </g>
    );
  }

  if (category === "we-media") {
    return (
      <g>
        <rect x={70 + drift} y={50} width={280} height={250} rx={18} fill={palette.a} opacity={0.9} />
        <rect x={86 + drift} y={72} width={248} height={160} rx={10} fill={palette.b} opacity={0.55} />
        <rect x={86 + drift} y={246} width={120} height={28} rx={8} fill={palette.c} opacity={0.85} />
        <rect x={380} y={70} width={160} height={210} rx={22} fill={palette.ink} opacity={0.95} />
        <rect x={396} y={96} width={128} height={150} rx={10} fill={palette.a} opacity={0.55} />
        <circle cx={460} cy={264} r={10} fill="white" opacity={0.25} />
      </g>
    );
  }

  if (category === "dev-tools") {
    return (
      <g>
        <Grid color={palette.a} />
        <WindowChrome x={80 + drift} y={50} w={460} h={250} fill={palette.ink} accent={palette.a} />
        {[0, 1, 2, 3, 4].map((i) => (
          <rect
            key={i}
            x={110 + drift}
            y={100 + i * 28}
            width={140 + ((seed + i * 17) % 160)}
            height={12}
            rx={4}
            fill={i === 2 ? palette.b : "white"}
            opacity={i === 2 ? 0.85 : 0.18}
          />
        ))}
        <rect x={400 + drift} y={100} width={110} height={150} rx={10} fill={palette.a} opacity={0.35} />
      </g>
    );
  }

  if (category === "vector-db") {
    const nodes = [
      [180, 120],
      [300, 90],
      [420, 130],
      [240, 210],
      [360, 230],
      [480, 200],
    ] as const;
    return (
      <g>
        <Dots seed={seed} color={palette.b} />
        {nodes.map(([x, y], i) =>
          nodes.slice(i + 1).map(([x2, y2], j) => (
            <line
              key={`${i}-${j}`}
              x1={x}
              y1={y}
              x2={x2}
              y2={y2}
              stroke={palette.a}
              strokeWidth={1.5}
              opacity={0.35}
            />
          ))
        )}
        {nodes.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={10 + (i % 3)} fill={i % 2 ? palette.b : palette.a} />
        ))}
      </g>
    );
  }

  if (category === "retail" || category === "ecommerce") {
    return (
      <g>
        <WindowChrome x={70 + drift} y={48} w={480} h={250} fill={palette.ink} accent={palette.a} />
        <rect x={96 + drift} y={96} width={140} height={90} rx={10} fill={palette.a} opacity={0.7} />
        <rect x={252 + drift} y={96} width={140} height={90} rx={10} fill={palette.b} opacity={0.55} />
        <rect x={408 + drift} y={96} width={110} height={90} rx={10} fill={palette.c} opacity={0.65} />
        <rect x={96 + drift} y={210} width={420} height={50} rx={10} fill="white" opacity={0.1} />
        <rect x={112 + drift} y={226} width={180} height={16} rx={5} fill={palette.a} opacity={0.75} />
      </g>
    );
  }

  if (category === "docs") {
    return (
      <g>
        <rect x={120 + drift} y={46} width={280} height={270} rx={12} fill="white" opacity={0.92} />
        <rect x={148 + drift} y={78} width={180} height={12} rx={4} fill={palette.a} opacity={0.7} />
        <rect x={148 + drift} y={108} width={220} height={8} rx={3} fill={palette.ink} opacity={0.2} />
        <rect x={148 + drift} y={128} width={200} height={8} rx={3} fill={palette.ink} opacity={0.16} />
        <rect x={148 + drift} y={148} width={160} height={8} rx={3} fill={palette.ink} opacity={0.14} />
        <rect x={160 + drift} y={180} width={180} height={70} rx={8} fill={palette.b} opacity={0.35} stroke={palette.a} strokeWidth={2} strokeDasharray="6 4" />
        <rect x={430} y={90} width={120} height={160} rx={10} fill={palette.a} opacity={0.45} />
      </g>
    );
  }

  if (category === "finance") {
    const hs = [70, 110, 90, 140, 100, 160, 120];
    return (
      <g>
        <WindowChrome x={80} y={50} w={460} h={250} fill={palette.ink} accent={palette.a} />
        {hs.map((hh, i) => (
          <rect
            key={i}
            x={130 + i * 50}
            y={250 - hh}
            width={28}
            height={hh}
            rx={6}
            fill={i === 5 ? palette.b : palette.a}
            opacity={0.8}
          />
        ))}
        <path
          d="M130 180 C180 140 220 200 280 150 S380 120 460 100"
          fill="none"
          stroke={palette.c}
          strokeWidth={3}
          opacity={0.85}
        />
      </g>
    );
  }

  if (category === "education") {
    return (
      <g>
        <rect x={90 + drift} y={70} width={360} height={210} rx={14} fill={palette.a} opacity={0.85} />
        <rect x={110 + drift} y={96} width={200} height={14} rx={5} fill="white" opacity={0.35} />
        <rect x={110 + drift} y={130} width={280} height={10} rx={4} fill="white" opacity={0.18} />
        <rect x={110 + drift} y={154} width={240} height={10} rx={4} fill="white" opacity={0.14} />
        <rect x={480} y={100} width={90} height={120} rx={10} fill={palette.b} opacity={0.7} transform={`rotate(${v * 4} 525 160)`} />
      </g>
    );
  }

  if (category === "hr") {
    return (
      <g>
        <rect x={80 + drift} y={60} width={200} height={230} rx={14} fill={palette.a} opacity={0.8} />
        <circle cx={180 + drift} cy={120} r={34} fill={palette.b} opacity={0.85} />
        <rect x={110 + drift} y={180} width={140} height={10} rx={4} fill="white" opacity={0.25} />
        <rect x={110 + drift} y={204} width={110} height={10} rx={4} fill="white" opacity={0.16} />
        <rect x={310} y={80} width={220} height={60} rx={12} fill={palette.b} opacity={0.55} />
        <rect x={310} y={156} width={220} height={60} rx={12} fill={palette.a} opacity={0.45} />
        <rect x={310} y={232} width={220} height={60} rx={12} fill={palette.c} opacity={0.4} />
      </g>
    );
  }

  return (
    <g>
      <Grid color={palette.a} />
      <WindowChrome x={100} y={60} w={400} h={220} fill={palette.a} accent={palette.b} />
      <rect x={130} y={120} width={200} height={16} rx={5} fill="white" opacity={0.2} />
      <rect x={130} y={156} width={260} height={16} rx={5} fill="white" opacity={0.14} />
      <rect x={130} y={192} width={160} height={16} rx={5} fill={palette.c} opacity={0.7} />
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
            <stop offset="50%" stopColor="#07090e" />
            <stop offset="100%" stopColor={palette.bg1} />
          </linearGradient>
          <radialGradient id={`${uid}-orb`} cx={`${55 + (seed % 18)}%`} cy="12%" r="55%">
            <stop offset="0%" stopColor={palette.b} stopOpacity="0.45" />
            <stop offset="100%" stopColor={palette.b} stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${uid}-shine`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="white" stopOpacity="0.1" />
            <stop offset="50%" stopColor="white" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect width="640" height="360" fill={`url(#${uid}-bg)`} />
        <circle cx={480 + (seed % 40)} cy={28} r={160} fill={`url(#${uid}-orb)`} />
        <Scene category={product.category} palette={palette} seed={seed} />
        <rect width="640" height="360" fill={`url(#${uid}-shine)`} />
        <rect x="24" y="292" width="168" height="34" rx="17" fill="black" opacity="0.32" />
        <text
          x="44"
          y="314"
          fill="white"
          opacity="0.82"
          fontSize="15"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
        >
          {mark}
        </text>
      </svg>
      <div
        className="shelf-cover-scan pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-transparent via-white/10 to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          maskImage: "radial-gradient(ellipse at center, black 20%, transparent 75%)",
        }}
        aria-hidden
      />
    </div>
  );
}
