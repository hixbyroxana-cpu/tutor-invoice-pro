export const fmtMoney = (n: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n || 0);

export const fmtDate = (d: string | Date | null | undefined) => {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

export const slug = (s: string) =>
  s.trim().replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "");

export const padNum = (n: number, len = 4) => String(n).padStart(len, "0");
