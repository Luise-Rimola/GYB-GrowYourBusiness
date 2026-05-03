/**
 * Nimmt unter der Navigationsleiste den restlichen Hauptbereich ein; verhindert
 * zusätzliches Scrollen „um den Assistenten herum“ — scrollt nur der Iframe-Inhalt.
 */
export default function AssistantLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden md:mx-0 md:w-full max-md:-mx-6 max-md:w-[calc(100%+3rem)]">
      {children}
    </div>
  );
}
