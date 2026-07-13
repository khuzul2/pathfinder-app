import { Drawer } from 'vaul';
import { useAppStore } from '../state/store';
import { RoutePanel } from './RoutePanel';

/**
 * Mobile-only swipe-up bottom sheet (Vaul) holding the route workspace. Hidden on desktop
 * (`md:hidden`), where the floating panels are shown instead. Only appears once a route
 * exists. Vaul provides the drag handle + swipe-to-dismiss; the map stays interactive.
 */
export function MobileSheet() {
  const route = useAppStore((s) => s.route);
  if (!route) return null;

  return (
    <Drawer.Root>
      <Drawer.Trigger asChild>
        <button
          type="button"
          className="fixed bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-full bg-white px-5 py-2 text-sm font-medium text-slate-accent shadow-fab dark:bg-neutral-800 dark:text-neutral-100 md:hidden"
        >
          Route details ▲
        </button>
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-30 bg-black/40" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-40 flex max-h-[85vh] flex-col rounded-t-2xl bg-canvas-light p-4 dark:bg-canvas-dark md:hidden">
          <Drawer.Title className="sr-only">Route details</Drawer.Title>
          <div className="mx-auto mb-3 h-1.5 w-10 shrink-0 rounded-full bg-neutral-300 dark:bg-neutral-600" />
          <div className="overflow-y-auto">
            <RoutePanel />
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
