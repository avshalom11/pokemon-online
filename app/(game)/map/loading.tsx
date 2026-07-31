// Matches MapContent's own outer background color so there's no flash
// between this fallback and the real content — see loading.js's file
// convention docs: this is what appears instantly on navigation while
// MapContent's page streams in.
export default function Loading() {
  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#14532d",
        paddingTop: "var(--app-header-height)",
      }}
    />
  );
}
