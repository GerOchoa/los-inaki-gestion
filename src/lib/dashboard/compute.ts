// Motor de cálculo del tablero, portado del index.html de referencia
// (Tablero Gerencial — Los Iñaki) a TypeScript. La lógica de negocio
// (GOP, comparativas, drivers, insights, preguntas estratégicas) es la
// misma; sólo cambia de dónde vienen los datos (Supabase en vez de Excel).

import type { DashRow } from "./transform";

export const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export type PageKey = "global" | "alojamiento" | "cafeteria" | "otros";

export const PAGE_CONFIG: Record<
  PageKey,
  { title: string; subtitle: string; scope: string[] | null }
> = {
  global: {
    title: "Global / GOP del negocio",
    subtitle: "Lectura consolidada de ingresos, gastos operativos, GOP y evolución.",
    scope: null,
  },
  alojamiento: {
    title: "Alojamiento",
    subtitle:
      "Resultado operativo del negocio de alojamiento. Ocupación, ADR y RevPAR se incorporarán cuando exista módulo de reservas.",
    scope: ["ALOJAMIENTO"],
  },
  cafeteria: {
    title: "Cafetería",
    subtitle:
      "Resultado operativo de gastronomía/cafetería: ingresos, costos, GOP y drivers principales.",
    scope: ["CAFETERIA"],
  },
  otros: {
    title: "Otros ingresos / Gestión",
    subtitle: "Eventos, otros ingresos y señales de control administrativo relevantes.",
    scope: ["EVENTOS", "OTROS"],
  },
};

export function norm(s: unknown): string {
  return (s ?? "").toString().trim().toUpperCase();
}

export function canonUnit(s: unknown): string {
  const n = norm(s);
  if (n.includes("ALOJ")) return "ALOJAMIENTO";
  if (n.includes("CONFIT") || n.includes("CAFET")) return "CAFETERIA";
  if (n.includes("EVENT")) return "EVENTOS";
  return "OTROS";
}

export function getMonto(r: DashRow): number {
  return Number(r.MONTO) || 0;
}

function dateObj(r: DashRow): Date | null {
  const f = r["FECHA DE OPERACION"];
  if (!f || !/^\d{4}-\d{2}-\d{2}/.test(f)) return null;
  return new Date(f.slice(0, 10) + "T12:00:00");
}

// Formato moneda es-AR con separador de miles/millones (punto) y coma
// decimal — es el formato por defecto de Intl para "ARS".
export function money(n: number): string {
  return (Number(n) || 0).toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function pct(n: number): string {
  return `${(Number(n) || 0).toFixed(1)}%`;
}

function isOpExpense(r: DashRow): boolean {
  return norm(r.TIPO).includes("GASTO OPERATIVO");
}

function isInvestment(r: DashRow): boolean {
  return norm(r.TIPO).includes("INVERSION");
}

function isRetiro(r: DashRow): boolean {
  return norm(r.TIPO).includes("RETIRO");
}

function hasReceipt(r: DashRow): boolean {
  const t = norm(r["TIPO DE COMPROBANTE"]);
  const c = norm(r.COMPROBANTE);
  return !(t.includes("SIN COMPROBANTE") || c === "NO");
}

function sum(arr: DashRow[]): number {
  return arr.reduce((a, r) => a + getMonto(r), 0);
}

function avg(arr: DashRow[]): number {
  return arr.length ? sum(arr) / arr.length : 0;
}

function groupSum(arr: DashRow[], keyfn: (r: DashRow) => string): [string, number][] {
  const m: Record<string, number> = {};
  arr.forEach((r) => {
    const k = keyfn(r) || "SIN DATO";
    m[k] = (m[k] || 0) + getMonto(r);
  });
  return Object.entries(m).sort((a, b) => b[1] - a[1]);
}

function ymDate(y: number, m: number, offset: number) {
  const d = new Date(y, m - 1 + offset, 1, 12);
  return { y: d.getFullYear(), m: d.getMonth() + 1 };
}

export function allYears(ventas: DashRow[], gastos: DashRow[]): number[] {
  const ys = new Set(
    [...ventas, ...gastos]
      .map(dateObj)
      .filter((d): d is Date => !!d)
      .map((d) => d.getFullYear())
  );
  return [...ys].sort((a, b) => b - a);
}

export function latestYM(ventas: DashRow[], gastos: DashRow[]) {
  const ds = [...ventas, ...gastos]
    .map(dateObj)
    .filter((d): d is Date => !!d)
    .sort((a, b) => b.getTime() - a.getTime());
  const d = ds[0] || new Date();
  return { y: d.getFullYear(), m: d.getMonth() + 1 };
}

function earliestYM(ventas: DashRow[], gastos: DashRow[]) {
  const ds = [...ventas, ...gastos]
    .map(dateObj)
    .filter((d): d is Date => !!d)
    .sort((a, b) => a.getTime() - b.getTime());
  const d = ds[0] || new Date();
  return { y: d.getFullYear(), m: d.getMonth() + 1 };
}

// Filtros de fecha admiten selección múltiple: arrays vacíos = "todos".
export interface Filters {
  page: PageKey;
  years: number[];
  months: number[];
  days: number[];
  unit: string; // sólo aplica en la página "global"; "ALL" o unidad canónica
}

function scopeAllows(r: DashRow, f: Filters): boolean {
  const u = canonUnit(r["UNIDAD DE NEGOCIO"]);
  const cfg = PAGE_CONFIG[f.page];
  if (f.page === "global") {
    return f.unit === "ALL" || u === f.unit;
  }
  return (cfg.scope || []).includes(u);
}

function periodMatch(r: DashRow, f: Filters): boolean {
  const d = dateObj(r);
  if (!d) return false;
  if (f.years.length && !f.years.includes(d.getFullYear())) return false;
  if (f.months.length && !f.months.includes(d.getMonth() + 1)) return false;
  if (f.days.length && !f.days.includes(d.getDate())) return false;
  return scopeAllows(r, f);
}

function filterPeriod(arr: DashRow[], f: Filters): DashRow[] {
  return arr.filter((r) => periodMatch(r, f));
}

// La comparación "vs. mes anterior" sólo tiene sentido con un único mes
// seleccionado; con selección múltiple se muestra el período combinado
// sin comparativo.
function isComparable(f: Filters): boolean {
  return f.years.length === 1 && f.months.length === 1;
}

function currentAndPrevious(ventas: DashRow[], gastos: DashRow[], f: Filters) {
  const cv = filterPeriod(ventas, f);
  const cg = filterPeriod(gastos, f);
  const comparable = isComparable(f);
  let pv: DashRow[] = [];
  let pg: DashRow[] = [];
  if (comparable) {
    const prev = ymDate(f.years[0], f.months[0], -1);
    const pf: Filters = { ...f, years: [prev.y], months: [prev.m] };
    pv = filterPeriod(ventas, pf);
    pg = filterPeriod(gastos, pf);
  }
  return { cv, cg, pv, pg, comparable };
}

export interface Metrics {
  ingresos: number;
  gastosOp: number;
  gop: number;
  margen: number;
  ticket: number;
  documented: number;
  inversiones: number;
  retiros: number;
  ops: number;
  gastosCount: number;
  noReceipt: number;
}

function metrics(v: DashRow[], g: DashRow[]): Metrics {
  const op = g.filter(isOpExpense);
  const inv = g.filter(isInvestment);
  const ret = g.filter(isRetiro);
  const ingresos = sum(v);
  const gastosOp = sum(op);
  const gop = ingresos - gastosOp;
  const margen = ingresos ? (gop / ingresos) * 100 : 0;
  const ticket = avg(v);
  const documented = g.length ? (g.filter(hasReceipt).length / g.length) * 100 : 100;
  return {
    ingresos,
    gastosOp,
    gop,
    margen,
    ticket,
    documented,
    inversiones: sum(inv),
    retiros: sum(ret),
    ops: v.length,
    gastosCount: g.length,
    noReceipt: g.filter((x) => !hasReceipt(x)).length,
  };
}

function change(cur: number, prev: number) {
  if (prev === 0) {
    if (cur === 0) return { v: 0, label: "0,0%", flat: true };
    return { v: 100, label: "+100,0%", flat: false };
  }
  const v = ((cur - prev) / Math.abs(prev)) * 100;
  return { v, label: `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`, flat: Math.abs(v) < 0.05 };
}

function compHtml(cur: number, prev: number, higherBetter = true): string {
  const c = change(cur, prev);
  let cls = "flat";
  let arrow = "•";
  if (!c.flat) {
    const positive = higherBetter ? c.v > 0 : c.v < 0;
    cls = positive ? "good" : "bad";
    arrow = c.v > 0 ? "▲" : "▼";
  }
  return `<span class="compare ${cls}">${arrow} ${c.label}</span>`;
}

function card(
  title: string,
  value: string,
  cur: number,
  prev: number,
  higherBetter: boolean,
  detail: string,
  comparable: boolean
): string {
  const compare = comparable
    ? compHtml(cur, prev, higherBetter)
    : '<span class="compare flat">• período combinado</span>';
  const detailText = comparable ? `vs. mes anterior · ${detail || ""}` : detail || "";
  return `<div class="kpi"><div class="t">${title}</div><div class="v">${value}</div>${compare}<div class="d">${detailText}</div></div>`;
}

function statTile(title: string, value: string, detail?: string): string {
  return `<div class="kpi"><div class="t">${title}</div><div class="v">${value}</div>${
    detail ? `<div class="d">${detail}</div>` : ""
  }</div>`;
}

export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string)
  );
}

function barHtml(data: [string, number][], expense = false): string {
  const max = Math.max(1, ...data.map((x) => x[1]));
  return data.length
    ? data
        .slice(0, 8)
        .map(
          ([k, v]) =>
            `<div class="bar-row"><div class="bar-label" title="${esc(k)}">${esc(
              k
            )}</div><div class="bar-bg"><div class="bar ${expense ? "exp" : ""}" style="width:${Math.max(
              2,
              (v / max) * 100
            )}%"></div></div><div class="bar-val">${money(v)}</div></div>`
        )
        .join("")
    : '<div class="muted">Sin datos para el período.</div>';
}

function moneyShort(v: number): string {
  const sign = v < 0 ? "-" : "";
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1).replace(".", ",")}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1).replace(".", ",")}k`;
  return `${sign}$${Math.round(abs)}`;
}


function paretoChartHtml(data: [string, number][]): string {
  if (!data.length) return "";
  const top = data.slice(0, 10);
  const total = data.reduce((a, [, v]) => a + v, 0) || 1;
  const W = 720,
    H = 270,
    padL = 44,
    padR = 34,
    padT = 16,
    padB = 62;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const n = top.length;
  const maxV = Math.max(1, ...top.map((x) => x[1]));
  const bw = innerW / n;
  const xC = (i: number) => padL + bw * i + bw / 2;
  const yBar = (v: number) => padT + (1 - v / maxV) * innerH;
  const yPct = (p: number) => padT + (1 - p / 100) * innerH;
  const axisY = padT + innerH;

  let acc = 0;
  const points = top.map(([k, v], i) => {
    acc += v;
    const cum = (acc / total) * 100;
    return { x: xC(i), y: yPct(cum), cum, v, k };
  });

  // Grid + eje izquierdo (monto) y derecho (% acumulado)
  let grid = "";
  for (let i = 0; i <= 4; i++) {
    const val = (maxV * i) / 4;
    const yy = yBar(val);
    grid += `<line x1="${padL}" y1="${yy.toFixed(1)}" x2="${W - padR}" y2="${yy.toFixed(
      1
    )}" stroke="#eef1f5"/><text x="${(padL - 6).toFixed(1)}" y="${(yy + 3).toFixed(
      1
    )}" text-anchor="end" font-size="8" fill="#9aa5b3">${moneyShort(val)}</text>`;
  }
  let pctAxis = "";
  [0, 20, 40, 60, 80, 100].forEach((p) => {
    const yy = yPct(p);
    pctAxis += `<text x="${(W - padR + 6).toFixed(1)}" y="${(yy + 3).toFixed(
      1
    )}" font-size="8" fill="#9aa5b3">${p}%</text>`;
  });

  const bars = top
    .map(([, v], i) => {
      const bh = innerH - (yBar(v) - padT);
      return `<rect x="${(padL + bw * i + bw * 0.2).toFixed(1)}" y="${yBar(v).toFixed(1)}" width="${(
        bw * 0.6
      ).toFixed(1)}" height="${Math.max(0, bh).toFixed(1)}" fill="#b6672f" rx="2"/>`;
    })
    .join("");

  const linePath = points.map((p, i) => `${i ? "L" : "M"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const dots = points
    .map((p) => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="2.5" fill="#163d5d"/>`)
    .join("");

  const cumLabels = points
    .map(
      (p) =>
        `<text x="${p.x.toFixed(1)}" y="${(p.y - 7).toFixed(
          1
        )}" text-anchor="middle" font-size="8" font-weight="700" fill="#163d5d">${pct(p.cum)}</text>`
    )
    .join("");

  const valueLabels = top
    .map(([, v], i) => {
      const yy = yBar(v) - 5;
      return `<text x="${xC(i).toFixed(1)}" y="${yy.toFixed(
        1
      )}" text-anchor="middle" font-size="7.5" fill="#7b8796">${moneyShort(v)}</text>`;
    })
    .join("");

  const catLabels = points
    .map((p) => {
      const short = p.k.length > 14 ? p.k.slice(0, 13) + "…" : p.k;
      const ly = axisY + 9;
      return `<text x="${p.x.toFixed(1)}" y="${ly.toFixed(
        1
      )}" text-anchor="end" font-size="7.5" font-weight="600" fill="#475569" transform="rotate(-35 ${p.x.toFixed(
        1
      )} ${ly.toFixed(1)})">${esc(short)}</text>`;
    })
    .join("");

  const y80 = yPct(80);
  const ref80 = `<line x1="${padL}" y1="${y80.toFixed(1)}" x2="${W - padR}" y2="${y80.toFixed(
    1
  )}" stroke="#c4362f" stroke-dasharray="4 3" stroke-width="1"/>`;

  return `<div class="legend"><span><i class="dot" style="background:#b6672f"></i>Monto</span><span><i class="dot" style="background:#163d5d"></i>% acumulado</span></div><div class="chart"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${grid}${pctAxis}${ref80}${bars}<path d="${linePath}" fill="none" stroke="#163d5d" stroke-width="2"/>${dots}${cumLabels}${valueLabels}${catLabels}</svg></div>`;
}

// --- Tabla "Detalle por período": una fila por cada período presente en
// la selección actual (agrupa por día si hay un único mes+año con días
// específicos elegidos; si no, agrupa por mes). Responde a la selección
// múltiple de año/mes/día.
function periodKey(d: Date, byDay: boolean): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  if (!byDay) return `${y}-${m}`;
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function periodLabel(key: string, byDay: boolean): string {
  const parts = key.split("-").map(Number);
  if (byDay) return `${String(parts[2]).padStart(2, "0")}/${String(parts[1]).padStart(2, "0")}/${parts[0]}`;
  return `${MONTHS[parts[1] - 1]} ${parts[0]}`;
}

function periodBreakdownHtml(cv: DashRow[], cg: DashRow[], f: Filters): string {
  const byDay = f.years.length === 1 && f.months.length === 1 && f.days.length > 0;
  const keys = new Set<string>();
  cv.forEach((r) => {
    const d = dateObj(r);
    if (d) keys.add(periodKey(d, byDay));
  });
  cg.forEach((r) => {
    const d = dateObj(r);
    if (d) keys.add(periodKey(d, byDay));
  });
  const sortedKeys = [...keys].sort();
  if (!sortedKeys.length) return '<div class="muted">Sin datos para el período.</div>';

  const rows = sortedKeys
    .map((k) => {
      const v = cv.filter((r) => {
        const d = dateObj(r);
        return d && periodKey(d, byDay) === k;
      });
      const g = cg.filter((r) => {
        const d = dateObj(r);
        return d && periodKey(d, byDay) === k;
      });
      const mm = metrics(v, g);
      return `<tr><td>${esc(periodLabel(k, byDay))}</td><td class="right">${money(
        mm.ingresos
      )}</td><td class="right">${money(mm.gastosOp)}</td><td class="right">${money(
        mm.gop
      )}</td><td class="right">${pct(mm.margen)}</td><td class="right">${mm.ops}</td></tr>`;
    })
    .join("");

  return `<div class="table-wrap"><table class="tbl"><thead><tr><th>Período</th><th class="right">Ingresos</th><th class="right">Gastos operativos</th><th class="right">GOP</th><th class="right">Margen</th><th class="right">Operaciones</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

// --- Evolución (gráfico de líneas + tabla acompañante): eje de tiempo fijo
// desde agosto 2026 en adelante (independiente de los filtros de período),
// sólo acota por unidad de negocio. "Ampliar" extiende el inicio hasta el
// mes más antiguo con datos.
const EVOLUTION_START = { y: 2026, m: 8 };

function unitAllows(r: DashRow, unit: string): boolean {
  return unit === "ALL" || canonUnit(r["UNIDAD DE NEGOCIO"]) === unit;
}

function monthRange(fromY: number, fromM: number, toY: number, toM: number) {
  const out: { y: number; m: number }[] = [];
  let y = fromY;
  let m = fromM;
  let guard = 0;
  while ((y < toY || (y === toY && m <= toM)) && guard < 600) {
    out.push({ y, m });
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    guard += 1;
  }
  return out;
}

interface EvolutionPoint {
  label: string;
  income: number;
  expense: number;
  gop: number;
  margen: number;
}

function evolutionSeries(
  ventas: DashRow[],
  gastos: DashRow[],
  unit: string,
  expanded: boolean
): { series: EvolutionPoint[]; canExpand: boolean } {
  const latest = latestYM(ventas, gastos);
  const earliest = earliestYM(ventas, gastos);
  const earlierThanFixedStart =
    earliest.y < EVOLUTION_START.y || (earliest.y === EVOLUTION_START.y && earliest.m < EVOLUTION_START.m);
  const start = expanded && earlierThanFixedStart ? earliest : EVOLUTION_START;
  const end =
    latest.y > start.y || (latest.y === start.y && latest.m >= start.m) ? latest : start;

  const months = monthRange(start.y, start.m, end.y, end.m);
  const series = months.map(({ y, m }) => {
    const v = ventas.filter((r) => {
      const d = dateObj(r);
      return d && d.getFullYear() === y && d.getMonth() + 1 === m && unitAllows(r, unit);
    });
    const g = gastos.filter((r) => {
      const d = dateObj(r);
      return d && d.getFullYear() === y && d.getMonth() + 1 === m && unitAllows(r, unit);
    });
    const mm = metrics(v, g);
    return {
      label: `${MONTHS[m - 1].slice(0, 3)} ${String(y).slice(-2)}`,
      income: mm.ingresos,
      expense: mm.gastosOp,
      gop: mm.gop,
      margen: mm.margen,
    };
  });

  return { series, canExpand: earlierThanFixedStart };
}

function evolutionTableHtml(series: EvolutionPoint[]): string {
  if (!series.length) return '<div class="muted">Sin datos para el período.</div>';
  const rows = series
    .map(
      (s) =>
        `<tr><td>${esc(s.label)}</td><td class="right">${money(s.income)}</td><td class="right">${money(
          s.expense
        )}</td><td class="right">${money(s.gop)}</td><td class="right">${pct(s.margen)}</td></tr>`
    )
    .join("");
  return `<div class="table-wrap"><table class="tbl"><thead><tr><th>Mes</th><th class="right">Ingresos</th><th class="right">Gastos operativos</th><th class="right">GOP</th><th class="right">Margen</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function lineChart(series: { label: string; income: number; expense: number; gop: number }[]): string {
  const W = 720, H = 230, padL = 54, padR = 20, padT = 20, padB = 36;
  const vals = series.flatMap((x) => [x.income, x.expense, x.gop]);
  const min = Math.min(0, ...vals);
  let max = Math.max(1, ...vals);
  if (max === min) max = min + 1;
  const x = (i: number) => padL + (i * (W - padL - padR)) / Math.max(1, series.length - 1);
  const y = (v: number) => padT + ((max - v) * (H - padT - padB)) / (max - min);
  const path = (key: "income" | "expense" | "gop") =>
    series.map((s, i) => `${i ? "L" : "M"} ${x(i).toFixed(1)} ${y(s[key]).toFixed(1)}`).join(" ");

  let ticks = "";
  for (let i = 0; i < 5; i++) {
    const val = min + ((max - min) * (4 - i)) / 4;
    const yy = padT + (i * (H - padT - padB)) / 4;
    ticks += `<line x1="${padL}" y1="${yy}" x2="${W - padR}" y2="${yy}" stroke="#e7ebf0"/><text x="${
      padL - 7
    }" y="${yy + 4}" text-anchor="end" font-size="10" fill="#7b8796">${Math.round(val / 1000)}k</text>`;
  }
  const labels = series
    .map((s, i) => `<text x="${x(i)}" y="${H - 10}" text-anchor="middle" font-size="10" fill="#7b8796">${s.label}</text>`)
    .join("");

  return `<div class="legend"><span><i class="dot" style="background:#1e5a88"></i>Ingresos</span><span><i class="dot" style="background:#b6672f"></i>Gastos operativos</span><span><i class="dot" style="background:#14804a"></i>GOP</span></div><div class="chart"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${ticks}${labels}<path d="${path(
    "income"
  )}" fill="none" stroke="#1e5a88" stroke-width="3"/><path d="${path(
    "expense"
  )}" fill="none" stroke="#b6672f" stroke-width="3"/><path d="${path(
    "gop"
  )}" fill="none" stroke="#14804a" stroke-width="3"/>${series
    .map((s, i) => `<circle cx="${x(i)}" cy="${y(s.gop)}" r="3.4" fill="#14804a"/>`)
    .join("")}</svg></div>`;
}

function insightSet(cm: Metrics, pm: Metrics, comparable: boolean) {
  if (!comparable) {
    return [
      {
        c: cm.gop >= 0 ? "good" : "bad",
        t: "Resultado operativo",
        d: `El GOP del período seleccionado es ${money(cm.gop)} (${pct(cm.margen)} sobre ingresos).`,
      },
      {
        c: "good",
        t: "Ingresos del período",
        d: `Los ingresos del período seleccionado suman ${money(cm.ingresos)} en ${cm.ops} operaciones.`,
      },
      {
        c: "warn",
        t: "Gastos operativos del período",
        d: `Los gastos operativos del período seleccionado suman ${money(cm.gastosOp)}.`,
      },
    ];
  }
  const gopCh = change(cm.gop, pm.gop);
  const incCh = change(cm.ingresos, pm.ingresos);
  const expCh = change(cm.gastosOp, pm.gastosOp);
  return [
    {
      c: cm.gop >= 0 ? "good" : "bad",
      t: "Resultado operativo",
      d: `El GOP es ${money(cm.gop)} (${pct(cm.margen)} sobre ingresos), ${
        gopCh.v >= 0 ? "mejorando" : "retrocediendo"
      } ${Math.abs(gopCh.v).toFixed(1)}% vs. mes anterior.`,
    },
    {
      c: incCh.v >= 0 ? "good" : "bad",
      t: "Evolución de ingresos",
      d: `Los ingresos son ${money(cm.ingresos)} y ${incCh.v >= 0 ? "crecen" : "caen"} ${Math.abs(
        incCh.v
      ).toFixed(1)}% vs. el mes previo.`,
    },
    {
      c: expCh.v <= 0 ? "good" : "warn",
      t: "Presión de gastos",
      d: `Los gastos operativos suman ${money(cm.gastosOp)} y ${expCh.v > 0 ? "suben" : "bajan"} ${Math.abs(
        expCh.v
      ).toFixed(1)}% vs. el mes previo.`,
    },
  ];
}

function strategicQuestions(
  cv: DashRow[],
  cg: DashRow[],
  cm: Metrics,
  pm: Metrics,
  comparable: boolean
) {
  const topIncome = groupSum(cv, (r) => norm(r["DETALLE - CONCEPTO"]))[0];
  const topExpense = groupSum(cg.filter(isOpExpense), (r) => norm(r.CATEGORIA) || norm(r["DETALLE - CONCEPTO"]))[0];

  const q1 = comparable
    ? `En el período se registraron ingresos por ${money(cm.ingresos)}, gastos operativos por ${money(
        cm.gastosOp
      )} y un GOP de ${money(cm.gop)}. Frente al mes anterior, el GOP ${
        change(cm.gop, pm.gop).v >= 0 ? "mejoró" : "empeoró"
      } ${Math.abs(change(cm.gop, pm.gop).v).toFixed(1)}%.`
    : `En el período seleccionado se registraron ingresos por ${money(cm.ingresos)}, gastos operativos por ${money(
        cm.gastosOp
      )} y un GOP de ${money(cm.gop)}.`;

  const drivers: string[] = [];
  if (topIncome) drivers.push(`principal concepto de ingreso: ${topIncome[0]} (${money(topIncome[1])})`);
  if (topExpense) drivers.push(`principal foco de gasto: ${topExpense[0]} (${money(topExpense[1])})`);
  const q2 = drivers.length
    ? `La explicación visible en los registros es ${drivers.join(" y ")}.`
    : "Todavía no hay volumen suficiente para identificar drivers claros.";

  const risk: string[] = [];
  if (cm.margen < 0) risk.push("el margen operativo es negativo");
  else if (cm.margen < 15) risk.push("el margen operativo es bajo");
  if (cm.noReceipt > 0) risk.push(`hay ${cm.noReceipt} gastos sin comprobante`);
  if (comparable) {
    const incCh = change(cm.ingresos, pm.ingresos);
    const expCh = change(cm.gastosOp, pm.gastosOp);
    if (expCh.v > incCh.v && cm.gastosOp > 0) risk.push("los gastos están creciendo más rápido que los ingresos");
  }
  const q3 = risk.length
    ? `El principal riesgo/oportunidad es que ${risk.join("; ")}.`
    : "No aparece un desvío crítico en los datos actuales; el foco debe ponerse en sostener margen y calidad de carga.";

  const rec: string[] = [];
  if (cm.noReceipt > 0) rec.push("reducir gastos sin comprobante");
  if (comparable && change(cm.gastosOp, pm.gastosOp).v > 0)
    rec.push("revisar las categorías que más explican el aumento de gastos");
  if (comparable && change(cm.ingresos, pm.ingresos).v < 0)
    rec.push("definir una acción comercial para recuperar ingresos");
  if (cm.margen < 20) rec.push("trabajar precio, mix y costos para elevar el margen");
  if (!rec.length) rec.push("mantener el control semanal y fijar una meta concreta de crecimiento de GOP para el próximo mes");
  const q4 = `Para el próximo período: ${rec.slice(0, 3).join("; ")}.`;

  return [
    { n: "Pregunta 1", h: "¿Qué pasó?", p: q1, improve: false },
    { n: "Pregunta 2", h: "¿Por qué pasó?", p: q2, improve: false },
    { n: "Pregunta 3", h: "¿Dónde está el principal desvío u oportunidad?", p: q3, improve: false },
    { n: "Pregunta 4", h: "¿Qué debemos mejorar?", p: q4, improve: true },
  ];
}

export interface PageData {
  title: string;
  subtitle: string;
  period: string;
  cardsHtml: string;
  insightsHtml: string;
  periodTableHtml: string;
  evolutionTableHtml: string;
  evolutionChartHtml: string;
  canExpandEvolution: boolean;
  restHtml: string;
}

function periodLabelFromFilters(f: Filters): string {
  const yPart = f.years.length ? f.years.join(", ") : "Todos los años";
  const mPart = f.months.length ? f.months.map((m) => MONTHS[m - 1]).join(", ") : "Todos los meses";
  const dPart = f.days.length ? `Días ${f.days.join(", ")}` : "Todos los días";
  return `${dPart} · ${mPart} · ${yPart}`;
}

export function computePage(
  ventas: DashRow[],
  gastos: DashRow[],
  f: Filters,
  expandedChart = false
): PageData {
  const { cv, cg, pv, pg, comparable } = currentAndPrevious(ventas, gastos, f);
  const cm = metrics(cv, cg);
  const pm = metrics(pv, pg);
  const cfg = PAGE_CONFIG[f.page];
  const period = periodLabelFromFilters(f);

  const cardsHtml = `<div class="grid">${[
    card("Ingresos", money(cm.ingresos), cm.ingresos, pm.ingresos, true, `${cv.length} operaciones`, comparable),
    card(
      "Gastos operativos",
      money(cm.gastosOp),
      cm.gastosOp,
      pm.gastosOp,
      false,
      `${cg.filter(isOpExpense).length} registros`,
      comparable
    ),
    card("GOP", money(cm.gop), cm.gop, pm.gop, true, "Ingresos − gastos operativos", comparable),
    card("Margen GOP", pct(cm.margen), cm.margen, pm.margen, true, "GOP / ingresos", comparable),
    card("Ticket promedio", money(cm.ticket), cm.ticket, pm.ticket, true, "Promedio por registro de venta", comparable),
    card(
      "Gastos documentados",
      pct(cm.documented),
      cm.documented,
      pm.documented,
      true,
      `${cm.noReceipt} sin comprobante`,
      comparable
    ),
  ].join("")}</div>`;

  const insightsHtml = `<div class="section"><h3>Principales insights</h3><div class="insights">${insightSet(
    cm,
    pm,
    comparable
  )
    .map((x) => `<div class="insight ${x.c}"><b>${x.t}</b><span>${x.d}</span></div>`)
    .join("")}</div></div>`;

  const periodTableHtml = periodBreakdownHtml(cv, cg, f);

  const { series, canExpand } = evolutionSeries(ventas, gastos, f.unit, expandedChart);
  const evoTableHtml = evolutionTableHtml(series);
  const evoChartHtml = lineChart(series);

  const salesDrivers = groupSum(cv, (r) => norm(r["DETALLE - CONCEPTO"]));
  const ventasInsightTiles = [
    statTile("Ingresos totales", money(cm.ingresos), `${cv.length} operaciones`),
    statTile("Ticket promedio", money(cm.ticket), "Promedio por registro de venta"),
    statTile("Operaciones", String(cv.length), "Registros de venta en el período"),
  ].join("");

  const gastosPorUnidad = groupSum(cg.filter(isOpExpense), (r) => canonUnit(r["UNIDAD DE NEGOCIO"]));
  const gastosPorTipoPago = groupSum(cg, (r) => norm(r.TIPO));
  const expDrivers = groupSum(cg.filter(isOpExpense), (r) => norm(r.CATEGORIA) || norm(r["DETALLE - CONCEPTO"]));
  const formasPagoGastos = groupSum(cg.filter(isOpExpense), (r) => norm(r["FORMA DE COBRO O PAGO"]));
  const compartidosNoOp = groupSum(
    cg.filter((r) => ["COMPARTIDO", "NO OPERATIVO"].includes(norm(r["UNIDAD DE NEGOCIO"]))),
    (r) => norm(r["UNIDAD DE NEGOCIO"])
  );

  const qs = strategicQuestions(cv, cg, cm, pm, comparable)
    .map(
      (q) =>
        `<div class="question ${q.improve ? "improve" : ""}"><div class="n">${q.n}</div><h4>${q.h}</h4><p>${q.p}</p></div>`
    )
    .join("");

  const restHtml = `<div class="cols section"><div class="box"><h3>Drivers de ingresos</h3>${barHtml(
    salesDrivers
  )}</div><div class="box"><h3>Insights de ventas</h3><div class="grid">${ventasInsightTiles}</div></div></div><div class="cols section"><div class="box"><h3>Gastos por unidad de negocio</h3>${barHtml(
    gastosPorUnidad,
    true
  )}</div><div class="box"><h3>Gastos por tipo de pago</h3>${barHtml(
    gastosPorTipoPago,
    true
  )}</div></div><div class="section"><div class="box"><h3>Gastos operativos por categoría</h3>${paretoChartHtml(
    expDrivers
    )}</div></div><div class="cols section"><div class="box"><h3>Formas de pago (gastos)</h3>${barHtml(
    formasPagoGastos,
    true
  )}</div><div class="box"><h3>Gastos compartidos y no operativos</h3>${barHtml(
    compartidosNoOp,
    true
  )}</div></div><div class="section"><h3>4 preguntas estratégicas</h3><div class="questions">${qs}</div></div>`;

  return {
    title: cfg.title,
    subtitle: cfg.subtitle,
    period,
    cardsHtml,
    insightsHtml,
    periodTableHtml,
    evolutionTableHtml: evoTableHtml,
    evolutionChartHtml: evoChartHtml,
    canExpandEvolution: canExpand,
    restHtml,
  };
}

// --- Tablas crudas (gastos/ventas) para el panel de admin ---------------

export type TableKind = "gastos" | "ventas";

export interface GastoTableFilters {
  categoria?: string;
  unidad?: string;
  formaPago?: string;
  tipoPago?: string;
}

function rowsTableHtml(rows: DashRow[], kind: TableKind): string {
  if (!rows.length) {
    return '<div class="muted">Sin datos para el período.</div>';
  }

  const sorted = [...rows].sort((a, b) =>
    (b["FECHA DE OPERACION"] || "").localeCompare(a["FECHA DE OPERACION"] || "")
  );

  const headers =
    kind === "gastos"
      ? ["Fecha", "Nombre", "Unidad", "Categoría", "Detalle", "Forma de pago", "Comprobante", "Monto"]
      : ["Fecha", "Nombre", "Unidad", "Detalle", "Forma de cobro", "Comprobante", "Monto"];

  const theadHtml = `<tr>${headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr>`;

  const bodyRows = sorted
    .map((r) => {
      const cells =
        kind === "gastos"
          ? [
              esc(r["FECHA DE OPERACION"] || ""),
              esc(r.NOMBRE || ""),
              esc(r["UNIDAD DE NEGOCIO"] || ""),
              esc(r.CATEGORIA || ""),
              esc(r["DETALLE - CONCEPTO"] || ""),
              esc(r["FORMA DE COBRO O PAGO"] || ""),
              esc(r["TIPO DE COMPROBANTE"] || ""),
              `<span class="right">${money(getMonto(r))}</span>`,
            ]
          : [
              esc(r["FECHA DE OPERACION"] || ""),
              esc(r.NOMBRE || ""),
              esc(r["UNIDAD DE NEGOCIO"] || ""),
              esc(r["DETALLE - CONCEPTO"] || ""),
              esc(r["FORMA DE COBRO O PAGO"] || ""),
              esc(r["TIPO DE COMPROBANTE"] || ""),
              `<span class="right">${money(getMonto(r))}</span>`,
            ];
      return `<tr>${cells.map((c) => `<td>${c}</td>`).join("")}</tr>`;
    })
    .join("");

  const colsBeforeTotal = headers.length - 1;
  const totalRow = `<tr><td colspan="${colsBeforeTotal}"><b>Total</b></td><td class="right"><b>${money(
    sum(rows)
  )}</b></td></tr>`;

  return `<div class="table-wrap"><table class="tbl"><thead>${theadHtml}</thead><tbody>${bodyRows}${totalRow}</tbody></table></div>`;
}

// Vista de tabla cruda para el panel de admin: mismos filtros (año, mes,
// día, unidad de negocio) que el tablero, pero sin cálculos ni gráficos —
// el detalle de cada registro del período. La tabla de gastos admite,
// además, filtros propios por categoría/unidad/forma de pago/tipo de pago.
export function computeTable(
  ventas: DashRow[],
  gastos: DashRow[],
  f: Filters,
  kind: TableKind,
  gastoFilters?: GastoTableFilters
): PageData {
  const cv = filterPeriod(ventas, f);
  const cg = filterPeriod(gastos, f);
  let rows = kind === "gastos" ? cg : cv;

  if (kind === "gastos" && gastoFilters) {
    if (gastoFilters.categoria) rows = rows.filter((r) => r.CATEGORIA === gastoFilters.categoria);
    if (gastoFilters.unidad) rows = rows.filter((r) => r["UNIDAD DE NEGOCIO"] === gastoFilters.unidad);
    if (gastoFilters.formaPago) rows = rows.filter((r) => r["FORMA DE COBRO O PAGO"] === gastoFilters.formaPago);
    if (gastoFilters.tipoPago) rows = rows.filter((r) => r.TIPO === gastoFilters.tipoPago);
  }

  const period = periodLabelFromFilters(f);
  const title = kind === "gastos" ? "Tabla de gastos" : "Tabla de ventas";
  const subtitle =
    kind === "gastos"
      ? "Detalle de gastos registrados en el período, con los mismos filtros del tablero."
      : "Detalle de ventas registradas en el período, con los mismos filtros del tablero.";
  const countLabel = kind === "gastos" ? "registros" : "operaciones";

  const bodyHtml = `<div class="section"><div class="box"><h3>${esc(
    title
  )} — ${rows.length} ${countLabel} · Total ${money(sum(rows))}</h3>${rowsTableHtml(rows, kind)}</div></div>`;

  return {
    title,
    subtitle,
    period,
    cardsHtml: "",
    insightsHtml: "",
    periodTableHtml: "",
    evolutionTableHtml: "",
    evolutionChartHtml: "",
    canExpandEvolution: false,
    restHtml: bodyHtml,
  };
}
