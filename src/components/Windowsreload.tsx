"use client";

export function DashboardButton() {
  const handleClick = () => {
    if (window.parent !== window) {
      // im iframe
      window.parent.postMessage(
        { type: "assistant-reload" },
        window.location.origin
      );
    } else {
      // normal
      window.location.href = "/artifacts";
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="rounded-xl border px-4 py-2 text-xs font-semibold"
    >
      Zurück zu allen Artefakten    </button>
  );
}