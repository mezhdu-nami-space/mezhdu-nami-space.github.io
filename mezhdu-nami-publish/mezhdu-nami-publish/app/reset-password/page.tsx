"use client";

import { FormEvent, useEffect, useState } from "react";
import { Heart, LockKeyhole } from "lucide-react";
import { acceptSessionFromUrl, appPath, updatePassword } from "@/lib/supabase-rest";

export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { setReady(acceptSessionFromUrl()); }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(""); setBusy(true);
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") || "");
    const confirm = String(form.get("password_confirm") || "");
    try {
      if (password.length < 8) throw new Error("Пароль должен содержать не менее 8 символов.");
      if (password !== confirm) throw new Error("Пароли не совпадают.");
      await updatePassword(password);
      location.href = appPath("/");
    } catch (err) { setError(err instanceof Error ? err.message : "Не удалось изменить пароль."); }
    finally { setBusy(false); }
  };

  if (!ready) return <main className="login-screen"><section className="login-card"><h1>Ссылка недействительна</h1><p className="login-lead">Если вы только что открыли письмо, попробуйте запросить новую ссылку.</p><a className="auth-back-link" href={`${appPath("/login/")}?mode=forgot`}>Запросить новое письмо</a></section></main>;
  return <main className="login-screen"><div className="login-orb login-orb-one" /><div className="login-orb login-orb-two" /><section className="login-card compact-auth-card"><div className="between-mark"><Heart fill="currentColor" /><Heart fill="currentColor" /></div><h1>Новый пароль</h1><p className="login-lead">Придумайте пароль, который будет сложно угадать.</p>{error && <div className="login-error">{error}</div>}<form className="email-auth-form" onSubmit={submit}><label><span>Новый пароль</span><div><LockKeyhole /><input name="password" type="password" minLength={8} maxLength={128} autoComplete="new-password" required /></div></label><label><span>Повторите пароль</span><div><LockKeyhole /><input name="password_confirm" type="password" minLength={8} maxLength={128} autoComplete="new-password" required /></div></label><button type="submit" disabled={busy}>{busy ? "Сохраняем…" : "Сохранить новый пароль"}</button></form></section></main>;
}
