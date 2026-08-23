"use client";

import { useState } from "react";

import { AuthTabs, type AuthTab } from "./AuthTabs";
import { ForgotPasswordForm } from "./ForgotPasswordForm";
import { LoginForm } from "./LoginForm";
import { RegisterForm } from "./RegisterForm";
import { GameScreen } from "@/components/layout/GameScreen";

// The game's entry point: login/registration. Reuses GameScreen (the same
// centered "premium app" shell battle/map already sit inside) so the very
// first screen a player sees already matches the rest of the game's visual
// identity, rather than introducing a one-off layout.
export function AuthScreen() {
  const [activeTab, setActiveTab] = useState<AuthTab>("login");

  return (
    <GameScreen>
      <div
        dir="rtl"
        className="relative flex h-full w-full items-center justify-center overflow-y-auto bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-4"
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: "radial-gradient(ellipse 60% 50% at 50% 20%, rgba(251,191,36,0.12), transparent 60%)",
          }}
        />

        <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl backdrop-blur-md sm:p-8">
          <h1 className="font-fantasy mb-1 text-center text-2xl font-semibold tracking-wide text-slate-50">
            Monster Online
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
    </GameScreen>
  );
}
