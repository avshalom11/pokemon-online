"use client";

import { useState } from "react";

import { AuthTabs, type AuthTab } from "./AuthTabs";
import { ForgotPasswordForm } from "./ForgotPasswordForm";
import { LoginForm } from "./LoginForm";
import { RegisterForm } from "./RegisterForm";

// The game's entry point: login/registration. Deliberately does NOT reuse
// GameScreen (components/layout/GameScreen.tsx) — that shell's inner
// container is capped to w-[85%]/max-w-[1400px], rounded, and
// overflow-hidden (its "premium app" card framing, right for post-auth
// surfaces like Battle/Map), which is exactly what boxed the background
// image into a small centered rectangle instead of the full browser
// viewport the AUTH SCREEN BRANDING ticket calls for — GameScreen's own
// outer wrapper is also solid bg-slate-950, opaque, so nothing behind it
// (even a position:fixed layer) would ever show through regardless. This
// component owns its own full-viewport wrapper instead, sized off `body`'s
// own min-h-full (app/layout.tsx) via min-h-dvh, so the background
// genuinely spans edge-to-edge with no ancestor clipping or opaque layer
// in the way — never GameScreen's shared shell.
export function AuthScreen() {
  const [activeTab, setActiveTab] = useState<AuthTab>("login");

  return (
    <div
      dir="rtl"
      className="relative flex min-h-dvh w-full items-center justify-center overflow-y-auto bg-slate-950 p-4"
    >
      {/* AUTH SCREEN BRANDING — full-screen opening background, edge to
          edge, cover + center. A plain CSS background-image (not
          next/image), so a missing file at
          public/images/auth/login-background.png never throws — the
          browser just renders nothing for it and the plain bg-slate-950 on
          this same root div still carries the screen. inset-0 on this
          absolutely-positioned root's own direct child spans exactly the
          full min-h-screen/w-full box above — no scrim layered on top
          anymore, so the image renders at its own full brightness. */}
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/auth/login-background.png')" }}
      />
      {/* Kept: a soft amber highlight, not a darkening overlay (12% alpha,
          additive glow only) — doesn't obscure the image, so the ticket's
          "keep if it doesn't noticeably darken" applies. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 60% 50% at 50% 20%, rgba(251,191,36,0.12), transparent 60%)",
        }}
      />

      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl backdrop-blur-md sm:p-8">
        <h1 className="font-fantasy mb-1 text-center tracking-wide text-slate-50">
          <span className="block text-2xl font-semibold tracking-wide sm:text-3xl">POKÉMON LEGACY</span>
          <span className="mt-1 block text-sm font-medium tracking-[0.3em] text-slate-300">ONLINE</span>
        </h1>
        <p className="mb-6 text-center text-sm text-slate-400">העולם מחכה למסע שלך</p>

        {activeTab === "forgot-password" ? null : <AuthTabs active={activeTab} onChange={setActiveTab} />}

        <div className="mt-6">
          {activeTab === "login" ? <LoginForm onForgotPassword={() => setActiveTab("forgot-password")} /> : null}
          {activeTab === "register" ? <RegisterForm /> : null}
          {activeTab === "forgot-password" ? (
            <ForgotPasswordForm onBackToLogin={() => setActiveTab("login")} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
