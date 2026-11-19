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
    (a, b) => b.level - a.level || b.startDate - a.startDate
  );
}
export function isToday(date, now = new Date()) {
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}
