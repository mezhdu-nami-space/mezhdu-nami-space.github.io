"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { appPath, configured, signInWithYandex } from "@/lib/supabase-rest";

export default function LoginPage() {
  const [error, setError] = useState("");

  const googleLogin = () => {
    try {
      setError("");
      if (!configured()) throw new Error("Сайт ещё не подключён к базе.");

      const config = (window as any).MEZHDU_NAMI_CONFIG ?? {};
      const supabaseUrl = String(config.supabaseUrl ?? "").replace(/\/$/, "");
      if (!supabaseUrl) throw new Error("Не найден адрес Supabase.");

      const redirectTo = `${window.location.origin}${appPath("/")}`;
      const url = new URL(`${supabaseUrl}/auth/v1/authorize`);
      url.searchParams.set("provider", "google");
      url.searchParams.set("redirect_to", redirectTo);
      window.location.href = url.toString();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось открыть вход через Google.");
    }
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

  return (
    <main className="login-screen">
      <div className="login-orb login-orb-one" />
      <div className="login-orb login-orb-two" />

      <section className="login-card">
        <div className="between-mark">
          <Heart fill="currentColor" />
          <Heart fill="currentColor" />
        </div>

        <p className="eyebrow">пространство только для двоих</p>
        <h1>Между нами</h1>
        <p className="login-lead">
          Ваши планы, воспоминания, желания и разговоры — в одном уютном месте.
        </p>

        {error && <div className="login-error">{error}</div>}

        <div className="provider-buttons" style={{ marginTop: 28, display: "grid", gap: 12 }}>
          <a
            href="#"
            onClick={(event) => {
              event.preventDefault();
              googleLogin();
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                display: "inline-grid",
                placeItems: "center",
                fontWeight: 800,
                background: "white",
                color: "#4285F4",
                border: "1px solid #ddd",
                marginRight: 10,
              }}
            >
              G
            </span>
            Продолжить через Google
          </a>

          <a
            href="#"
            onClick={(event) => {
              event.preventDefault();
              yandexLogin();
            }}
          >
            <span className="provider-yandex">Я</span>
            Продолжить через Яндекс
          </a>
        </div>

        <p className="privacy-caption" style={{ marginTop: 22 }}>
          Мы используем аккаунт только для входа. Пароль от Google или Яндекса приложение не получает.
        </p>
      </section>
    </main>
  );
}
/* ============================================
   МЕЖДУ НАМИ — PREMIUM ROMANTIC REDESIGN v1
   Вставить В САМЫЙ КОНЕЦ app/globals.css
   Меняет только оформление, не логику приложения.
   ============================================ */

:root {
