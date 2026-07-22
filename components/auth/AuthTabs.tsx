"use client";

export type AuthTab = "login" | "register";

interface AuthTabsProps {
  active: AuthTab;
  onChange: (tab: AuthTab) => void;
}

export function AuthTabs({ active, onChange }: AuthTabsProps) {
  return (
    <div role="tablist" className="grid grid-cols-2 gap-2 rounded-lg border border-white/10 bg-slate-900/50 p-1">
      <button
        type="button"
        role="tab"
        aria-selected={active === "login"}
        onClick={() => onChange("login")}
        className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
          active === "login" ? "bg-amber-400 text-slate-950" : "text-slate-300 hover:text-white"
        }`}
      >
        התחברות
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={active === "register"}
        onClick={() => onChange("register")}
        className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
          active === "register" ? "bg-amber-400 text-slate-950" : "text-slate-300 hover:text-white"
        }`}
      >
        הרשמה
      </button>
    </div>
  );
}
