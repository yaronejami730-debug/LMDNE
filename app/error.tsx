"use client";

// Barrière d'erreur globale : si le rendu de la page échoue (ex. Supabase
// indisponible / timeout), au lieu d'un écran blanc on montre un message clair
// + bouton Réessayer. Le site ne "saute" plus.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: 24,
        textAlign: "center",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ fontSize: 40 }}>⚠️</div>
      <h2 style={{ margin: 0 }}>Connexion momentanément indisponible</h2>
      <p style={{ margin: 0, color: "#666", maxWidth: 360 }}>
        Le serveur n&apos;a pas répondu. Tes données sont en sécurité — réessaie
        dans un instant.
      </p>
      <button
        onClick={() => reset()}
        style={{
          padding: "12px 24px",
          fontSize: 16,
          fontWeight: 600,
          color: "#fff",
          background: "#2563eb",
          border: "none",
          borderRadius: 10,
          cursor: "pointer",
        }}
      >
        🔄 Réessayer
      </button>
    </div>
  );
}
