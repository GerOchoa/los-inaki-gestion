"use client";

import { useEffect, useRef, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { submitVenta, type VentaFormState } from "./actions";
import { FORMA_COBRO_OPTIONS, TIPO_COMPROBANTE_OPTIONS } from "@/lib/validation";

const initialState: VentaFormState = {};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn" type="submit" disabled={pending}>
      {pending ? "Guardando…" : "Guardar venta"}
    </button>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <div className="field-error">{message}</div>;
}

export default function VentaForm() {
  const [state, formAction] = useActionState(submitVenta, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const errors = state.errors || {};

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  return (
    <div className="box form-shell" style={{ padding: 20 }}>
      <h2 style={{ marginTop: 0, fontSize: 19 }}>Formulario de venta</h2>
      <p className="small" style={{ marginBottom: 16 }}>
        Cargá el monto en las unidades de negocio que correspondan. Dejá en 0 las que no aplican.
      </p>

      {state.success && <div className="form-success">Venta guardada correctamente.</div>}
      {state.formError && <div className="form-error">{state.formError}</div>}

      <form ref={formRef} action={formAction} noValidate>
        <div className="field" style={{ marginBottom: 14 }}>
          <label htmlFor="created_by_name">Tu nombre</label>
          <input id="created_by_name" name="created_by_name" type="text" required />
          <FieldError message={errors.created_by_name} />
        </div>

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

        <div className="form-grid" style={{ marginTop: 14 }}>
          <div className="field">
            <label htmlFor="monto_alojamiento">Monto alojamiento</label>
            <input
              id="monto_alojamiento"
              name="monto_alojamiento"
              type="number"
              step="0.01"
              min="0"
              defaultValue={0}
            />
            <FieldError message={errors.monto_alojamiento} />
          </div>
          <div className="field">
            <label htmlFor="monto_confiteria">Monto confitería</label>
            <input
              id="monto_confiteria"
              name="monto_confiteria"
              type="number"
              step="0.01"
              min="0"
              defaultValue={0}
            />
            <FieldError message={errors.monto_confiteria} />
          </div>
          <div className="field">
            <label htmlFor="monto_eventos">Monto eventos</label>
            <input
              id="monto_eventos"
              name="monto_eventos"
              type="number"
              step="0.01"
              min="0"
              defaultValue={0}
            />
            <FieldError message={errors.monto_eventos} />
          </div>
          <div className="field">
            <label htmlFor="monto_otros">Monto otros</label>
            <input
              id="monto_otros"
              name="monto_otros"
              type="number"
              step="0.01"
              min="0"
              defaultValue={0}
            />
            <FieldError message={errors.monto_otros} />
          </div>
        </div>

        <div className="field" style={{ marginTop: 14 }}>
          <label htmlFor="detalles">Detalles</label>
          <textarea id="detalles" name="detalles" rows={2} />
        </div>

        <div className="form-grid" style={{ marginTop: 14 }}>
          <div className="field">
            <label htmlFor="forma_cobro">Forma de cobro</label>
            <select id="forma_cobro" name="forma_cobro" defaultValue="" required>
              <option value="" disabled>
                Elegí una opción
              </option>
              {FORMA_COBRO_OPTIONS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <FieldError message={errors.forma_cobro} />
          </div>

          <div className="field">
            <label htmlFor="tiene_comprobante">Comprobante</label>
            <select id="tiene_comprobante" name="tiene_comprobante" defaultValue="" required>
              <option value="" disabled>
                Elegí una opción
              </option>
              <option value="si">Sí</option>
              <option value="no">No</option>
            </select>
            <FieldError message={errors.tiene_comprobante} />
          </div>

          <div className="field">
            <label htmlFor="numero_comprobante">N° de comprobante</label>
            <input id="numero_comprobante" name="numero_comprobante" type="text" />
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
