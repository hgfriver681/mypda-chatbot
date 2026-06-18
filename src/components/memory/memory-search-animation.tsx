"use client";
import { useEffect, useRef } from "react";

// "Through the archive" — a motion study shown when the memory `search_memory`
// tool runs in chat. Purely decorative and additive: it does not replace the
// normal tool-call block (BC's built-in calling animation stays). Ported from
// the standalone HTML study (v1 only): folders rise out of a filing box as a
// scan sweeps left→right→left, then the most relevant one locks up. The
// animation is driven imperatively (querySelector + setAttribute) exactly like
// the original, so the markup stays declarative and React never re-renders per
// frame.

const SIG = 0.17;
const PH: [string, number][] = [
  ["scanR", 2600],
  ["scanL", 2200],
  ["converge", 1000],
  ["lock", 2000],
  ["reset", 900],
];
const TOT = PH.reduce((a, p) => a + p[1], 0);

const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const gauss = (x: number, m: number, s: number) =>
  Math.exp(-((x - m) * (x - m)) / (2 * s * s));

function phaseAt(e: number): [string, number] {
  let t = ((e % TOT) + TOT) % TOT;
  for (const [n, d] of PH) {
    if (t < d) return [n, t / d];
    t -= d;
  }
  return ["reset", 1];
}

function frameState(e: number, wp: number): { h: number; l: number } {
  const [ph, p] = phaseAt(e);
  let h = 0;
  let l = 0;
  if (ph === "scanR") h = easeInOut(p);
  else if (ph === "scanL") h = 1 - easeInOut(p);
  else if (ph === "converge") {
    const k = easeInOut(p);
    h = k * wp;
    l = k;
  } else if (ph === "lock") {
    h = wp;
    l = 1;
  } else {
    const k = easeInOut(p);
    h = wp;
    l = 1 - k;
  }
  return { h, l };
}

const folder = (i: number, bx: number, by: number, fill: string) => (
  <g
    key={i}
    className="fld"
    data-i={i}
    data-bx={bx}
    data-by={by}
    transform={`translate(${bx},${by})`}
  >
    <rect
      x="0"
      y="0"
      width="20"
      height="16"
      rx="4"
      fill={fill}
      stroke="#221f18"
      strokeWidth="2.6"
      strokeLinejoin="round"
      strokeLinecap="round"
    />
    <rect
      x="0"
      y="10"
      width="38"
      height="66"
      rx="5"
      fill={fill}
      stroke="#221f18"
      strokeWidth="2.6"
      strokeLinejoin="round"
      strokeLinecap="round"
    />
  </g>
);

export function MemorySearchAnimation({
  query,
  done,
}: {
  query?: string;
  done?: boolean;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const pausedRef = useRef(false);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const items = [...svg.querySelectorAll<SVGGElement>(".fld")].map((el) => ({
      el,
      bx: Number(el.dataset.bx ?? 0),
      by: Number(el.dataset.by ?? 0),
    }));
    if (items.length === 0) return;
    const n = items.length;
    const win = 2; // the white folder — the "most relevant" one
    const wp = win / (n - 1);

    const update = (st: { h: number; l: number }) => {
      items.forEach((it, i) => {
        const p = i / (n - 1);
        const a = gauss(p, st.h, SIG);
        const w = i === win;
        const lift = a * 8 + (w ? st.l * 30 : -st.l * 1.5);
        it.el.setAttribute(
          "transform",
          `translate(${it.bx},${(it.by - lift).toFixed(1)})`,
        );
      });
    };

    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // Freeze on the "found" frame.
      update(frameState(PH[0][1] + PH[1][1] + PH[2][1] + 300, wp));
      return;
    }

    let raf = 0;
    let last = performance.now();
    let t = 0;
    const loop = (now: number) => {
      const dt = Math.min(now - last, 50);
      last = now;
      if (!pausedRef.current) t += dt;
      update(frameState(t, wp));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      className="my-2 inline-flex flex-col items-center rounded-xl border px-5 pt-3 pb-3 select-none"
      style={{ background: "#f3efe6", borderColor: "#e2dccc" }}
      onMouseEnter={() => {
        pausedRef.current = true;
      }}
      onMouseLeave={() => {
        pausedRef.current = false;
      }}
    >
      <svg
        ref={svgRef}
        viewBox="0 0 470 330"
        xmlns="http://www.w3.org/2000/svg"
        className="block h-auto w-[240px] max-w-full"
        aria-hidden="true"
      >
        {/* box back */}
        <polygon
          points="159,289 159,193 204,161 354,161 354,257 309,289"
          fill="#221f18"
        />
        {/* box opening rim */}
        <polygon
          points="150,182 300,182 345,150 195,150"
          fill="#e8e2d4"
          stroke="#221f18"
          strokeWidth="2.6"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* folders (animated) — drawn behind the front panel */}
        <g className="items">
          {folder(0, 161.0, 152, "#c8a25f")}
          {folder(1, 186.0, 151, "#e3a79d")}
          {folder(2, 211.0, 150, "#fcfaf4")}
          {folder(3, 236.0, 149, "#3e54c4")}
          {folder(4, 261.0, 148, "#c8a25f")}
        </g>
        {/* box front panel */}
        <rect
          x="150"
          y="182"
          width="150"
          height="96"
          rx="3"
          fill="#fcfaf4"
          stroke="#221f18"
          strokeWidth="2.6"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* handle */}
        <rect
          x="207"
          y="222"
          width="36"
          height="13"
          rx="6.5"
          fill="#221f18"
          stroke="#221f18"
          strokeWidth="2.6"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* box right side */}
        <polygon
          points="300,182 345,150 345,246 300,278"
          fill="#54a08f"
          stroke="#221f18"
          strokeWidth="2.6"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <line
          x1="150"
          y1="182"
          x2="300"
          y2="182"
          fill="none"
          stroke="#221f18"
          strokeWidth="2.6"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      <div className="mt-1 text-center" style={{ color: "#221f18" }}>
        <div className="text-sm italic" style={{ fontFamily: "Georgia, serif" }}>
          Through the archive
        </div>
        <div className="mt-0.5 text-xs" style={{ color: "#6a6452" }}>
          {done ? "翻過記憶裡每一份,最相關的浮上來" : "正在翻找記憶…"}
          {query ? ` · 「${query}」` : ""}
        </div>
      </div>
    </div>
  );
}
