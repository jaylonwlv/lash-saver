"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="text-brand min-h-11 text-sm font-medium"
    >
      Print or save as PDF
    </button>
  );
}
