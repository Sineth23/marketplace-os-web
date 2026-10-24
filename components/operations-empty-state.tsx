import Link from "next/link";

/**
 * The state shown when a screen has no data to show.
 *
 * The wording is explicit that the screen is connected but empty, so an
 * operator can tell the difference between "nothing imported yet" and "the
 * connection is not working".
 */
export function OperationsEmptyState({
  title,
  description,
  importHref,
  importLabel,
}: {
  title: string;
  description: string;
  importHref: string;
  importLabel: string;
}) {
  return (
    <section className="operations-empty" aria-labelledby="operations-empty-title">
      <span className="section-icon" aria-hidden="true">
        ▦
      </span>
      <h2 id="operations-empty-title">{title}</h2>
      <p>{description}</p>
      <Link className="primary-button" href={importHref}>
        {importLabel}
      </Link>
    </section>
  );
}
