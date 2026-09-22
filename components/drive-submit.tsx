"use client";
import { useFormStatus } from "react-dom";
export function DriveSubmit({
  children,
  pendingText = "Working…",
}: {
  children: React.ReactNode;
  pendingText?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button className="primary-button" type="submit" disabled={pending}>
      {pending ? pendingText : children}
    </button>
  );
}
