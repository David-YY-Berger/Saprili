// bisiyata dishmaya, leharbot ahava biyisral

export const HEBREW_MONTH_NAMES = {
  tishri: 'תשרי',
  heshvan: 'מרחשוון',
  kislev: 'כסלו',
  tevet: 'טבת',
  shevat: 'שבט',
  adar: 'אדר',
  adarI: 'אדר א׳',
  adarII: 'אדר ב׳',
  nisan: 'ניסן',
  iyar: 'אייר',
  sivan: 'סיוון',
  tamuz: 'תמוז',
  av: 'אב',
  elul: 'אלול',
} as const;

export type HebrewMonthKey = keyof typeof HEBREW_MONTH_NAMES;

export interface HebrewDateParts {
  day: number;
  monthKey: HebrewMonthKey;
  year: number;
}

const MONTH_KEYS: Readonly<Record<string, HebrewMonthKey>> = {
  tishri: 'tishri',
  heshvan: 'heshvan',
  cheshvan: 'heshvan',
  kislev: 'kislev',
  tevet: 'tevet',
  shevat: 'shevat',
  adar: 'adar',
  'adar i': 'adarI',
  'adar 1': 'adarI',
  'adar ii': 'adarII',
  'adar 2': 'adarII',
  nisan: 'nisan',
  nissan: 'nisan',
  iyar: 'iyar',
  iyyar: 'iyar',
  sivan: 'sivan',
  tamuz: 'tamuz',
  tammuz: 'tamuz',
  av: 'av',
  elul: 'elul',
};

const HEBREW_CALENDAR_FORMATTER = new Intl.DateTimeFormat(
  'en-u-ca-hebrew-nu-latn',
  {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  },
);

export function getHebrewDateParts(date: Date): HebrewDateParts {
  if (!Number.isFinite(date.getTime())) throw new RangeError('A valid date is required.');
  const parts = HEBREW_CALENDAR_FORMATTER.formatToParts(date);
  const day = Number(parts.find((part) => part.type === 'day')?.value);
  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = parts.find((part) => part.type === 'month')?.value.toLowerCase();
  const monthKey = month ? MONTH_KEYS[month] : undefined;
  if (!Number.isInteger(day) || !Number.isInteger(year) || !monthKey) {
    throw new RangeError('The browser returned an unsupported Hebrew calendar date.');
  }
  return { day, monthKey, year };
}

export function isHebrewLeapYear(year: number): boolean {
  if (!Number.isInteger(year) || year < 1) throw new RangeError('A positive Hebrew year is required.');
  return ((year * 7 + 1) % 19) < 7;
}

function formatHebrewDay(day: number): string {
  const values: readonly [number, string][] = [
    [400, 'ת'],
    [300, 'ש'],
    [200, 'ר'],
    [100, 'ק'],
    [90, 'צ'],
    [80, 'פ'],
    [70, 'ע'],
    [60, 'ס'],
    [50, 'נ'],
    [40, 'מ'],
    [30, 'ל'],
    [20, 'כ'],
    [10, 'י'],
    [9, 'ט'],
    [8, 'ח'],
    [7, 'ז'],
    [6, 'ו'],
    [5, 'ה'],
    [4, 'ד'],
    [3, 'ג'],
    [2, 'ב'],
    [1, 'א'],
  ];
  if (!Number.isInteger(day) || day < 1 || day > 30) {
    throw new RangeError('A Hebrew day must be between 1 and 30.');
  }
  if (day === 15) return 'ט״ו';
  if (day === 16) return 'ט״ז';
  let remainder = day;
  let letters = '';
  for (const [value, letter] of values) {
    while (remainder >= value) {
      letters += letter;
      remainder -= value;
    }
  }
  return letters.length === 1
    ? `${letters}׳`
    : `${letters.slice(0, -1)}״${letters.slice(-1)}`;
}

export function formatHebrewDate(
  date: Date,
  options: { dayFormat?: 'letters' | 'numerals' } = {},
): string {
  const parts = getHebrewDateParts(date);
  const day = options.dayFormat === 'numerals' ? String(parts.day) : formatHebrewDay(parts.day);
  return `${day} ${HEBREW_MONTH_NAMES[parts.monthKey]} ${parts.year}`;
}
