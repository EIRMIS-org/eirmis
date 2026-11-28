type CSVValue = string | number | boolean | Date | null | undefined;

function formatValue(value: CSVValue): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value);
}

const FORMULA_PREFIX_RE = /^[=+\-@\t\r]/;

function escapeCSVValue(value: CSVValue): string {
  const formattedValue = formatValue(value);
  const safeValue = FORMULA_PREFIX_RE.test(formattedValue)
    ? `'${formattedValue}`
    : formattedValue;

  if (/[",\r\n]/.test(safeValue)) {
    return `"${safeValue.replace(/"/g, '""')}"`;
  }

  return safeValue;
}

/**
 * Triggers a browser download of a UTF-8 CSV file.
 *
 * Retained for the planned Organizer portal CSV export flows
 * (event list and attendance report exports).
 */
export function downloadCSV(
  filename: string,
  headers: readonly CSVValue[],
  rows: readonly (readonly CSVValue[])[],
): void {
  const csv = [headers, ...rows]
    .map((row) => row.map(escapeCSVValue).join(","))
    .join("\r\n");
  const blob = new Blob([`${csv}\r\n`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  const stamp = new Date().toISOString().slice(0,10);

  link.href = url;
  link.download = `${filename.replace(/\.csv$/i, "")}-${stamp}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
