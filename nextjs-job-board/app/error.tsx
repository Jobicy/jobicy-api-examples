"use client";

export default function ErrorState({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="shell">
      <header className="masthead"><a href="/" className="masthead__name">The Remote Work Index</a></header>
      <section className="error-state" role="alert">
        <p className="intro__eyebrow">The feed is temporarily unavailable</p>
        <h1>We could not load the latest jobs.</h1>
        <p>{error.message || "Please check your connection and try again."}</p>
        <button type="button" onClick={reset}>Try again</button>
        <a href="https://jobicy.com/jobs" target="_blank" rel="noopener noreferrer">Browse jobs directly on Jobicy</a>
      </section>
    </main>
  );
}
