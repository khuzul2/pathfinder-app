/**
 * App shell — intentionally minimal. This is the scaffold the loop grows into the
 * full workspace (map canvas, sidebar, elevation card, bottom sheet) across Phases 2–5.
 * Keep the tree buildable and typechecked at every step.
 */
export function App() {
  return (
    <main className="flex h-full flex-col items-center justify-center bg-canvas-light text-slate-accent">
      <h1 className="font-heading text-2xl font-medium">Pathfinder</h1>
      <p className="mt-2 text-sm opacity-70">Topographic hiking planner — scaffold ready.</p>
    </main>
  );
}
