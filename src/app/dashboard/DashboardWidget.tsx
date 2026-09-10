"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { DashRow } from "@/lib/dashboard/transform";
import Link from "next/link";
import {
  MONTHS,
  PAGE_CONFIG,
  allYears,
  latestYM,
  computePage,
  type PageKey,
  type Filters,
} from "@/lib/dashboard/compute";

const TABS: { key: PageKey; label: string }[] = [
  { key: "global", label: "1. Global / GOP" },
  { key: "alojamiento", label: "2. Alojamiento" },
  { key: "confiteria", label: "3. Confitería" },
  { key: "otros", label: "4. Otros / Gestión" },
];

export default function DashboardWidget({
  ventas,
  gastos,
  lastUpdated,
}: {
  ventas: DashRow[];
  gastos: DashRow[];
  lastUpdated: string;
}) {
  const router = useRouter();
  const years = useMemo(() => allYears(ventas, gastos), [ventas, gastos]);
  const initial = useMemo(() => latestYM(ventas, gastos), [ventas, gastos]);

  const [page, setPage] = useState<PageKey>("global");
  const [year, setYear] = useState(years.includes(initial.y) ? initial.y : initial.y);
  const [month, setMonth] = useState(initial.m);
  const [day, setDay] = useState("ALL");
  const [globalUnit, setGlobalUnit] = useState("ALL");
  const [refreshing, setRefreshing] = useState(false);

  const unit = page === "global" ? globalUnit : "ALL";

  const data = useMemo(() => {
    const filters: Filters = { page, y: year, m: month, day, unit };
    return computePage(ventas, gastos, filters);
  }, [ventas, gastos, page, year, month, day, unit]);

  const yearOptions = years.length ? years : [initial.y];
  const cfg = PAGE_CONFIG[page];

  return (
    <div className="wrap">
      <div className="hero">
        <div className="topline">
          <div>
            <h1>Tablero Gerencial — Los Iñaki</h1>
            <p className="sub">GOP, ingresos, gastos e insights mensuales para la reunión de gestión.</p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <div className="status">Datos de Supabase · actualizado {lastUpdated}</div>
            <Link className="btn light" href="/formularios/gasto">
              ← Cargar datos
            </Link>
          </div>
        </div>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`tab ${page === t.key ? "active" : ""}`}
            onClick={() => setPage(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="box filters">
        <div>
          <label>Año</label>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Mes</label>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {MONTHS.map((n, i) => (
              <option key={n} value={i + 1}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Día</label>
          <select value={day} onChange={(e) => setDay(e.target.value)}>
            <option value="ALL">Todos</option>
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Unidad de negocio</label>
          {page === "global" ? (
            <select value={globalUnit} onChange={(e) => setGlobalUnit(e.target.value)}>
              <option value="ALL">Todas</option>
              <option value="ALOJAMIENTO">ALOJAMIENTO</option>
              <option value="CONFITERIA">CONFITERIA</option>
              <option value="EVENTOS">EVENTOS</option>
              <option value="OTROS">OTROS</option>
            </select>
          ) : (
            <select disabled value="FIXED">
              <option value="FIXED">{(cfg.scope || []).join(" + ")}</option>
            </select>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="btn secondary"
            onClick={() => {
              setRefreshing(true);
              router.refresh();
              setTimeout(() => setRefreshing(false), 800);
            }}
          >
            {refreshing ? "Actualizando…" : "Actualizar"}
          </button>
          <button className="btn light" onClick={() => window.print()}>
            Exportar PDF
          </button>
        </div>
      </div>

      <main>
        <section className="page active">
          <div className="page-head">
            <div>
              <h2>{data.title}</h2>
              <p>{data.subtitle}</p>
            </div>
            <div className="period">{data.period}</div>
          </div>
          <div dangerouslySetInnerHTML={{ __html: data.bodyHtml }} />
        </section>
      </main>

      <div className="footer">
        GOP = Ingresos − Gastos Operativos. Las inversiones y los retiros familiares se analizan por
        separado y no reducen el GOP.
      </div>
    </div>
  );
}
