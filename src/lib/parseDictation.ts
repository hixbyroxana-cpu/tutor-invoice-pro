// Parse a spoken invoice description into student name + lesson entries.
// Example: "I taught Emily on Monday and Wednesday, one hour each at £45"

const DAY_NAMES: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
};

const NUMBER_WORDS: Record<string, number> = {
  half: 0.5, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  "an": 1, "a": 1, quarter: 0.25,
};

export type ParsedDictation = {
  studentName?: string;
  dates: string[]; // YYYY-MM-DD
  duration?: number;
  hourlyRate?: number;
};

function mostRecentOrThisWeek(dayIdx: number): string {
  // Return the date for the given weekday within the current week (Mon-Sun),
  // preferring the most recent past occurrence if it's already passed.
  const now = new Date();
  const today = now.getDay();
  let diff = dayIdx - today;
  if (diff > 0) diff -= 7; // most recent past occurrence
  const d = new Date(now);
  d.setDate(now.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export function parseDictation(text: string): ParsedDictation {
  const t = text.toLowerCase();
  const result: ParsedDictation = { dates: [] };

  // Student name — after "taught", "tutored", "with", "for"
  const nameMatch = text.match(/\b(?:taught|tutored|with|for)\s+([A-Z][a-zA-Z'-]+(?:\s+[A-Z][a-zA-Z'-]+)?)/);
  if (nameMatch) result.studentName = nameMatch[1].trim();

  // Days of week → dates
  const seen = new Set<string>();
  for (const [name, idx] of Object.entries(DAY_NAMES)) {
    if (new RegExp(`\\b${name}\\b`).test(t)) {
      const date = mostRecentOrThisWeek(idx);
      if (!seen.has(date)) { seen.add(date); result.dates.push(date); }
    }
  }
  // Explicit ISO dates
  const isoMatches = t.match(/\b\d{4}-\d{2}-\d{2}\b/g);
  if (isoMatches) for (const d of isoMatches) if (!seen.has(d)) { seen.add(d); result.dates.push(d); }

  // Duration — "1 hour", "1.5 hours", "one hour", "90 minutes"
  const hoursDigit = t.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b/);
  const minsDigit = t.match(/(\d+)\s*(?:minutes?|mins?)\b/);
  const hoursWord = t.match(/\b(half|quarter|one|two|three|four|five|six|seven|eight|nine|ten|an|a)\s+(?:and\s+a\s+(half|quarter)\s+)?hours?\b/);
  if (hoursDigit) result.duration = parseFloat(hoursDigit[1]);
  else if (minsDigit) result.duration = parseInt(minsDigit[1], 10) / 60;
  else if (hoursWord) {
    let dur = NUMBER_WORDS[hoursWord[1]] ?? 1;
    if (hoursWord[2]) dur += NUMBER_WORDS[hoursWord[2]] ?? 0;
    result.duration = dur;
  }

  // Rate — "£45", "$45", "45 pounds", "at 45"
  const rateMatch =
    t.match(/[£$€]\s*(\d+(?:\.\d+)?)/) ||
    t.match(/(\d+(?:\.\d+)?)\s*(?:pounds?|gbp|quid|dollars?|usd|euros?|eur)\b/) ||
    t.match(/\bat\s+(\d+(?:\.\d+)?)\b/);
  if (rateMatch) result.hourlyRate = parseFloat(rateMatch[1]);

  return result;
}
