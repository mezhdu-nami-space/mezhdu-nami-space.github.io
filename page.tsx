"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { appPath, configured } from "@/lib/supabase-rest";

type OAuthProvider = "google" | "custom:yandex";

type PublicConfig = {
  supabaseUrl?: string;
};

export default function LoginPage() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<OAuthProvider | null>(null);

  const startOAuth = (provider: OAuthProvider) => {
    try {
      setError("");
      setBusy(provider);

      if (!configured()) {
        throw new Error("Сайт ещё не подключён к базе.");
      }

      const publicConfig = (window as Window & {
        MEZHDU_NAMI_CONFIG?: PublicConfig;
      }).MEZHDU_NAMI_CONFIG;

      const supabaseUrl = String(publicConfig?.supabaseUrl || "").replace(/\/$/, "");
      if (!supabaseUrl) {
        throw new Error("Не удалось найти адрес Supabase.");
      }

      const redirectTo = `${window.location.origin}${appPath("/")}`;
      const url = new URL(`${supabaseUrl}/auth/v1/authorize`);
      url.searchParams.set("provider", provider);
      url.searchParams.set("redirect_to", redirectTo);
      window.location.href = url.toString();
    } catch (err) {
      setBusy(null);
      setError(err instanceof Error ? err.message : "Не удалось начать вход.");
    }
  };

  return (
    <main className="login-screen">
      <div className="login-orb login-orb-one" />
      <div className="login-orb login-orb-two" />

      <section className="login-card compact-auth-card">
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

        <div className="provider-buttons">
          <a
            href="#"
            aria-busy={busy === "google"}
            onClick={(event) => {
              event.preventDefault();
              if (!busy) startOAuth("google");
            }}
          >
            <span className="provider-google">G</span>
            {busy === "google" ? "Открываем Google…" : "Продолжить через Google"}
          </a>

          <a
            href="#"
            aria-busy={busy === "custom:yandex"}
            onClick={(event) => {
              event.preventDefault();
              if (!busy) startOAuth("custom:yandex");
            }}
          >
            <span className="provider-yandex">Я</span>
            {busy === "custom:yandex" ? "Открываем Яндекс…" : "Продолжить через Яндекс"}
          </a>
        </div>

        <p className="login-note">
          При первом входе аккаунт создастся автоматически. Отдельная регистрация и пароль для «Между нами» не нужны.
        </p>

        <p className="privacy-caption">
          Мы используем Google или Яндекс только для входа. Пароль от вашего аккаунта приложение не получает.
        </p>
      </section>
    </main>
  );
}
