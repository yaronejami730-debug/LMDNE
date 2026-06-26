import { SkeletonList } from "./Skeleton";

// Fallback Suspense automatique de Next : affiché pendant que page.tsx (Server
// Component) récupère contacts + events. Remplace l'écran blanc par des
// placeholders animés -> chargement perçu fluide.
export default function Loading() {
  return (
    <div className="wrap">
      <header className="brand">
        <div className="brand-left">
          <div className="logo">LMNE</div>
          <div>
            <h1>Campagne 2026</h1>
            <p className="sub">CRM téléprospection — appel & relance WhatsApp</p>
          </div>
        </div>
      </header>

      <div className="stats">
        <div className="stat">
          <div className="skl skl-line lg" style={{ height: 22, width: "40%" }} />
          <div className="skl skl-line md" style={{ marginTop: 8 }} />
        </div>
        <div className="stat">
          <div className="skl skl-line lg" style={{ height: 22, width: "40%" }} />
          <div className="skl skl-line md" style={{ marginTop: 8 }} />
        </div>
        <div className="stat">
          <div className="skl skl-line lg" style={{ height: 22, width: "40%" }} />
          <div className="skl skl-line md" style={{ marginTop: 8 }} />
        </div>
        <div className="stat">
          <div className="skl skl-line lg" style={{ height: 22, width: "40%" }} />
          <div className="skl skl-line md" style={{ marginTop: 8 }} />
        </div>
      </div>

      <SkeletonList rows={6} />
    </div>
  );
}
