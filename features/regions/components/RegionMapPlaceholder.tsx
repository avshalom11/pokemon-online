import Link from "next/link";

interface RegionMapPlaceholderProps {
  englishName: string;
}

// Shown by MapContent for every region whose Region Registry entry has
// hasMap: false (everything except Kanto right now) instead of
// InteractiveWorldMap — no zones are ever rendered here, so there is no way
// to reach /battle from this screen. app/(game)/battle/page.tsx separately
// refuses a direct /battle?zone= deep link while the active region is
// mapless, so this placeholder is not the only thing standing between a
// non-Kanto region and Kanto's own zones/encounters.
export function RegionMapPlaceholder({ englishName }: RegionMapPlaceholderProps) {
  return (
    <main
      dir="rtl"
      style={{
        minHeight: "100vh",
        backgroundColor: "#0f172a",
        color: "white",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "20px",
        padding: "40px",
        paddingTop: "calc(var(--app-header-height) + 40px)",
        fontFamily: "Arial",
        textAlign: "center",
      }}
    >
      <h1 dir="ltr" style={{ fontSize: "28px", fontWeight: 700, margin: 0 }}>
        {englishName} Map — Coming Soon
      </h1>
      <p style={{ color: "#94a3b8", margin: 0 }}>המפה של האזור הזה עדיין לא זמינה.</p>

      <Link
        href="/world"
        style={{
          padding: "10px 20px",
          border: "1px solid white",
          borderRadius: "6px",
          color: "white",
          textDecoration: "none",
          fontSize: "16px",
        }}
      >
        ⬅ חזרה לעולם
      </Link>
    </main>
  );
}
