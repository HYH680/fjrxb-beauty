"use client";

/**
 * 工作台科技背景；落地页改暖色货架隔板，减少青蓝模板感。
 */
export function TechBackdrop({
  className = "",
  variant = "default",
}: {
  className?: string;
  /** landing：暖色货架隔板，不铺科技网格 */
  variant?: "default" | "landing";
}) {
  const uid = "tb";
  const linkId = `${uid}-link`;
  const nodeId = `${uid}-node`;
  const landing = variant === "landing";

  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`.trim()}
      aria-hidden
    >
      <div
        className={`absolute inset-0 ${
          landing
            ? "bg-[radial-gradient(ellipse_90%_70%_at_50%_-8%,#2a1c12_0%,#0f0d0b_58%,#0c0a08_100%)]"
            : "bg-[radial-gradient(ellipse_90%_70%_at_50%_-10%,#132038_0%,#0b0d10_58%,#08090c_100%)]"
        }`}
      />

      <div
        className={`tech-aurora absolute -left-1/4 top-[-20%] h-[70%] w-[70%] rounded-full blur-[100px] ${
          landing ? "bg-[#c4843c]/18" : "bg-[#22d3ee]/12"
        }`}
      />
      <div
        className={`tech-aurora-delay absolute -right-1/5 top-[10%] h-[55%] w-[55%] rounded-full blur-[110px] ${
          landing ? "bg-[#e08a3c]/10" : "bg-[#3b82f6]/14"
        }`}
      />

      {landing ? (
        <div className="shelf-bays absolute inset-x-[6%] top-[28%] h-[58%] opacity-70" />
      ) : (
        <>
          <div className="tech-floor-grid absolute inset-x-0 bottom-0 h-[58%] opacity-[0.55]" />
          <div className="tech-near-grid absolute inset-0 opacity-40" />
        </>
      )}

      {/* Rising data particles */}
      {!landing ? (
      <div className="absolute inset-0">
        {PARTICLES.map((p) => (
          <span
            key={p.id}
            className="tech-particle absolute rounded-full bg-cyan-300/80"
            style={{
              left: p.left,
              bottom: p.bottom,
              width: p.size,
              height: p.size,
              animationDelay: p.delay,
              animationDuration: p.duration,
              opacity: p.opacity,
              boxShadow: `0 0 ${p.size * 3}px rgba(103,232,249,0.55)`,
            }}
          />
        ))}
      </div>
      ) : null}

      {/* Agent constellation — right field */}
      {!landing ? (
        <svg
          className="tech-constellation absolute right-[-4%] top-[8%] h-[72%] w-[58%] max-w-[640px] opacity-70"
          viewBox="0 0 640 520"
          fill="none"
        >
        <defs>
          <linearGradient id={linkId} x1="80" y1="60" x2="560" y2="420" gradientUnits="userSpaceOnUse">
            <stop stopColor="#67e8f9" stopOpacity="0.55" />
            <stop offset="1" stopColor="#3b82f6" stopOpacity="0.15" />
          </linearGradient>
          <radialGradient id={nodeId} cx="0.5" cy="0.5" r="0.5">
            <stop stopColor="#e0f2fe" />
            <stop offset="1" stopColor="#22d3ee" stopOpacity="0.2" />
          </radialGradient>
        </defs>
        <path
          d="M120 160 L280 90 L420 150 L520 80 M280 90 L300 250 L420 150 M300 250 L180 320 L420 360 L520 280"
          stroke={`url(#${linkId})`}
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        {[
          [120, 160],
          [280, 90],
          [420, 150],
          [520, 80],
          [300, 250],
          [180, 320],
          [420, 360],
          [520, 280],
        ].map(([cx, cy], i) => (
          <g key={i} className="tech-node-pulse" style={{ animationDelay: `${i * 0.35}s` }}>
            <circle cx={cx} cy={cy} r="14" fill={`url(#${nodeId})`} opacity="0.35" />
            <circle cx={cx} cy={cy} r="4.5" fill="#67e8f9" />
            <circle cx={cx} cy={cy} r="1.8" fill="#f0f9ff" />
          </g>
        ))}
      </svg>
      ) : null}

      {!landing ? (
        <div className="tech-scan absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-cyan-400/10 via-cyan-400/5 to-transparent" />
      ) : null}

      <div
        className={`absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t to-transparent ${
          landing ? "from-[#0f0d0b]" : "from-[#0b0d10]"
        }`}
      />
    </div>
  );
}

const PARTICLES = [
  { id: 1, left: "8%", bottom: "8%", size: 3, delay: "0s", duration: "11s", opacity: 0.55 },
  { id: 2, left: "18%", bottom: "18%", size: 2, delay: "1.2s", duration: "13s", opacity: 0.4 },
  { id: 3, left: "28%", bottom: "4%", size: 2.5, delay: "2.4s", duration: "10s", opacity: 0.5 },
  { id: 4, left: "42%", bottom: "22%", size: 2, delay: "0.6s", duration: "14s", opacity: 0.35 },
  { id: 5, left: "55%", bottom: "10%", size: 3, delay: "3s", duration: "12s", opacity: 0.45 },
  { id: 6, left: "68%", bottom: "28%", size: 2, delay: "1.8s", duration: "15s", opacity: 0.3 },
  { id: 7, left: "78%", bottom: "6%", size: 2.5, delay: "4s", duration: "11s", opacity: 0.5 },
  { id: 8, left: "88%", bottom: "20%", size: 2, delay: "2.2s", duration: "13s", opacity: 0.35 },
  { id: 9, left: "12%", bottom: "35%", size: 1.5, delay: "5s", duration: "16s", opacity: 0.28 },
  { id: 10, left: "35%", bottom: "42%", size: 2, delay: "3.5s", duration: "12s", opacity: 0.32 },
  { id: 11, left: "62%", bottom: "38%", size: 1.5, delay: "0.9s", duration: "14s", opacity: 0.25 },
  { id: 12, left: "92%", bottom: "40%", size: 2.5, delay: "4.5s", duration: "10s", opacity: 0.4 },
];
