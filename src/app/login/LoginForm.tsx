"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn" type="submit" disabled={pending} style={{ width: "100%" }}>
      {pending ? "Ingresando…" : "Ingresar"}
    </button>
  );
}

export default function LoginForm({ next }: { next: string }) {
  const [state, formAction] = useActionState(loginAction, initialState);

  return (
    <form action={formAction}>
      <input type="hidden" name="next" value={next} />
      <div className="field" style={{ marginBottom: 14 }}>
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="username" required />
      </div>
      <div className="field" style={{ marginBottom: 14 }}>
        <label htmlFor="password">Contraseña</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      {state.error && <div className="form-error">{state.error}</div>}
      <SubmitButton />
    </form>
  );
}
