"use client";

export function ReloadButton({ label = "Reload" }: { label?: string }) {
  return (
    <button className="primary-button" type="button" onClick={() => window.location.reload()}>
      {label}
    </button>
  );
}
