"use client";

import { useEffect, useRef, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { submitGasto, type GastoFormState } from "./actions";
import {
  CATEGORIA_GASTO_OPTIONS,
  UNIDAD_NEGOCIO_GASTO_OPTIONS,
  FORMA_PAGO_OPTIONS,
  TIPO_PAGO_OPTIONS,
  TIPO_COMPROBANTE_OPTIONS,
} from "@/lib/validation";

const initialState: GastoFormState = {};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn" type="submit" disabled={pending}>
      {pending ? "Guardando…" : "Guardar gasto"}
    </button>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <div className="field-error">{message}</div>;
}

export default function GastoForm() {
  const [state, formAction] = useActionState(submitGasto, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const errors = state.errors || {};

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  return (
    <div className="box form-shell" style={{ padding: 20 }}>
      <h2 style={{ marginTop: 0, fontSize: 19 }}>Formulario de gasto</h2>
      <p className="small" style={{ marginBottom: 16 }}>
        Todos los campos son obligatorios salvo que digan &quot;opcional&quot;.
      </p>

      {state.success && (
        <div className="form-success">Gasto guardado correctamente.</div>
      )}
      {state.formError && <div className="form-error">{state.formError}</div>}

      <form ref={formRef} action={formAction} noValidate>
        <div className="field" style={{ marginBottom: 14 }}>
          <label htmlFor="created_by_name">Tu nombre</label>
          <input id="created_by_name" name="created_by_name" type="text" required />
          <FieldError message={errors.created_by_name} />
        </div>

        <div className="form-grid">
          <div className="field">
            <label htmlFor="fecha_operacion">Fecha de operación</label>
            <input
              id="fecha_operacion"
              name="fecha_operacion"
              type="date"
              defaultValue={todayISO()}
              required
            />
            <FieldError message={errors.fecha_operacion} />
          </div>

          <div className="field">
            <label htmlFor="rubro_proveedor">Rubro/Proveedor</label>
            <input id="rubro_proveedor" name="rubro_proveedor" type="text" required />
            <FieldError message={errors.rubro_proveedor} />
          </div>
        </div>

        <div className="field" style={{ marginTop: 14 }}>
          <label htmlFor="detalle_compra">Detalle de compra</label>
          <textarea id="detalle_compra" name="detalle_compra" rows={2} required />
          <FieldError message={errors.detalle_compra} />
        </div>

        <div className="form-grid" style={{ marginTop: 14 }}>
          <div className="field">
            <label htmlFor="categoria">Categoría</label>
            <select id="categoria" name="categoria" defaultValue="" required>
              <option value="" disabled>
                Elegí una opción
              </option>
              {CATEGORIA_GASTO_OPTIONS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <FieldError message={errors.categoria} />
          </div>

          <div className="field">
            <label htmlFor="unidad_negocio">Unidad de negocio</label>
            <select id="unidad_negocio" name="unidad_negocio" defaultValue="" required>
              <option value="" disabled>
                Elegí una opción
              </option>
              {UNIDAD_NEGOCIO_GASTO_OPTIONS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <FieldError message={errors.unidad_negocio} />
          </div>

          <div className="field">
            <label htmlFor="forma_pago">Forma de pago</label>
            <select id="forma_pago" name="forma_pago" defaultValue="" required>
              <option value="" disabled>
                Elegí una opción
              </option>
              {FORMA_PAGO_OPTIONS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <FieldError message={errors.forma_pago} />
          </div>

          <div className="field">
            <label htmlFor="tipo_pago">Tipo de pago</label>
            <select id="tipo_pago" name="tipo_pago" defaultValue="" required>
              <option value="" disabled>
                Elegí una opción
              </option>
              {TIPO_PAGO_OPTIONS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <FieldError message={errors.tipo_pago} />
          </div>

          <div className="field">
            <label htmlFor="monto">Monto</label>
            <input id="monto" name="monto" type="number" step="0.01" min="0.01" required />
            <FieldError message={errors.monto} />
          </div>

          <div className="field">
            <label htmlFor="tipo_comprobante">Tipo de comprobante (opcional)</label>
            <select id="tipo_comprobante" name="tipo_comprobante" defaultValue="">
              <option value="">Sin especificar</option>
              {TIPO_COMPROBANTE_OPTIONS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <FieldError message={errors.tipo_comprobante} />
          </div>

          <div className="field">
            <label htmlFor="numero_comprobante">N° comprobante (opcional)</label>
            <input id="numero_comprobante" name="numero_comprobante" type="text" />
          </div>
        </div>

        <div className="field" style={{ marginTop: 14 }}>
          <label htmlFor="observaciones">Observaciones (opcional)</label>
          <textarea id="observaciones" name="observaciones" rows={2} />
        </div>

        <div style={{ marginTop: 18 }}>
          <SubmitButton />
        </div>
      </form>
    </div>
  );
}
