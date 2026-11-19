import test from "node:test";
import assert from "node:assert/strict";
import { parseDate, formatDate, assignLevels, isToday } from "./timeline.js";

const ymd = (d) => [d.getFullYear(), d.getMonth() + 1, d.getDate()];

test("parseDate handles years, months and days in local time", () => {
  assert.deepEqual(ymd(parseDate(2023)), [2023, 1, 1]);
  assert.deepEqual(ymd(parseDate("2023")), [2023, 1, 1]);
  assert.deepEqual(ymd(parseDate("2023-07")), [2023, 7, 1]);
  assert.deepEqual(ymd(parseDate("2023-7")), [2023, 7, 1]);
  assert.deepEqual(ymd(parseDate("2023-08-01")), [2023, 8, 1]);
  assert.deepEqual(ymd(parseDate("2023-08-15")), [2023, 8, 15]);
});

test("parseDate returns null for unsupported input", (t) => {
  t.mock.method(console, "warn", () => {});
  assert.equal(parseDate(undefined), null);
  assert.equal(parseDate("soon"), null);
  assert.equal(parseDate("2023-13-01-05"), null);
});

test("formatDate omits January's month", () => {
  assert.equal(formatDate(new Date(2023, 0, 1)), "2023");
  assert.equal(formatDate(new Date(2023, 6, 1)), "2023-07");
  assert.equal(formatDate(null), "");
});

const topic = (name, s, e) => ({ name, startDate: new Date(s, 0, 1), endDate: new Date(e, 0, 1) });
const levels = (ts) => Object.fromEntries(ts.map((t) => [t.name, t.level]));

test("assignLevels separates overlapping topics", () => {
  const ts = assignLevels([topic("a", 2000, 2010), topic("b", 2005, 2015)]);
  assert.deepEqual(levels(ts), { a: 0, b: 1 });
});

test("assignLevels lets touching topics share a level", () => {
  const ts = assignLevels([topic("a", 2000, 2010), topic("b", 2010, 2020)]);
  assert.deepEqual(levels(ts), { a: 0, b: 0 });
});

test("assignLevels stacks nested topics", () => {
  const ts = assignLevels([topic("outer", 2000, 2020), topic("inner", 2005, 2010)]);
  assert.deepEqual(levels(ts), { outer: 0, inner: 1 });
});

test("isToday compares against the given now", () => {
  const now = new Date(2024, 4, 10, 12);
  assert.equal(isToday(new Date(2024, 4, 10, 1), now), true);
  assert.equal(isToday(new Date(2024, 4, 11), now), false);
});

test("assignLevels orders rows top-down and each row chronologically", () => {
  const ts = assignLevels([
    topic("late", 2010, 2012),
    topic("outer", 2000, 2020),
    topic("early", 2001, 2003),
    topic("mid", 2005, 2007),
  ]);
  assert.deepEqual(ts.map((t) => t.name), ["early", "mid", "late", "outer"]);
});
