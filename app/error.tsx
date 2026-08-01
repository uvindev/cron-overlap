"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="route-error">
      <p className="eyebrow">SIMULATION INTERRUPTED</p>
      <h1>The planner could not render this state.</h1>
      <p>Reload the local workbench. Manifest contents are not stored.</p>
      <button type="button" onClick={reset}>
        Reload planner
      </button>
    </main>
  );
}
