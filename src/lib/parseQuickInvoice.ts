// Parse strings like "John Smith: 6 May, 13 May, 20 May 2026, 27/05"
export type ParsedQuick = { name: string; dates: Date[] };

const monthMap: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11,
};

function parseOneDate(token: string, fallbackYear: number): Date | null {
  const t = token.trim().toLowerCase();
  if (!t) return null;
  // dd/mm or dd/mm/yyyy
  const slash = t.match(/^(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?$/);
  if (slash) {
    const day = +slash[1], month = +slash[2] - 1;
    let year = slash[3] ? +slash[3] : fallbackYear;
    if (year < 100) year += 2000;
    return new Date(year, month, day);
  }
  // "6 May" / "6 May 2026" / "May 6"
  const m1 = t.match(/^(\d{1,2})\s+([a-z]+)(?:\s+(\d{4}))?$/);
  if (m1 && monthMap[m1[2]] !== undefined) {
    return new Date(m1[3] ? +m1[3] : fallbackYear, monthMap[m1[2]], +m1[1]);
  }
  const m2 = t.match(/^([a-z]+)\s+(\d{1,2})(?:,?\s+(\d{4}))?$/);
  if (m2 && monthMap[m2[1]] !== undefined) {
    return new Date(m2[3] ? +m2[3] : fallbackYear, monthMap[m2[1]], +m2[2]);
  }
  return null;
}

export function parseQuickInvoice(input: string): ParsedQuick | null {
  const idx = input.indexOf(":");
  if (idx < 0) return null;
  const name = input.slice(0, idx).trim();
  const rest = input.slice(idx + 1);
  const year = new Date().getFullYear();
  const dates = rest
    .split(/[,;]+/)
    .map((s) => parseOneDate(s, year))
    .filter((d): d is Date => !!d && !isNaN(d.getTime()));
  if (!name || dates.length === 0) return null;
  return { name, dates };
}
