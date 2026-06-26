// Skeletons réutilisables (placeholders animés pendant le chargement).
// Affichés via app/loading.tsx tant que le serveur récupère les données.

export function SkeletonRow() {
  return (
    <div className="skl-row" aria-hidden>
      <div className="skl-who">
        <div className="skl skl-line lg" />
        <div className="skl skl-line md" />
        <div className="skl skl-line sm" />
      </div>
      <div className="skl-actions">
        <div className="skl skl-btn" />
        <div className="skl skl-btn" />
        <div className="skl skl-btn" />
        <div className="skl skl-btn" />
      </div>
    </div>
  );
}

export function SkeletonList({ rows = 6 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Chargement des contacts">
      {Array.from({ length: rows }, (_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}
