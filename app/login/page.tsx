"use client";

import { FormEvent, useEffect, useState } from "react";
import { Heart, LockKeyhole, Mail } from "lucide-react";
import { appPath, configured, requestPasswordReset, signIn, signInWithYandex, signUp } from "@/lib/supabase-rest";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const value = new URLSearchParams(location.search).get("mode");
    if (value === "register" || value === "forgot") setMode(value);
  }, []);

  const navigateMode = (next: typeof mode) => {
    setMode(next); setError(""); setMessage("");
    const query = next === "login" ? "" : `?mode=${next}`;
    history.replaceState(null, "", `${appPath("/login/")}${query}`);
  };

  const yandexLogin = () => {
    try {
      setError("");
      if (!configured()) throw new Error("Сайт ещё не подключён к базе.");
      signInWithYandex();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось открыть вход через Яндекс.");
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");
    try {
      if (!configured()) throw new Error("Сайт ещё не подключён к базе. Сначала заполните config.js по инструкции в README.");
      if (mode === "forgot") {
        await requestPasswordReset(email);
        setMessage("Письмо для восстановления отправлено. Проверьте почту.");
        return;
      }
      if (mode === "register") {
        const name = String(form.get("name") || "").trim();
        const confirm = String(form.get("password_confirm") || "");
        if (password.length < 8) throw new Error("Пароль должен содержать не менее 8 символов.");
        if (password !== confirm) throw new Error("Пароли не совпадают.");
        if (name.length < 2) throw new Error("Укажите имя.");
        const result = await signUp(email, password, name);
        if (!result.access_token) {
          setMessage("Аккаунт создан. Откройте письмо от Supabase и подтвердите почту, затем войдите.");
          navigateMode("login");
          return;
        }
      } else {
        await signIn(email, password);
      }
      location.href = appPath("/");
    } catch (err) { setError(err instanceof Error ? err.message : "Не удалось выполнить действие."); }
    finally { setBusy(false); }
  };

  return (
    <main className="login-screen">
      <div className="login-orb login-orb-one" /><div className="login-orb login-orb-two" />
      <section className="login-card">
        <div className="between-mark"><Heart fill="currentColor" /><Heart fill="currentColor" /></div>
        <p className="eyebrow">пространство только для двоих</p>
        <h1>Между нами</h1>
        <p className="login-lead">Ваши планы, воспоминания, желания и разговоры — в одном уютном месте.</p>
        {message && <div className="login-success">{message}</div>}
        {error && <div className="login-error">{error}</div>}
        {mode !== "forgot" && <div className="auth-switch" aria-label="Выбор действия">
          <button type="button" className={mode === "login" ? "active" : ""} onClick={() => navigateMode("login")}>Войти</button>
          <button type="button" className={mode === "register" ? "active" : ""} onClick={() => navigateMode("register")}>Создать аккаунт</button>
        </div>}
        <form className="email-auth-form" onSubmit={submit}>
          {mode === "forgot" && <p className="form-explanation">Введите почту, указанную при регистрации. Мы пришлём ссылку для нового пароля.</p>}
          {mode === "register" && <label><span>Ваше имя</span><input name="name" autoComplete="name" minLength={2} maxLength={60} placeholder="Введите имя" required /></label>}
          <label><span>Электронная почта</span><div><Mail /><input name="email" type="email" inputMode="email" autoComplete="email" placeholder="name@example.com" required /></div></label>
          {mode !== "forgot" && <label><span>Пароль</span><div><LockKeyhole /><input name="password" type="password" minLength={8} maxLength={128} autoComplete={mode === "register" ? "new-password" : "current-password"} placeholder="Не менее 8 символов" required /></div></label>}
          {mode === "register" && <label><span>Повторите пароль</span><div><LockKeyhole /><input name="password_confirm" type="password" minLength={8} maxLength={128} autoComplete="new-password" placeholder="Введите пароль ещё раз" required /></div></label>}
          <button type="submit" disabled={busy}>{busy ? "Подождите…" : mode === "register" ? "Создать аккаунт" : mode === "forgot" ? "Отправить письмо" : "Войти по почте"}</button>
          {mode === "login" && <button type="button" className="forgot-link" onClick={() => navigateMode("forgot")}>Забыли пароль?</button>}
          {mode === "forgot" && <button type="button" className="auth-back-link" onClick={() => navigateMode("login")}>Вернуться ко входу</button>}
        </form>
        {mode !== "forgot" && <>
          <div className="auth-divider">или</div>
          <div className="provider-buttons">
            <a href="#" onClick={(event) => { event.preventDefault(); yandexLogin(); }}>
              <span className="provider-yandex">Я</span>
              Войти через Яндекс
            </a>
          </div>
        </>}
        <p className="privacy-caption">Номер телефона не нужен. Данные пары доступны только вошедшим участникам вашего пространства.</p>
      </section>
    </main>
  );
}
