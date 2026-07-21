import Link from "next/link";

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#0f172a",
        color: "white",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "Arial",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <h1>Pokemon Online</h1>

        <p>חקור את העולם, פגוש פוקימונים והילחם בהם</p>

        <Link
          href="/map"
          style={{
            display: "inline-block",
            marginTop: "20px",
            padding: "12px 24px",
            backgroundColor: "#22c55e",
            color: "#0f172a",
            textDecoration: "none",
            borderRadius: "8px",
            fontWeight: "bold",
          }}
        >
          עבור למפה
        </Link>
      </div>
    </main>
  );
}