"use client";

// Modales de edición rápida para el panel admin: permiten corregir una
// carga errónea de gasto/venta sin salir de la app (antes había que ir al
// Table Editor de Supabase). Reutilizan la misma validación y las mismas
// opciones que los formularios de carga; sólo cambia que llaman a
// updateGasto/updateVenta (ligada al id con .bind) en vez de submitGasto/
// submitVenta.

import { useEffect, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updateGasto, type GastoFormState } from "@/app/formularios/gasto/actions";
import { updateVenta, type VentaFormState } from "@/app/formularios/venta/actions";
import type { GastoRow, VentaRow } from "@/lib/types";
import {
  CATEGORIA_GASTO_OPTIONS,
  UNIDAD_NEGOCIO_GASTO_OPTIONS,
  FORMA_PAGO_OPTIONS,
  TIPO_PAGO_OPTIONS,
  TIPO_COMPROBANTE_OPTIONS,
} from "@/lib/validation";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <div className="field-error">{message}</div>;
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn" type="submit" disabled={pending}>
      {pending ? "Guardando…" : "Guardar cambios"}
    </button>
  );
}

const gastoInitial: GastoFormState = {};
const ventaInitial: VentaFormState = {};

export function EditGastoModal({
  gasto,
  onClose,
  onSaved,
}: {
  gasto: GastoRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const boundAction = updateGasto.bind(null, gasto.id);
  const [state, formAction] = useActionState(boundAction, gastoInitial);
  const errors = state.errors || {};

  useEffect(() => {
    if (state.success) onSaved();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-box">
        <div className="modal-head">
          <h2 style={{ margin: 0, fontSize: 18 }}>Editar gasto #{gasto.id}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar" type="button">
            ×
          </button>
        </div>

        {state.formError && <div className="form-error">{state.formError}</div>}

        <form action={formAction}>
          <div className="field" style={{ marginBottom: 14 }}>
            <label htmlFor="e_created_by_name">Tu nombre</label>
            <input
              id="e_created_by_name"
              name="created_by_name"
              type="text"
              defaultValue={gasto.created_by_name}
              required
            />
            <FieldError message={errors.created_by_name} />
          </div>

          <div className="form-grid">
            <div className="field">
              <label htmlFor="e_fecha_operacion">Fecha de operación</label>
              <input
                id="e_fecha_operacion"
                name="fecha_operacion"
                type="date"
                defaultValue={gasto.fecha_operacion}
                required
              />
              <FieldError message={errors.fecha_operacion} />
            </div>

            <div className="field">
              <label htmlFor="e_rubro_proveedor">Rubro/Proveedor</label>
              <input
                id="e_rubro_proveedor"
                name="rubro_proveedor"
                type="text"
                defaultValue={gasto.rubro_proveedor}
                required
              />
              <FieldError message={errors.rubro_proveedor} />
            </div>
          </div>

          <div className="field" style={{ marginTop: 14 }}>
            <label htmlFor="e_detalle_compra">Detalle de compra</label>
            <textarea
              id="e_detalle_compra"
              name="detalle_compra"
              rows={2}
              defaultValue={gasto.detalle_compra}
              required
            />
            <FieldError message={errors.detalle_compra} />
          </div>

          <div className="form-grid" style={{ marginTop: 14 }}>
            <div className="field">
              <label htmlFor="e_categoria">Categoría</label>
              <select id="e_categoria" name="categoria" defaultValue={gasto.categoria} required>
                {CATEGORIA_GASTO_OPTIONS.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
              <FieldError message={errors.categoria} />
            </div>

            <div className="field">
              <label htmlFor="e_unidad_negocio">Unidad de negocio</label>
              <select
                id="e_unidad_negocio"
                name="unidad_negocio"
                defaultValue={gasto.unidad_negocio}
                required
              >
                {UNIDAD_NEGOCIO_GASTO_OPTIONS.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
              <FieldError message={errors.unidad_negocio} />
            </div>

            <div className="field">
              <label htmlFor="e_forma_pago">Forma de pago</label>
              <select id="e_forma_pago" name="forma_pago" defaultValue={gasto.forma_pago} required>
                {FORMA_PAGO_OPTIONS.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
              <FieldError message={errors.forma_pago} />
            </div>

            <div className="field">
              <label htmlFor="e_tipo_pago">Tipo de pago</label>
              <select id="e_tipo_pago" name="tipo_pago" defaultValue={gasto.tipo_pago} required>
                {TIPO_PAGO_OPTIONS.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
              <FieldError message={errors.tipo_pago} />
            </div>

            <div className="field">
              <label htmlFor="e_monto">Monto</label>
              <input
                id="e_monto"
                name="monto"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                defaultValue={String(gasto.monto).replace(".", ",")}
                required
              />
              <FieldError message={errors.monto} />
            </div>

            <div className="field">
              <label htmlFor="e_tipo_comprobante">Tipo de comprobante (opcional)</label>
              <select
                id="e_tipo_comprobante"
                name="tipo_comprobante"
                defaultValue={gasto.tipo_comprobante || ""}
              >
                <option value="">Sin especificar</option>
                {TIPO_COMPROBANTE_OPTIONS.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
              <FieldError message={errors.tipo_comprobante} />
            </div>
          </div>

          <div className="field" style={{ marginTop: 14 }}>
            <label htmlFor="e_observaciones">Observaciones (opcional)</label>
            <textarea
              id="e_observaciones"
              name="observaciones"
              rows={2}
              defaultValue={gasto.observaciones || ""}
            />
          </div>

          <div style={{ marginTop: 18, display: "flex", gap: 8 }}>
            <SaveButton />
            <button className="btn light" type="button" onClick={onClose}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function EditVentaModal({
  venta,
  onClose,
  onSaved,
}: {
  venta: VentaRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const boundAction = updateVenta.bind(null, venta.id);
  const [state, formAction] = useActionState(boundAction, ventaInitial);
  const errors = state.errors || {};

  useEffect(() => {
    if (state.success) onSaved();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-box">
        <div className="modal-head">
          <h2 style={{ margin: 0, fontSize: 18 }}>Editar venta #{venta.id}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar" type="button">
            ×
          </button>
        </div>

        {state.formError && <div className="form-error">{state.formError}</div>}

        <form action={formAction}>
          <div className="field" style={{ marginBottom: 14 }}>
            <label htmlFor="e_v_created_by_name">Tu nombre</label>
            <input
              id="e_v_created_by_name"
              name="created_by_name"
              type="text"
              defaultValue={venta.created_by_name}
              required
            />
            <FieldError message={errors.created_by_name} />
          </div>

          <div className="field">
            <label htmlFor="e_v_fecha_operacion">Fecha de operación</label>
            <input
              id="e_v_fecha_operacion"
              name="fecha_operacion"
              type="date"
              defaultValue={venta.fecha_operacion}
              required
            />
            <FieldError message={errors.fecha_operacion} />
          </div>

          <div className="form-grid" style={{ marginTop: 14 }}>
            <div className="field">
              <label htmlFor="e_v_monto_alojamiento">Monto alojamiento</label>
              <input
                id="e_v_monto_alojamiento"
                name="monto_alojamiento"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                defaultValue={String(venta.monto_alojamiento).replace(".", ",")}
              />
              <FieldError message={errors.monto_alojamiento} />
            </div>
            <div className="field">
              <label htmlFor="e_v_monto_cafeteria">Monto cafetería</label>
              <input
                id="e_v_monto_cafeteria"
                name="monto_cafeteria"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                defaultValue={String(venta.monto_cafeteria).replace(".", ",")}
              />
              <FieldError message={errors.monto_cafeteria} />
            </div>
            <div className="field">
              <label htmlFor="e_v_monto_eventos">Monto eventos</label>
              <input
                id="e_v_monto_eventos"
                name="monto_eventos"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                defaultValue={String(venta.monto_eventos).replace(".", ",")}
              />
              <FieldError message={errors.monto_eventos} />
            </div>
            <div className="field">
              <label htmlFor="e_v_monto_otros">Monto otros</label>
              <input
                id="e_v_monto_otros"
                name="monto_otros"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                defaultValue={String(venta.monto_otros).replace(".", ",")}
              />
              <FieldError message={errors.monto_otros} />
            </div>
          </div>

          {/* Estos campos están ocultos en el formulario de carga; viajan
              igual con su valor actual para no pisarlos al guardar. */}
          <input type="hidden" name="forma_cobro" defaultValue={venta.forma_cobro} />
          <input
            type="hidden"
            name="tiene_comprobante"
            defaultValue={venta.tiene_comprobante ? "si" : "no"}
          />
          <input type="hidden" name="numero_comprobante" defaultValue={venta.numero_comprobante || ""} />
          <input type="hidden" name="tipo_comprobante" defaultValue={venta.tipo_comprobante || ""} />

          <div className="field" style={{ marginTop: 14 }}>
            <label htmlFor="e_v_observaciones">Observaciones (opcional)</label>
            <textarea
              id="e_v_observaciones"
              name="observaciones"
              rows={2}
              defaultValue={venta.observaciones || ""}
            />
          </div>

          <div style={{ marginTop: 18, display: "flex", gap: 8 }}>
            <SaveButton />
            <button className="btn light" type="button" onClick={onClose}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
