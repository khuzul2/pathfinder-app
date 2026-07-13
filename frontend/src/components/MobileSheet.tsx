import { Drawer } from 'vaul';
import { Sidebar } from './Sidebar';

/**
 * Mobile-only swipe-up sheet (Vaul) holding the full planning workspace. Hidden on desktop
 * (`md:hidden`), where the sidebar is shown instead. Vaul provides the drag handle +
 * swipe-to-dismiss; the map stays interactive underneath.
 */
export function MobileSheet() {
  return (
    <Drawer.Root>
      <Drawer.Trigger asChild>
        <button
          type="button"
          className="fixed bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-full bg-trail-green px-5 py-2 text-sm font-medium text-white shadow-fab md:hidden"
        >
          Plan route ▲
        </button>
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-30 bg-black/40" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-40 flex h-[82vh] flex-col rounded-t-2xl bg-canvas-light dark:bg-canvas-dark md:hidden">
          <Drawer.Title className="sr-only">Plan a route</Drawer.Title>
          <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-neutral-300 dark:bg-neutral-600" />
          <Sidebar />
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
