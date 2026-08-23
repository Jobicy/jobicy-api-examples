export default function Loading() {
  return (
    <main className="shell" aria-live="polite" aria-busy="true">
      <header className="masthead"><span className="masthead__name">The Remote Work Index</span></header>
      <section className="intro"><p className="intro__eyebrow">Fetching current openings</p><h1>Loading remote jobs…</h1></section>
      <div className="loading-list" aria-label="Loading job listings">
        {[1, 2, 3, 4].map((item) => <div key={item} className="loading-card" />)}
      </div>
    </main>
  );
}
