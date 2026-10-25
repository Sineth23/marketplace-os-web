import type { ReactNode } from "react";

/**
 * The shared table for the operations screens.
 *
 * Every operations screen shows the same kind of thing: a titled table of
 * records with a set of columns. This component holds the markup so the
 * screens only describe their own columns.
 */
export function OperationsTable({
  caption,
  headers,
  children,
}: {
  /** Describes the table for a screen reader. */
  caption: string;
  headers: readonly string[];
  children: ReactNode;
}) {
  return (
    <div className="inventory-table-wrap">
      <table className="inventory-table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header} scope="col">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
