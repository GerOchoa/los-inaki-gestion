"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { nickToEmail } from "@/lib/auth";

export interface LoginState {
  error?: string;
}

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const nick = String(formData.get("nick") || "").trim();
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "/");

  if (!nick || !password) {
    return { error: "Ingresá tu usuario y tu contraseña." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: nickToEmail(nick),
    password,
  });

  if (error) {
    return { error: "Usuario o contraseña incorrectos." };
  }

  redirect(next && next.startsWith("/") ? next : "/");
}
