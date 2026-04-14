type ExportFormat = "csv" | "json" | "text";

function toCSV(data: unknown): string {
  if (Array.isArray(data) && data.length > 0 && typeof data[0] === "object") {
    const headers = Object.keys(data[0] as Record<string, unknown>);
    const rows = data.map((row) =>
      headers.map((h) => {
        const val = String((row as Record<string, unknown>)[h] ?? "");
        return `"${val.replace(/"/g, '""')}"`;
      }).join(",")
    );
    return [headers.map((h) => `"${h}"`).join(","), ...rows].join("\n");
  }
  // Fall back to JSON for non-tabular data
  return JSON.stringify(data, null, 2);
}

function toText(data: unknown): string {
  if (Array.isArray(data) && data.length > 0 && typeof data[0] === "object") {
    const headers = Object.keys(data[0] as Record<string, unknown>);
    const rows = data.map((row) =>
      headers.map((h) => String((row as Record<string, unknown>)[h] ?? "")).join("\t")
    );
    return [headers.join("\t"), ...rows].join("\n");
  }
  if (typeof data === "string") return data;
  return JSON.stringify(data, null, 2);
}

export function downloadAs(data: unknown, format: ExportFormat, filename: string): void {
  let content: string;
  let mimeType: string;
  let ext: string;

  switch (format) {
    case "csv":
      content = toCSV(data);
      mimeType = "text/csv";
      ext = "csv";
      break;
    case "text":
      content = toText(data);
      mimeType = "text/plain";
      ext = "txt";
      break;
    case "json":
    default:
      content = JSON.stringify(data, null, 2);
      mimeType = "application/json";
      ext = "json";
      break;
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.${ext}`;
  a.click();
  URL.revokeObjectURL(url);
}
