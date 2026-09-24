export type ProductVariation = Readonly<{
  id: string;
  sku: string;
  manufacturer: string;
  model: string;
  variant: string;
  network: string;
  capacity: string;
  color: string;
  grade: string;
  damages: string;
  weight: string;
  weightUnit: string;
}>;

function parseCsv(text: string): readonly string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        value += '"';
        index += 1;
      } else if (character === '"') quoted = false;
      else value += character;
    } else if (character === '"') quoted = true;
    else if (character === ",") {
      record.push(value);
      value = "";
    } else if (character === "\n") {
      record.push(value.replace(/\r$/, ""));
      records.push(record);
      record = [];
      value = "";
    } else value += character;
  }

  if (quoted) throw new Error("The CSV has an unclosed quoted value.");
  if (value || record.length > 0) {
    record.push(value.replace(/\r$/, ""));
    records.push(record);
  }
  return records.filter((row) => row.some((cell) => cell.trim()));
}

function normalizeHeader(value: string): string {
  return value
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function parseProductCatalogCsv(text: string): readonly ProductVariation[] {
  const [headerRow, ...rows] = parseCsv(text);
  if (!headerRow) throw new Error("The product catalog CSV is empty.");

  const headers = new Map(headerRow.map((header, index) => [normalizeHeader(header), index]));
  if (!headers.has("id")) throw new Error("The CSV must include an ID column.");

  const value = (row: readonly string[], header: string): string =>
    row[headers.get(header) ?? -1]?.trim() ?? "";

  const variations = rows.map((row) => ({
    id: value(row, "id"),
    sku: value(row, "sku"),
    manufacturer: value(row, "manufacturer"),
    model: value(row, "model"),
    variant: value(row, "variant"),
    network: value(row, "network"),
    capacity: value(row, "capacity"),
    color: value(row, "color"),
    grade: value(row, "grade"),
    damages: value(row, "damages"),
    weight: value(row, "weight"),
    weightUnit: value(row, "weightunit"),
  }));

  if (variations.length === 0) throw new Error("No product variation rows were found.");
  if (variations.length > 10_000) throw new Error("A product catalog can contain up to 10,000 rows.");
  if (variations.some((variation) => !variation.id))
    throw new Error("Every product variation must have an ID.");
  return variations.sort((a, b) => Number(b.id) - Number(a.id));
}
