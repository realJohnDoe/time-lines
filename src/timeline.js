export function parseDate(val) {
  if (!val) return null;
  if (typeof val === "number" && val > 999 && val < 3000) {
    // Unquoted year in YAML, e.g. 2023
    return new Date(val, 0, 1);
  }
  if (typeof val === "string") {
    const parts = val.trim().split("-");
    if (parts.length === 1 && /^\d{4}$/.test(parts[0])) {
      // Quoted year in YAML, e.g. "2023"
      return new Date(Number(parts[0]), 0, 1);
    }
    if (
      parts.length === 2 &&
      /^\d{4}$/.test(parts[0]) &&
      /^\d{1,2}$/.test(parts[1])
    ) {
      // Quoted year-month in YAML, e.g. "2023-07"
      return new Date(Number(parts[0]), Number(parts[1]) - 1, 1);
    }
    if (
      parts.length === 3 &&
      /^\d{4}$/.test(parts[0]) &&
      /^\d{1,2}$/.test(parts[1]) &&
      /^\d{1,2}$/.test(parts[2])
    ) {
      // Full date in YAML, e.g. 2023-08-01. js-yaml 5 loads it as a string
      // (YAML 1.2 core schema), so build a local date rather than UTC.
      return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    }
  }
  // Debug log for unsupported formats
  console.warn("[parseDate] Unsupported date format or value:", val);
  return null;
}

export function formatDate(date) {
  if (!date) return "";
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  return m === 1 ? `${y}` : `${y}-${String(m).padStart(2, "0")}`;
}
export function assignLevels(topics) {
  topics.sort((a, b) => a.startDate - b.startDate);
  const levels = [];
  for (const topic of topics) {
    let lvl = 0;
    while (true) {
      const conflict = levels[lvl]?.some(
        (t) =>
          !(
            topic.endDate <= t.startDate || topic.startDate >= t.endDate
          )
      );
      if (!conflict) break;
      lvl++;
    }
    if (!levels[lvl]) levels[lvl] = [];
    levels[lvl].push(topic);
    topic.level = lvl;
  }
  return topics.sort(
    (a, b) => b.level - a.level || a.startDate - b.startDate
  );
}
export function isToday(date, now = new Date()) {
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

const present = (v) => v != null && v !== "";

// Parse raw YAML topics into drawable ones plus a list of human-readable
// problems for the rest. An absent `end` means "now"; only present-but-
// unparsable values are reported.
export function validateTopics(raw, now = new Date()) {
  const topics = [];
  const problems = [];
  raw.forEach((t, i) => {
    const label = present(t?.name) ? `"${t.name}"` : `#${i + 1}`;
    const issues = [];
    if (t === null || typeof t !== "object") {
      problems.push(`Topic ${label}: not a mapping, skipped.`);
      return;
    }
    if (!present(t.name)) issues.push("missing name");
    const startDate = parseDate(t.start);
    if (!present(t.start)) issues.push("missing start");
    else if (!startDate) issues.push(`unsupported start ${JSON.stringify(t.start)}`);
    const endDate = present(t.end) ? parseDate(t.end) : now;
    if (!endDate) issues.push(`unsupported end ${JSON.stringify(t.end)}`);
    if (startDate && endDate && endDate < startDate)
      issues.push("end is before start");
    if (issues.length) problems.push(`Topic ${label}: ${issues.join(", ")}, skipped.`);
    else topics.push({ ...t, startDate, endDate });
  });
  return { topics, problems };
}

// Widen a zero-length span to one year so positions never divide by zero.
export function padSpan(minDate, maxDate) {
  const yearAfter = new Date(minDate);
  yearAfter.setFullYear(yearAfter.getFullYear() + 1);
  return maxDate < yearAfter ? yearAfter : maxDate;
}
