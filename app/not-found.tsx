import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="not-found" tabIndex={-1}>
      <p className="eyebrow">404 / A little off track</p>
      <h1>This page isn’t on the shelf.</h1>
      <p>Head back to the workspace to find your way.</p>
      <Link className="primary-link" href="/">
        Back to overview <span aria-hidden="true">↗</span>
      </Link>
    </main>
  );
}
