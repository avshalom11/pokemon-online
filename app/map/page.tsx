import Link from "next/link";

export default function MapPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#14532d",
        color: "white",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "40px",
        fontFamily: "Arial",
      }}
    >
      <h1>מפת העולם</h1>

      <p>בחר אזור כדי להתחיל קרב</p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 220px)",
          gap: "20px",
          marginTop: "40px",
        }}
      >
        <Link href="/battle?zone=grassland">🌿 דשא</Link>

        <Link href="/battle?zone=water">🌊 מים</Link>

        <Link href="/battle?zone=cave">🏔️ מערה</Link>

        <Link href="/battle?zone=lava">🌋 לבה</Link>

        <Link href="/battle?zone=beach">🏖️ חוף ים</Link>

        <Link href="/battle?zone=haunted-house">👻 בית רוחות</Link>
      </div>
    </main>
  );
}