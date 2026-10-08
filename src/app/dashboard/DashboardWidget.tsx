"use client";

import { useMemo, useState } from "react";
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

function readMultiSelect(e: React.ChangeEvent<HTMLSelectElement>): string[] {
  return Array.from(e.target.selectedOptions).map((o) => o.value);
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
            <div className="status">Datos de Supabase · actualizado {lastUpdated}</div>
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
        <div>
          <label>Año</label>
          <select
            multiple
            size={4}
            value={selectedYears.length ? selectedYears.map(String) : ["ALL"]}
            onChange={(e) => {
              const vals = readMultiSelect(e);
              setSelectedYears(vals.includes("ALL") || !vals.length ? [] : vals.map(Number));
            }}
          >
            <option value="ALL">Todos</option>
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <span className="hint">Ctrl/Cmd+click para elegir varios</span>
        </div>
        <div>
          <label>Mes</label>
          <select
            multiple
            size={4}
            value={selectedMonths.length ? selectedMonths.map(String) : ["ALL"]}
            onChange={(e) => {
              const vals = readMultiSelect(e);
              setSelectedMonths(vals.includes("ALL") || !vals.length ? [] : vals.map(Number));
            }}
          >
            <option value="ALL">Todos</option>
            {MONTHS.map((n, i) => (
              <option key={n} value={i + 1}>
                {n}
              </option>
            ))}
          </select>
          <span className="hint">Ctrl/Cmd+click para elegir varios</span>
        </div>
        <div>
          <label>Día</label>
          <select
            multiple
            size={4}
            value={selectedDays.length ? selectedDays.map(String) : ["ALL"]}
            onChange={(e) => {
              const vals = readMultiSelect(e);
              setSelectedDays(vals.includes("ALL") || !vals.length ? [] : vals.map(Number));
            }}
          >
            <option value="ALL">Todos</option>
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <span className="hint">Ctrl/Cmd+click para elegir varios</span>
        </div>
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
