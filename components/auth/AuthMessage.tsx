interface AuthMessageProps {
  tone: "error" | "success" | "info";
  message: string;
}

const TONE_CLASSES: Record<AuthMessageProps["tone"], string> = {
  error: "border-red-500/30 bg-red-500/10 text-red-300",
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  info: "border-white/10 bg-slate-900/70 text-slate-300",
};

export function AuthMessage({ tone, message }: AuthMessageProps) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-lg border px-3 py-2.5 text-sm ${TONE_CLASSES[tone]}`}
    >
      {message}
    </div>
  );
}
