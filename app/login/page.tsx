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
  --background: #fffaf8;
  --foreground: #39282f;
  --card: #fffdfc;
  --card-foreground: #39282f;
  --popover: #fffdfc;
  --popover-foreground: #39282f;
  --primary: #b94f6d;
  --primary-foreground: #fffaf8;
  --secondary: #f8efec;
  --secondary-foreground: #4b333c;
  --muted: #f7efed;
  --muted-foreground: #6c525b;
  --accent: #f7e4e7;
  --accent-foreground: #5b3944;
  --border: #ead9d7;
  --input: #e9d8d6;
  --ring: #c96d85;
  --radius: 1rem;
}

body {
  --app-bg: #fbf4f1;
  --surface: rgba(255, 253, 251, .94);
  --ink: #39282f;
  --subtle: #6b5059;
  --brand: #c35b78;
  --brand-deep: #9f405c;
  --soft: #f7e5e8;
  --line: #ead8d7;
  --gold: #c6a16d;
  --premium-serif: "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif;
  --premium-sans: Inter, "Avenir Next", "Segoe UI", system-ui, -apple-system, sans-serif;
  background: #fbf4f1;
  color: #39282f;
  font-family: var(--premium-sans);
  letter-spacing: .002em;
  -webkit-font-smoothing: antialiased;
}

/* ---- Общая тема приложения ---- */
.couple-shell {
  --app-bg: #fbf4f1;
  --surface: rgba(255, 253, 251, .94);
  --ink: #39282f;
  --subtle: #6b5059;
  --brand: #c35b78;
  --brand-deep: #9f405c;
  --soft: #f7e5e8;
  --line: #ead8d7;
  --shadow: 0 24px 70px rgba(74, 42, 51, .11);
  background:
    radial-gradient(circle at 88% 4%, rgba(225, 172, 182, .24), transparent 31%),
    radial-gradient(circle at 3% 72%, rgba(235, 208, 195, .32), transparent 30%),
    var(--app-bg);
}

/* Текст всегда заметный, а не бледно-серый */
.couple-shell p,
.couple-shell small,
.couple-shell label,
.couple-shell .calendar-hint,
.couple-shell .photo-hint,
.couple-shell .empty-state,
.couple-shell .event-card p,
.couple-shell .note-card p,
.couple-shell .wish-copy p,
.couple-shell .idea-list p,
.login-lead,
.privacy-caption,
.form-explanation {
  color: var(--subtle) !important;
}

.couple-shell h1,
.couple-shell h2,
.couple-shell h3,
.login-card h1,
.onboarding h1,
.form-dialog [data-slot="dialog-title"] {
  font-family: var(--premium-serif) !important;
  color: var(--ink);
  font-weight: 600 !important;
  letter-spacing: -.025em;
}

.eyebrow {
  color: var(--brand-deep) !important;
  font-size: .69rem;
  font-weight: 750;
  letter-spacing: .19em;
}

/* ---- Верхняя панель ---- */
.topbar {
  max-width: 820px;
  margin-bottom: 26px;
  padding: 5px 2px;
}

.topbar h1 {
  font-size: clamp(1.9rem, 4vw, 2.45rem);
  line-height: 1;
}

.top-actions { gap: 10px; }

.round-button,
.profile-button {
  width: 46px;
  height: 46px;
  border-radius: 16px;
  border: 1px solid rgba(185, 126, 139, .24);
  background: rgba(255, 253, 251, .91);
  color: #65434e;
  box-shadow: 0 10px 30px rgba(78, 45, 56, .08);
  backdrop-filter: blur(16px);
  transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
}

.round-button:hover,
.profile-button:hover {
  transform: translateY(-2px);
  border-color: rgba(195, 91, 120, .42);
  box-shadow: 0 15px 35px rgba(78, 45, 56, .13);
}

.mail-alert:after {
  width: 10px;
  height: 10px;
  right: -1px;
  top: -1px;
  border: 2px solid #fbf4f1;
  box-shadow: 0 0 0 1px rgba(159, 64, 92, .09);
}

/* ---- Премиальные карточки ---- */
.calendar-card,
.settings-card,
.feature-banner,
.event-card,
.note-card,
.wish-card,
.idea-list article,
.message-form,
.partner-request {
  border-color: rgba(190, 142, 151, .25) !important;
  background: rgba(255, 253, 251, .93) !important;
  box-shadow: 0 16px 45px rgba(70, 40, 49, .065) !important;
  backdrop-filter: blur(16px);
}

.calendar-card,
.settings-card,
.feature-banner {
  border-radius: 28px;
}

.hero-card {
  min-height: 164px;
  border-radius: 30px;
  background:
    radial-gradient(circle at 86% 20%, rgba(255,255,255,.15), transparent 24%),
    linear-gradient(135deg, #8e3c55 0%, #b9506e 54%, #cf7389 100%);
  box-shadow: 0 24px 65px rgba(126, 58, 79, .22);
}

.hero-card:after {
  opacity: .65;
  font-family: var(--premium-serif);
}

.hero-card h2 { font-size: 1.85rem; }
.hero-card p,
.hero-card span { color: rgba(255,255,255,.92) !important; }

.primary-add {
  border: 1px solid rgba(255,255,255,.65) !important;
  min-height: 44px;
  box-shadow: 0 10px 25px rgba(68, 29, 41, .12);
}

/* ---- Календарь ---- */
.month-title h2 {
  font-family: var(--premium-serif);
  font-size: 1.45rem;
  font-weight: 600;
}

.month-title button {
  color: #75525d;
  border-radius: 13px;
  transition: background .18s ease;
}
.month-title button:hover { background: #f8ecec; }

.weekdays span {
  color: #755c64;
  font-weight: 700;
  letter-spacing: .04em;
}

.month-grid button {
  color: #412f35;
  font-weight: 650;
  transition: transform .15s ease, background .15s ease;
}
.month-grid button:hover { background: #f9eeee; transform: translateY(-1px); }
.month-grid button.today {
  color: #8d3451;
  background: linear-gradient(145deg, #fae5e9, #f5d9df);
  box-shadow: inset 0 0 0 1px rgba(180, 87, 111, .12);
}

/* ---- Навигация ---- */
.bottom-nav {
  border-color: rgba(185, 135, 146, .26) !important;
  background: rgba(255, 252, 250, .88) !important;
  box-shadow: 0 22px 60px rgba(66, 38, 47, .16) !important;
  backdrop-filter: blur(26px) saturate(1.12) !important;
}

.bottom-nav button {
  color: #73545e !important;
  font-weight: 750 !important;
}
.bottom-nav button[data-state="active"] {
  color: #87354f !important;
  background: linear-gradient(145deg, #f9e6e9, #f4dfe3) !important;
}

/* ---- Списки, заметки, желания ---- */
.event-card,
.note-card,
.wish-card { border-radius: 24px; }
.event-card h3,
.note-card h3,
.wish-copy h3 { color: #3d2a31; }

.event-date,
.wish-icon {
  background: linear-gradient(145deg, #f9e7ea, #f4dde2);
  color: #9d3f5b;
}

/* ---- Чат ---- */
.chat-switch {
  background: rgba(255, 253, 251, .9);
  border-color: rgba(190, 142, 151, .25);
  box-shadow: 0 12px 38px rgba(70, 40, 49, .055);
}
.chat-switch button { color: #6e5059; }
.chat-switch button.active {
  background: linear-gradient(145deg, #f7e4e8, #f3dce1);
  color: #933b56;
}

.message {
  background: rgba(255,253,251,.96);
  border-color: rgba(190,142,151,.24);
  box-shadow: 0 7px 22px rgba(72, 42, 51, .055);
}
.message.mine {
  background: linear-gradient(135deg, #aa4563, #c45e79);
  color: #fffdfb;
  box-shadow: 0 9px 26px rgba(157, 62, 90, .16);
}
.message.mine p,
.message.mine span,
.message.mine time { color: #fffdfb !important; }
.message p { line-height: 1.45; }

.message-form {
  border-radius: 23px;
  padding: 8px;
}
.message-form input::placeholder { color: #8b747b; opacity: 1; }
.message-form button {
  background: linear-gradient(145deg, #b34b69, #9b3c59);
  box-shadow: 0 8px 20px rgba(149, 58, 84, .16);
}

/* ---- Формы и модальные окна ---- */
.form-dialog {
  border-radius: 30px !important;
  background: #fdf8f5 !important;
  border-color: rgba(184, 130, 141, .28) !important;
  box-shadow: 0 32px 100px rgba(61, 34, 43, .20) !important;
}

.form-dialog label {
  color: #644852 !important;
  font-weight: 750;
}
.form-dialog input,
.form-dialog textarea,
.form-dialog select {
  color: #39282f !important;
  background: #fffdfb !important;
  border-color: #e8d4d3 !important;
  border-radius: 15px !important;
}
.form-dialog input::placeholder,
.form-dialog textarea::placeholder { color: #8a7179 !important; opacity: 1; }
.form-dialog form > button {
  background: linear-gradient(135deg, #b64d6b, #9d3e5a) !important;
  box-shadow: 0 10px 27px rgba(150, 58, 85, .17);
}

/* ---- Экран входа ---- */
.login-screen {
  background:
    radial-gradient(circle at 78% 10%, rgba(231, 183, 190, .35), transparent 28%),
    radial-gradient(circle at 12% 92%, rgba(228, 205, 190, .38), transparent 30%),
    linear-gradient(145deg, #fbf3ef, #fffaf8 52%, #f7ecec);
  color: #39282f;
}

.login-orb-one { background: #e8bbc5; opacity: .28; filter: blur(22px); }
.login-orb-two { background: #ead8ce; opacity: .34; filter: blur(25px); }

.login-card {
  width: min(100%, 455px);
  padding: 42px 40px;
  border-radius: 34px;
  background: rgba(255, 253, 251, .90);
  border: 1px solid rgba(185, 133, 144, .24);
  box-shadow: 0 34px 100px rgba(75, 42, 52, .14);
  backdrop-filter: blur(24px);
}
.login-card h1 {
  font-family: var(--premium-serif) !important;
  font-size: clamp(2.55rem, 9vw, 3.15rem);
  font-weight: 500 !important;
  color: #38262d;
}
.login-lead {
  max-width: 355px;
  margin-inline: auto;
  font-size: .96rem;
  line-height: 1.65;
  color: #694e57 !important;
}

.between-mark { color: #a94361; }
.between-mark svg:last-child { color: #cf7189; }

.provider-buttons { gap: 12px !important; }
.provider-buttons a {
  height: 54px;
  border-radius: 17px;
  border: 1px solid #e7d4d3;
  background: rgba(255,255,255,.92);
  color: #3d2c32;
  font-weight: 750;
  box-shadow: 0 8px 22px rgba(62, 37, 45, .05);
  transition: transform .17s ease, box-shadow .17s ease, border-color .17s ease;
}
.provider-buttons a:hover {
  transform: translateY(-1px);
  border-color: #d8b7bc;
  box-shadow: 0 12px 30px rgba(62, 37, 45, .09);
}
.provider-yandex {
  background: #fff0ef !important;
  color: #d92c32 !important;
}
.privacy-caption {
  color: #755d65 !important;
  font-size: .76rem !important;
  line-height: 1.55;
}

/* ---- Онбординг ---- */
.onboarding,
.app-loading {
  background:
    radial-gradient(circle at 50% 6%, rgba(232, 187, 197, .35), transparent 30%),
    #fbf4f1;
  color: #39282f;
}
.onboarding-card {
  background: rgba(255,253,251,.94);
  border-color: #ead7d6;
  box-shadow: 0 30px 90px rgba(77, 42, 53, .13);
}
.onboarding-card > p:not(.eyebrow) { color: #694e57; }
.onboarding-actions button:first-child,
.onboarding form button[type="submit"] {
  background: linear-gradient(135deg, #b84f6d, #9d3d59);
  box-shadow: 0 10px 26px rgba(153, 58, 84, .16);
}

/* ---- Фон: чуть мягче и дороже; полноценное contain настроим отдельной задачей ---- */
.couple-shell.has-photo-bg:before {
  background-image:
    linear-gradient(rgba(251,244,241,.76), rgba(251,244,241,.91)),
    var(--couple-bg);
  background-position: center;
}

/* ---- Адаптация ---- */
@media (min-width: 900px) {
  .topbar,
  .app-tabs,
  .partner-request { max-width: 820px; }
  .calendar-card { padding: 27px; }
  .hero-card { padding: 32px; }
}

@media (max-width: 520px) {
  .login-card { padding: 34px 22px; border-radius: 28px; }
  .couple-shell { padding-inline: 13px; }
  .round-button,
  .profile-button { width: 43px; height: 43px; border-radius: 14px; }
  .calendar-card,
  .settings-card,
  .feature-banner { border-radius: 24px; }
}
