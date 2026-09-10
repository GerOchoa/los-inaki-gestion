// Motor de cálculo del tablero, portado del index.html de referencia
// (Tablero Gerencial — Los Iñaki) a TypeScript. La lógica de negocio
// (GOP, comparativas, drivers, insights, preguntas estratégicas) es la
// misma; sólo cambia de dónde vienen los datos (Supabase en vez de Excel).

import type { DashRow } from "./transform";

export const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export type PageKey = "global" | "alojamiento" | "confiteria" | "otros";

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
  confiteria: {
    title: "Confitería",
    subtitle:
      "Resultado operativo de gastronomía/confitería: ingresos, costos, GOP y drivers principales.",
    scope: ["CONFITERIA"],
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
  if (n.includes("CONFIT")) return "CONFITERIA";
  if (n.includes("EVENT")) return "EVENTOS";
  return "OTROS";
}

function getMonto(r: DashRow): number {
  return Number(r.MONTO) || 0;
}

function dateObj(r: DashRow): Date | null {
  const f = r["FECHA DE OPERACION"];
  if (!f || !/^\d{4}-\d{2}-\d{2}/.test(f)) return null;
  return new Date(f.slice(0, 10) + "T12:00:00");
}

export function money(n: number): string {
  return (Number(n) || 0).toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
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

export interface Filters {
  page: PageKey;
  y: number;
  m: number;
  day: string; // "ALL" o número de día como string
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

function periodData(arr: DashRow[], y: number, m: number, day: string, f: Filters): DashRow[] {
  return arr.filter((r) => {
    const d = dateObj(r);
    if (!d) return false;
    if (d.getFullYear() !== y || d.getMonth() + 1 !== m) return false;
    if (day !== "ALL" && d.getDate() !== Number(day)) return false;
    return scopeAllows(r, f);
  });
}

function currentPrevious(ventas: DashRow[], gastos: DashRow[], f: Filters) {
  const prev = ymDate(f.y, f.m, -1);
  return {
    cv: periodData(ventas, f.y, f.m, f.day, f),
    cg: periodData(gastos, f.y, f.m, f.day, f),
    pv: periodData(ventas, prev.y, prev.m, f.day, f),
    pg: periodData(gastos, prev.y, prev.m, f.day, f),
  };
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
  detail: string
): string {
  return `<div class="kpi"><div class="t">${title}</div><div class="v">${value}</div>${compHtml(
    cur,
    prev,
    higherBetter
  )}<div class="d">vs. mes anterior · ${detail || ""}</div></div>`;
}

function esc(s: string): string {
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

function monthSeries(ventas: DashRow[], gastos: DashRow[], f: Filters) {
  const out: { label: string; income: number; expense: number; gop: number }[] = [];
  for (let i = -5; i <= 0; i++) {
    const t = ymDate(f.y, f.m, i);
    const v = periodData(ventas, t.y, t.m, "ALL", f);
    const g = periodData(gastos, t.y, t.m, "ALL", f);
    const mm = metrics(v, g);
    out.push({
      label: `${MONTHS[t.m - 1].slice(0, 3)} ${String(t.y).slice(-2)}`,
      income: mm.ingresos,
      expense: mm.gastosOp,
      gop: mm.gop,
    });
  }
  return out;
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

function insightSet(cm: Metrics, pm: Metrics) {
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

function strategicQuestions(page: PageKey, cv: DashRow[], cg: DashRow[], cm: Metrics, pm: Metrics) {
  const incCh = change(cm.ingresos, pm.ingresos);
  const expCh = change(cm.gastosOp, pm.gastosOp);
  const gopCh = change(cm.gop, pm.gop);
  const topIncome = groupSum(cv, (r) => norm(r["DETALLE - CONCEPTO"]))[0];
  const topExpense = groupSum(cg.filter(isOpExpense), (r) => norm(r.CATEGORIA) || norm(r["DETALLE - CONCEPTO"]))[0];

  const q1 = `En el período se registraron ingresos por ${money(cm.ingresos)}, gastos operativos por ${money(
    cm.gastosOp
  )} y un GOP de ${money(cm.gop)}. Frente al mes anterior, el GOP ${
    gopCh.v >= 0 ? "mejoró" : "empeoró"
  } ${Math.abs(gopCh.v).toFixed(1)}%.`;

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
  if (expCh.v > incCh.v && cm.gastosOp > 0) risk.push("los gastos están creciendo más rápido que los ingresos");
  const q3 = risk.length
    ? `El principal riesgo/oportunidad es que ${risk.join("; ")}.`
    : "No aparece un desvío crítico en los datos actuales; el foco debe ponerse en sostener margen y calidad de carga.";

  const rec: string[] = [];
  if (cm.noReceipt > 0) rec.push("reducir gastos sin comprobante");
  if (expCh.v > 0) rec.push("revisar las categorías que más explican el aumento de gastos");
  if (incCh.v < 0) rec.push("definir una acción comercial para recuperar ingresos");
  if (cm.margen < 20) rec.push("trabajar precio, mix y costos para elevar el margen");
  if (page === "alojamiento")
    rec.push("incorporar reservas, noches, check-in/check-out y unidad/cabaña para medir ocupación, ADR y RevPAR");
  if (page === "confiteria")
    rec.push("incorporar cantidad de tickets/productos o cierre diario para analizar ticket y margen con mayor precisión");
  if (!rec.length) rec.push("mantener el control semanal y fijar una meta concreta de crecimiento de GOP para el próximo mes");
  const q4 = `Para el próximo mes: ${rec.slice(0, 3).join("; ")}.`;

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
  bodyHtml: string;
}

export function computePage(ventas: DashRow[], gastos: DashRow[], f: Filters): PageData {
  const { cv, cg, pv, pg } = currentPrevious(ventas, gastos, f);
  const cm = metrics(cv, cg);
  const pm = metrics(pv, pg);
  const cfg = PAGE_CONFIG[f.page];
  const period = `${f.day === "ALL" ? "Mes completo" : "Día " + f.day} · ${MONTHS[f.m - 1]} ${f.y}`;

  const cards = [
    card("Ingresos", money(cm.ingresos), cm.ingresos, pm.ingresos, true, `${cv.length} operaciones`),
    card(
      "Gastos operativos",
      money(cm.gastosOp),
      cm.gastosOp,
      pm.gastosOp,
      false,
      `${cg.filter(isOpExpense).length} registros`
    ),
    card("GOP", money(cm.gop), cm.gop, pm.gop, true, "Ingresos − gastos operativos"),
    card("Margen GOP", pct(cm.margen), cm.margen, pm.margen, true, "GOP / ingresos"),
    card("Ticket promedio", money(cm.ticket), cm.ticket, pm.ticket, true, "Promedio por registro de venta"),
    card(
      "Gastos documentados",
      pct(cm.documented),
      cm.documented,
      pm.documented,
      true,
      `${cm.noReceipt} sin comprobante`
    ),
  ].join("");

  const insights = insightSet(cm, pm)
    .map((x) => `<div class="insight ${x.c}"><b>${x.t}</b><span>${x.d}</span></div>`)
    .join("");

  const qs = strategicQuestions(f.page, cv, cg, cm, pm)
    .map(
      (q) =>
        `<div class="question ${q.improve ? "improve" : ""}"><div class="n">${q.n}</div><h4>${q.h}</h4><p>${q.p}</p></div>`
    )
    .join("");

  const salesDrivers = groupSum(cv, (r) => norm(r["DETALLE - CONCEPTO"]));
  const expDrivers = groupSum(cg.filter(isOpExpense), (r) => norm(r.CATEGORIA) || norm(r["DETALLE - CONCEPTO"]));

  let special = "";
  if (f.page === "global") {
    special = `<div class="cols section"><div class="box"><h3>Ingresos por unidad de negocio</h3>${barHtml(
      groupSum(cv, (r) => canonUnit(r["UNIDAD DE NEGOCIO"]))
    )}</div><div class="box"><h3>Gastos operativos por unidad</h3>${barHtml(
      groupSum(cg.filter(isOpExpense), (r) => canonUnit(r["UNIDAD DE NEGOCIO"])),
      true
    )}</div></div>`;
  }
  if (f.page === "alojamiento") {
    special = `<div class="note section"><b>Próxima evolución de esta hoja:</b> con el formulario actual no se puede calcular ocupación, ADR, RevPAR, noches vendidas ni estadía promedio. Para eso hay que agregar datos de reservas/check-in/check-out y cabaña/unidad.</div>`;
  }
  if (f.page === "confiteria") {
    special = `<div class="note section"><b>Próxima evolución de esta hoja:</b> para medir margen gastronómico real por producto conviene sumar cantidad de tickets, familias de producto y/o un cierre diario de ventas. Hoy el tablero trabaja con ingresos y gastos registrados.</div>`;
  }
  if (f.page === "otros") {
    special = `<div class="cols section"><div class="box"><h3>Inversiones registradas</h3><div style="font-size:28px;font-weight:800">${money(
      cm.inversiones
    )}</div><p class="small">Se muestran separadas del GOP.</p></div><div class="box"><h3>Retiros familiares</h3><div style="font-size:28px;font-weight:800">${money(
      cm.retiros
    )}</div><p class="small">Tampoco impactan en el GOP operativo.</p></div><div class="box"><h3>Control documental</h3><div style="font-size:28px;font-weight:800">${
      cm.noReceipt
    }</div><p class="small">Gastos sin comprobante en el período seleccionado.</p></div></div>`;
  }

  const bodyHtml = `<div class="grid">${cards}</div><div class="section"><h3>Principales insights</h3><div class="insights">${insights}</div></div><div class="cols section"><div class="box"><h3>Evolución últimos 6 meses</h3>${lineChart(
    monthSeries(ventas, gastos, f)
  )}</div><div class="box"><h3>Drivers de ingresos</h3>${barHtml(salesDrivers)}</div></div><div class="cols section"><div class="box"><h3>Drivers de gastos operativos</h3>${barHtml(
    expDrivers,
    true
  )}</div><div class="box"><h3>Formas de cobro</h3>${barHtml(
    groupSum(cv, (r) => norm(r["FORMA DE COBRO O PAGO"]))
  )}</div></div>${special}<div class="section"><h3>4 preguntas estratégicas</h3><div class="questions">${qs}</div></div>`;

  return { title: cfg.title, subtitle: cfg.subtitle, period, bodyHtml };
}
