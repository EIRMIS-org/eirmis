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

function escapeCSVValue(value: CSVValue): string {
  const formattedValue = formatValue(value);

  if (/[",\r\n]/.test(formattedValue)) {
    return `"${formattedValue.replace(/"/g, '""')}"`;
  }

  return formattedValue;
}

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

  link.href = url;
  link.download = filename.toLowerCase().endsWith(".csv")
    ? filename
    : `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}