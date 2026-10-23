"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { DashRow } from "@/lib/dashboard/transform";
import {
  MONTHS,
  allYears,
  latestYM,
  computePage,
  computeTable,
  type Filters,
  type GastoTableFilters,
} from "@/lib/dashboard/compute";
import {
  CATEGORIA_GASTO_OPTIONS,
  UNIDAD_NEGOCIO_GASTO_OPTIONS,
  FORMA_PAGO_OPTIONS,
  TIPO_PAGO_OPTIONS,
} from "@/lib/validation";

type ViewMode = "dashboard" | "gastos" | "ventas";

// Combo desplegable con selección múltiple (checkboxes) y opción "Todos".
// selected = [] significa "todos" (sin restricción).
function MultiSelectCombo({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (vals: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const allSelected = selected.length === 0;
  const summary = allSelected
    ? "Todos"
    : selected.length === 1
      ? options.find((o) => o.value === selected[0])?.label ?? selected[0]
      : `${selected.length} seleccionados`;

  function stripId(rows: DashRow[]) {
  return rows.map((r) => {
    const copy: Record<string, unknown> = { ...r };
    delete copy.id;
    return copy;
  });
}

async function exportExcel(ventas: DashRow[], gastos: DashRow[]) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(stripId(gastos)), "Gastos");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(stripId(ventas)), "Ventas");
  XLSX.writeFile(wb, `los-inaki-datos-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

  function toggleValue(v: string) {
    if (allSelected) {
      onChange([v]);
      return;
    }
    if (selected.includes(v)) {
      onChange(selected.filter((x) => x !== v));
    } else {
      const next = [...selected, v];
      onChange(next.length === options.length ? [] : next);
    }
  }

  return (
    <div className="combo" ref={ref}>
      <label>{label}</label>
      <button type="button" className="combo-btn" onClick={() => setOpen((v) => !v)}>
        <span>{summary}</span>
        <span className="combo-caret">▾</span>
      </button>
      {open && (
        <div className="combo-panel">
          <label className="combo-opt">
            <input type="checkbox" checked={allSelected} onChange={() => onChange([])} />
            Todos
          </label>
          {options.map((o) => (
            <label className="combo-opt" key={o.value}>
              <input
                type="checkbox"
                checked={allSelected || selected.includes(o.value)}
                onChange={() => toggleValue(o.value)}
              />
              {o.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

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

  const [selectedYears, setSelectedYears] = useState<number[]>([initial.y]);
  const [selectedMonths, setSelectedMonths] = useState<number[]>([initial.m]);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [unit, setUnit] = useState("ALL");
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("dashboard");
  const [expandedChart, setExpandedChart] = useState(false);

  const [gastoCategoria, setGastoCategoria] = useState("");
  const [gastoUnidad, setGastoUnidad] = useState("");
  const [gastoFormaPago, setGastoFormaPago] = useState("");
  const [gastoTipoPago, setGastoTipoPago] = useState("");

  const filters: Filters = useMemo(
    () => ({ page: "global", years: selectedYears, months: selectedMonths, days: selectedDays, unit }),
    [selectedYears, selectedMonths, selectedDays, unit]
  );

  const data = useMemo(() => {
    if (viewMode === "gastos") {
      const gastoFilters: GastoTableFilters = {
        categoria: gastoCategoria || undefined,
        unidad: gastoUnidad || undefined,
        formaPago: gastoFormaPago || undefined,
        tipoPago: gastoTipoPago || undefined,
      };
      return computeTable(ventas, gastos, filters, "gastos", gastoFilters);
    }
    if (viewMode === "ventas") return computeTable(ventas, gastos, filters, "ventas");
    return computePage(ventas, gastos, filters, expandedChart);
  }, [ventas, gastos, filters, viewMode, expandedChart, gastoCategoria, gastoUnidad, gastoFormaPago, gastoTipoPago]);

  const yearOptions = years.length ? years : [initial.y];

  return (
    <div className="wrap">
      <div className="hero">
        <div className="topline">
          <div>
            <h1>Tablero Gerencial — Los Iñaki</h1>
            <p className="sub">GOP, ingresos, gastos e insights mensuales para la reunión de gestión.</p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <div className="status">Actualizado {lastUpdated}</div>
            <Link className="btn light" href="/formularios/gasto">
              ← Cargar datos
            </Link>
            <button
              className={`btn ${viewMode === "gastos" ? "" : "light"}`}
              onClick={() => setViewMode(viewMode === "gastos" ? "dashboard" : "gastos")}
            >
              Tabla de gastos
            </button>
            <button
              className={`btn ${viewMode === "ventas" ? "" : "light"}`}
              onClick={() => setViewMode(viewMode === "ventas" ? "dashboard" : "ventas")}
            >
              Tabla de ventas
            </button>
          </div>
        </div>
      </div>

      <div className="box filters">
        <MultiSelectCombo
          label="Año"
          options={yearOptions.map((y) => ({ value: String(y), label: String(y) }))}
          selected={selectedYears.map(String)}
          onChange={(vals) => setSelectedYears(vals.map(Number))}
        />
        <MultiSelectCombo
          label="Mes"
          options={MONTHS.map((n, i) => ({ value: String(i + 1), label: n }))}
          selected={selectedMonths.map(String)}
          onChange={(vals) => setSelectedMonths(vals.map(Number))}
        />
        <MultiSelectCombo
          label="Día"
          options={Array.from({ length: 31 }, (_, i) => i + 1).map((d) => ({
            value: String(d),
            label: String(d),
          }))}
          selected={selectedDays.map(String)}
          onChange={(vals) => setSelectedDays(vals.map(Number))}
        />
        <div>
          <label>Unidad de negocio</label>
          <select value={unit} onChange={(e) => setUnit(e.target.value)}>
            <option value="ALL">Todas</option>
            <option value="ALOJAMIENTO">ALOJAMIENTO</option>
            <option value="CAFETERIA">CAFETERIA</option>
            <option value="EVENTOS">EVENTOS</option>
            <option value="OTROS">OTROS</option>
          </select>
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
          <button className="btn light" onClick={() => exportExcel(ventas, gastos)}>
            Exportar Excel
          </button>
        </div>
      </div>

      {viewMode === "gastos" && (
        <div className="box filters" style={{ position: "static" }}>
          <div>
            <label>Categoría</label>
            <select value={gastoCategoria} onChange={(e) => setGastoCategoria(e.target.value)}>
              <option value="">Todas</option>
              {CATEGORIA_GASTO_OPTIONS.map(([, l]) => (
                <option key={l} value={l.toUpperCase()}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Unidad de negocio</label>
            <select value={gastoUnidad} onChange={(e) => setGastoUnidad(e.target.value)}>
              <option value="">Todas</option>
              {UNIDAD_NEGOCIO_GASTO_OPTIONS.map(([, l]) => (
                <option key={l} value={l.toUpperCase()}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Forma de pago</label>
            <select value={gastoFormaPago} onChange={(e) => setGastoFormaPago(e.target.value)}>
              <option value="">Todas</option>
              {FORMA_PAGO_OPTIONS.map(([, l]) => (
                <option key={l} value={l.toUpperCase()}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Tipo de pago</label>
            <select value={gastoTipoPago} onChange={(e) => setGastoTipoPago(e.target.value)}>
              <option value="">Todos</option>
              {TIPO_PAGO_OPTIONS.map(([, l]) => (
                <option key={l} value={l.toUpperCase()}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <main>
        <section className="page active">
          <div className="page-head">
            <div>
              <h2>{data.title}</h2>
              <p>{data.subtitle}</p>
            </div>
            <div className="period">{data.period}</div>
          </div>

          {viewMode === "dashboard" ? (
            <>
              <div dangerouslySetInnerHTML={{ __html: data.cardsHtml }} />
              <div dangerouslySetInnerHTML={{ __html: data.insightsHtml }} />

              <div className="section box">
                <h3>Detalle por período</h3>
                <div dangerouslySetInnerHTML={{ __html: data.periodTableHtml }} />
              </div>

              <div className="section box">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  <h3 style={{ margin: 0 }}>
                    Evolución {expandedChart ? "— historial completo" : "— desde agosto 2026"}
                  </h3>
                  {data.canExpandEvolution && (
                    <button className="btn light" onClick={() => setExpandedChart((v) => !v)}>
                      {expandedChart ? "Ver desde ago. 2026" : "Ampliar período"}
                    </button>
                  )}
                </div>
                <div dangerouslySetInnerHTML={{ __html: data.evolutionTableHtml }} />
                <div dangerouslySetInnerHTML={{ __html: data.evolutionChartHtml }} />
              </div>

              <div dangerouslySetInnerHTML={{ __html: data.restHtml }} />
            </>
          ) : (
            <div dangerouslySetInnerHTML={{ __html: data.restHtml }} />
          )}
        </section>
      </main>

      <div className="footer">
        GOP = Ingresos − Gastos Operativos. Las inversiones y los retiros familiares se analizan por
        separado y no reducen el GOP.
      </div>
    </div>
  );
}
