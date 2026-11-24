// Statistics from GET /api/stats
export default function StatsPanel({ stats, error }) {
  return (
    <section className="panel stats">
      <h2>Statistics</h2>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {!error && !stats && <p className="muted">Loading statistics…</p>}
      {!error && stats && (
        <>
          <dl>
            <dt>Total</dt>
            <dd>{stats.total}</dd>
            <dt>Read</dt>
            <dd>{stats.read}</dd>
            <dt>Unread</dt>
            <dd>{stats.unread}</dd>
            <dt>Average rating</dt>
            <dd>{stats.averageRating ?? '—'}</dd>
          </dl>
          <h3>By genre</h3>
          <ul>
            {Object.entries(stats.byGenre).map(([genre, count]) => (
              <li key={genre}>
                {genre}: {count}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}