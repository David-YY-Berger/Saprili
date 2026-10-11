// bisiyata dishmaya, leharbot ahava biyisral
import { describe, expect, it } from 'vitest';
import fixtureJson from '../../docs/hebrew-date-fixtures.json?raw';
import {
  formatHebrewDate,
  getHebrewDateParts,
  HEBREW_MONTH_NAMES,
  isHebrewLeapYear,
} from './hebrewDate';

interface DateFixture {
  isoDate: string;
  day: number;
  monthKey: keyof typeof HEBREW_MONTH_NAMES;
  year: number;
}

const fixtures = JSON.parse(fixtureJson) as DateFixture[];

describe('Hebrew dates', () => {
  it.each(fixtures)('converts $isoDate using the fixture table', (fixture) => {
    const date = new Date(`${fixture.isoDate}T12:00:00Z`);
    expect(getHebrewDateParts(date)).toEqual({
      day: fixture.day,
      monthKey: fixture.monthKey,
      year: fixture.year,
    });
  });

  it('uses the approved month spelling and Hebrew day lettering', () => {
    expect(HEBREW_MONTH_NAMES.heshvan).toBe('מרחשוון');
    expect(formatHebrewDate(new Date('2024-04-23T12:00:00Z'))).toBe('ט״ו ניסן 5784');
    expect(formatHebrewDate(new Date('2024-04-23T12:00:00Z'), { dayFormat: 'numerals' })).toBe(
      '15 ניסן 5784',
    );
  });

  it('identifies leap years in the 19-year cycle', () => {
    expect(isHebrewLeapYear(5784)).toBe(true);
    expect(isHebrewLeapYear(5785)).toBe(false);
  });

  it('rejects invalid dates', () => {
    expect(() => getHebrewDateParts(new Date(Number.NaN))).toThrow(RangeError);
  });
});
