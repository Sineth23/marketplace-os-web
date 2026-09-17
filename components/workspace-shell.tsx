import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "./icon";

const upcoming = [
  { label: "Inventory", icon: "box" },
  { label: "Photo library", icon: "photos" },
  { label: "Review", icon: "check" },
] as const;

export function WorkspaceShell({
  children,
  organizationName,
}: {
  children: ReactNode;
  organizationName?: string | undefined;
}) {
  return (
    <div className="workspace-shell">
      <aside className="sidebar">
        <Link className="brand" href="/" aria-label="Marketplace OS home">
          <span className="brand-mark" aria-hidden="true">
            m<span>.</span>
          </span>
          <span>
            marketplace<span className="brand-suffix">OS</span>
          </span>
        </Link>
        <div className="workspace-identity">
          <span className="workspace-avatar" aria-hidden="true">
            <Icon name="box" />
          </span>
          <div>
            <strong>{organizationName ?? "Your workspace"}</strong>
            <span>{organizationName ? "Organization workspace" : "Preview edition"}</span>
          </div>
          <span className="identity-dot" aria-hidden="true" />
        </div>
        <nav aria-label="Main navigation">
          <p className="eyebrow nav-label">Workspace</p>
          <Link className="nav-item active" href="/dashboard" aria-current="page">
            <Icon name="overview" />
            Overview
          </Link>
          {upcoming.map((item) => (
            <span className="nav-item unavailable" key={item.label} aria-disabled="true">
              <Icon name={item.icon} />
              {item.label}
              <span className="soon">Soon</span>
            </span>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="workspace-note">
            <span className="small-spark" aria-hidden="true">
              ✳
            </span>
            <strong>Built for a second life.</strong>
            <p>
              A little less busywork.
              <br />A lot more possibility.
            </p>
          </div>
          <span className="sidebar-caption">A workspace for resellers</span>
        </div>
      </aside>
      <div className="workspace-body">
        <header className="topbar">
          <span>
            Workspace <span className="breadcrumb-divider">/</span>{" "}
            <strong>{organizationName ?? "Overview"}</strong>
          </span>
          <span className="preview-label">
            <span aria-hidden="true" />
            Workspace preview
          </span>
        </header>
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        <footer className="page-footer">
          <span>Marketplace OS</span>
          <span>Good products deserve another chapter.</span>
        </footer>
      </div>
    </div>
  );
}
