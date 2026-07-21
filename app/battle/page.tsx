import { Suspense } from "react";

import { BattleContent } from "./components/BattleContent";

function BattleLoadingFallback() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Arial",
      }}
    >
      <p>טוען קרב...</p>
    </main>
  );
}

export default function BattlePage() {
  return (
    <Suspense fallback={<BattleLoadingFallback />}>
      <BattleContent />
    </Suspense>
  );
}
