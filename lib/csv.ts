/**
 * Shared CSV reading helpers for partner export files.
 *
 * Partner exports differ in column set and naming per screen, so every parser
 * declares the columns it requires and reports the ones it cannot map. Headers
 * are matched case-insensitively with punctuation removed, so "Purchase Order" and
 * "purchase_order" both resolve to "purchaseorder".
 */

/** A parsed CSV file: the header row plus the non-empty data rows. */
export type CsvTable = Readonly<{
  headers: readonly string[];
  rows: readonly (readonly string[])[];
}>;

/** Header key for a column, normalized for matching. */
export function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Parses CSV text into rows. Handles quoted fields, escaped quotes, embedded
 * commas and newlines, and both line ending styles.
 */
export function parseCsv(text: string): readonly (readonly string[])[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') quoted = false;
      else field += character;
    } else if (character === '"') quoted = true;
    else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else field += character;
  }
  if (quoted) throw new Error("The CSV has an unclosed quoted value.");
  if (field || row.length > 0) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows;
}

/** Parses CSV text into a header row and the non-empty data rows. */
export function parseCsvTable(text: string): CsvTable {
  const rows = parseCsv(text).filter((row) => row.some((value) => value.trim()));
  const headers = rows[0];
  if (!headers) throw new Error("The selected file is empty.");
  return { headers: headers.map((header) => header.trim()), rows: rows.slice(1) };
}

/** A header lookup for a parsed table. */
export type CsvColumns = Readonly<{
  /** The index of a column by normalized header name, when present. */
  index: (key: string) => number | undefined;
  /** The trimmed value of a column, or undefined when absent or blank. */
  read: (row: readonly string[], key: string) => string | undefined;
  /** The trimmed value of the first present column among several candidates. */
  readAny: (row: readonly string[], keys: readonly string[]) => string | undefined;
  /** The normalized header names present in the file. */
  present: () => readonly string[];
}>;

/** Builds a header lookup for a parsed table. */
export function csvColumns(headers: readonly string[]): CsvColumns {
  const indexes = new Map<string, number>();
  headers.forEach((header, index) => {
    const key = normalizeHeader(header);
    if (key && !indexes.has(key)) indexes.set(key, index);
  });
  const read = (row: readonly string[], key: string): string | undefined => {
    const index = indexes.get(key);
    if (index === undefined) return undefined;
    const value = row[index]?.trim();
    return value ? value : undefined;
  };
  return {
    index: (key) => indexes.get(key),
    read,
    readAny: (row, keys) => {
      for (const key of keys) {
        const value = read(row, key);
        if (value !== undefined) return value;
      }
      return undefined;
    },
    present: () => [...indexes.keys()],
  };
}

/**
 * Throws when a required column is absent. The message names the column using
 * the caller's display name so the operator sees the export's own wording.
 */
export function requireColumn(columns: CsvColumns, key: string, displayName: string): void {
  if (columns.index(key) === undefined) {
    throw new Error(`The CSV must include ${displayName}.`);
  }
}

/**
 * Returns the value of a column, treating the partner's placeholder values for
 * an absent value as missing. Partner exports use "N/A" and "NA" for that.
 */
export function presentValue(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (/^(?:n\/?a|not applicable|not available)$/i.test(trimmed)) return undefined;
  return trimmed;
}

/** Reads a column and normalizes the partner's absent-value placeholders. */
export function readPresent(columns: CsvColumns, row: readonly string[], key: string): string | undefined {
  return presentValue(columns.read(row, key));
}

/** Reads the first present column among candidates, normalizing placeholders. */
export function readAnyPresent(
  columns: CsvColumns,
  row: readonly string[],
  keys: readonly string[],
): string | undefined {
  for (const key of keys) {
    const value = readPresent(columns, row, key);
    if (value !== undefined) return value;
  }
  return undefined;
}

/**
 * Normalizes a price cell. Partner exports write prices as numeric strings
 * with currency symbols and thousands separators.
 */
export function readAmount(columns: CsvColumns, row: readonly string[], key: string): number | undefined {
  const raw = readPresent(columns, row, key);
  if (raw === undefined) return undefined;
  const numeric = Number(raw.replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(numeric) ? numeric : undefined;
}

/**
 * Normalizes a date cell to an ISO date when it can be parsed. Partner exports
 * write both "MM/DD/YY" and ISO timestamps.
 */
export function readDate(columns: CsvColumns, row: readonly string[], key: string): string | undefined {
  const raw = readPresent(columns, row, key);
  if (raw === undefined) return undefined;
  const slash = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(raw);
  const month = slash?.[1];
  const day = slash?.[2];
  const year = slash?.[3];
  if (month && day && year) {
    const full = year.length === 2 ? `20${year}` : year;
    return `${full}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  const parsed = Date.parse(raw);
  if (Number.isNaN(parsed)) return undefined;
  return new Date(parsed).toISOString();
}
