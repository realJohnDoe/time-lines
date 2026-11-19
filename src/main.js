import { load } from "js-yaml";
import "./style.css";
import { parseDate, formatDate, assignLevels, isToday } from "./timeline.js";

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[c]);
}

let zoomLevel = 1;
const minZoom = 1;
const maxZoom = 10;

function handleZoom(delta) {
  const oldZoom = zoomLevel;
  zoomLevel = Math.max(minZoom, Math.min(maxZoom, zoomLevel + delta));
  if (zoomLevel !== oldZoom) render();
}

document.getElementById("zoom-in").onclick = () => handleZoom(1);
document.getElementById("zoom-out").onclick = () => handleZoom(-1);

function renderTimeline(
  topics,
  minDate,
  maxDate,
  barHeight,
  barGap,
  xZoom,
  containerWidth
) {
  const maxLevel = Math.max(...topics.map((t) => t.level));
  const totalHeight = (maxLevel + 1) * (barHeight + barGap) + 48; // 48 for axis/labels padding

  // Responsive: inner timeline width is containerWidth * xZoom, min 800px
  const timelineWidth = Math.max(containerWidth * xZoom, 800);

  // Calculate year step to avoid label collision
  const totalYears = maxDate.getFullYear() - minDate.getFullYear() + 1;
  let yearStep = 1;
  if (totalYears / xZoom > 12) yearStep = 2;
  if (totalYears / xZoom > 24) yearStep = 5;
  if (totalYears / xZoom > 60) yearStep = 10;

  // Build year ticks (every yearStep years)
  const years = [];
  for (
    let y = minDate.getFullYear();
    y <= maxDate.getFullYear();
    y += yearStep
  )
    years.push(y);

  function dateToX(date) {
    return (
      ((date - minDate) / (maxDate - minDate)) * (timelineWidth - 80) +
      60
    );
  }

  // Start/end edge of a bar: a solid 2px line in the bar's colour, or a fade when fuzzy.
  const edgeClass = { left: "left-0", right: "right-0" };
  const cap = (edge, fuzzy, color) =>
    fuzzy
      ? `<span class="absolute ${edgeClass[edge]} -top-[5%] h-[110%] w-2.5 rounded-[2px] ${
          edge === "left"
            ? "bg-[linear-gradient(to_right,rgba(255,255,255,0.8),transparent)]"
            : "bg-[linear-gradient(to_left,rgba(255,255,255,0.8),transparent)]"
        }"></span>`
      : `<span class="absolute ${edgeClass[edge]} -top-[5%] h-[110%] w-0.5 rounded-[2px] ${color}"></span>`;

  // One row of year labels, pinned to the top or bottom edge (`pos`).
  const yearRow = (pos) => `
    <div class="absolute left-0 w-full ${pos} h-8 pointer-events-none">
      ${years
        .map(
          (year) =>
            `<span class="absolute ${pos} -translate-x-1/2 w-[50px] text-center whitespace-nowrap text-[12px] text-[#888] bg-white/80 z-[5]" style="left:${dateToX(new Date(year, 0, 1))}px;">${year}</span>`
        )
        .join("")}
    </div>`;

  return `
  <div class="relative h-full" style="width:${timelineWidth}px; min-height:${totalHeight}px;">
    <!-- Year Grid Lines -->
    <div class="absolute left-0 top-0 w-full h-full pointer-events-none z-0">
      ${years
        .map(
          (year) =>
            `<div class="absolute top-0 h-full w-px border-l border-gray-200" style="left:${dateToX(new Date(year, 0, 1))}px;"></div>`
        )
        .join("")}
    </div>
    <!-- Bars, bottom-aligned -->
    ${topics
      .map((topic) => {
        const x1 = dateToX(topic.startDate);
        const x2 = dateToX(topic.endDate);
        // Bars stack upwards from the bottom
        const y = 32 + topic.level * (barHeight + barGap);
        const color = topic.tags?.includes("Who?")
          ? "bg-yellow-500"
          : topic.tags?.includes("Where?")
          ? "bg-green-700"
          : topic.tags?.includes("What?")
          ? "bg-blue-700"
          : "bg-gray-400";
        const tooltip = [
          topic.name,
          `(${formatDate(topic.startDate)} → ${formatDate(topic.endDate)})`,
          ...(topic.tags || []),
        ].join(" | ");
        return `
<div class="absolute flex items-center shadow-xs ${color} text-white text-sm py-2 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black z-10"
    tabindex="0" role="group" aria-label="${escapeHtml(tooltip)}"
    style="left:${x1}px; bottom:${y}px; width:${x2 - x1}px; height:${barHeight - 8}px;"
    title="${escapeHtml(tooltip)}">
    ${cap("left", topic.tags?.includes("fuzzy-start"), color)}
    ${cap("right", topic.tags?.includes("fuzzy-end") || isToday(topic.endDate), color)}
    <span class="w-full text-center font-semibold overflow-hidden whitespace-nowrap text-ellipsis">
      ${escapeHtml(topic.name)}
    </span>
</div>
`;
      })
      .join("")}
    <!-- Year Labels at Top -->
    ${yearRow("top-0")}
    <!-- Year Labels at Bottom -->
    ${yearRow("bottom-0")}
  </div>
`;
}

function render() {
  const yamlText = document.getElementById("yaml-input").value;
  let data;
  try {
    data = load(yamlText);
  } catch (e) {
    document.getElementById(
      "timeline"
    ).innerHTML = `<div class="text-red-600">YAML Parse Error: ${escapeHtml(e.message)}</div>`;
    return;
  }
  if (!data || !Array.isArray(data.topics)) {
    document.getElementById(
      "timeline"
    ).innerHTML = `<div class="text-red-600">No topics found in YAML.</div>`;
    return;
  }
  // Use current date if end is missing
  const topics = data.topics
    .map((t) => ({
      ...t,
      startDate: parseDate(t.start),
      endDate: t.end ? parseDate(t.end) : new Date(),
    }))
    .filter((t) => t.startDate && t.endDate);
  if (!topics.length) {
    document.getElementById(
      "timeline"
    ).innerHTML = `<div class="text-red-600">No valid topics with start and end dates.</div>`;
    return;
  }
  const minDate = new Date(Math.min(...topics.map((t) => t.startDate)));
  const maxDate = new Date(Math.max(...topics.map((t) => t.endDate)));
  assignLevels(topics);
  const barHeight = 36;
  const barGap = 2;
  const xZoom = zoomLevel;

  // Responsive: get the width of the timeline container (full screen width)
  const containerWidth =
    document.getElementById("timeline-wrapper").clientWidth ||
    window.innerWidth;

  document.getElementById("timeline").innerHTML = renderTimeline(
    topics,
    minDate,
    maxDate,
    barHeight,
    barGap,
    xZoom,
    containerWidth
  );
}

document.getElementById("render-btn").onclick = render;

window.addEventListener("resize", render);

// Example YAML for convenience
fetch(`${import.meta.env.BASE_URL}example.yml`)
  .then((response) => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.text();
  })
  .then((yamlText) => {
    document.getElementById("yaml-input").value = yamlText;
    // Initial render
    render();
  })
  .catch((e) => {
    console.error("Error fetching example.yml:", e);
    document.getElementById("yaml-input").placeholder =
      "Could not load example.yml. Please paste your YAML here...";
    // Initial render, to show the empty state or error
    render();
  });
