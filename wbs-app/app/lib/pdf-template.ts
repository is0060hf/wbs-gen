import { Project, WBSTask } from './types';

const DURATION_THRESHOLD = 60;
const DAYS_PER_PAGE = 60;

interface FlatTask extends WBSTask {
  level: number;
}

function flattenTasksWithLevel(tasks: WBSTask[], level = 0): FlatTask[] {
  const result: FlatTask[] = [];
  for (const task of tasks) {
    result.push({ ...task, level });
    if (task.children) {
      result.push(...flattenTasksWithLevel(task.children, level + 1));
    }
  }
  return result;
}

function calculateEndDate(start: string, duration: number): string {
  const startDate = new Date(start);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + Math.ceil(duration) - 1);
  return endDate.toISOString().split('T')[0];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function getPriorityColor(priority: string): { bg: string; text: string; bar: string } {
  switch (priority) {
    case 'Must':
      return { bg: '#fee2e2', text: '#b91c1c', bar: '#ef4444' };
    case 'Should':
      return { bg: '#fef9c3', text: '#a16207', bar: '#eab308' };
    case 'Could':
      return { bg: '#dcfce7', text: '#15803d', bar: '#22c55e' };
    case "Won't":
      return { bg: '#f3f4f6', text: '#374151', bar: '#9ca3af' };
    default:
      return { bg: '#dbeafe', text: '#1d4ed8', bar: '#3b82f6' };
  }
}

function isParentTask(task: WBSTask): boolean {
  return !!(task.children && task.children.length > 0);
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function getDayOfWeekLabel(date: Date): string {
  return ['日', '月', '火', '水', '木', '金', '土'][date.getDay()] || '';
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------------------
// Table HTML
// ---------------------------------------------------------------------------

function generateTableHTML(project: Project, flatTasks: FlatTask[]): string {
  const rows = flatTasks.map(task => {
    const priority = getPriorityColor(task.priority);
    const isParent = isParentTask(task);
    const indent = task.level * 20;
    const end = task.end || (task.duration_days ? calculateEndDate(task.start, task.duration_days) : task.start);

    const nameCell = isParent
      ? `<span style="font-weight:700;color:#1e3a5f">${escapeHtml(task.name)}</span>`
      : escapeHtml(task.name);

    const depsCell = task.dependencies && task.dependencies.length > 0
      ? task.dependencies.join(', ')
      : '';

    const durationCell = task.buffer != null
      ? `buf ${task.buffer}d`
      : `${task.duration_days}d`;

    const rowBg = isParent ? 'background:#eef4fb;' : task.level > 0 ? 'background:#f8fafd;' : '';

    return `<tr style="${rowBg}">
      <td class="c">${escapeHtml(task.wbs_code)}</td>
      <td style="padding-left:${indent + 8}px">${nameCell}</td>
      <td class="c"><span class="badge" style="background:${priority.bg};color:${priority.text}">${task.priority}</span></td>
      <td class="c">${formatShortDate(task.start)}</td>
      <td class="c">${formatShortDate(end)}</td>
      <td class="c">${durationCell}</td>
      <td class="c">${escapeHtml(task.assignee || '')}</td>
      <td class="c" style="font-size:10px">${escapeHtml(depsCell)}</td>
    </tr>`;
  }).join('\n');

  return `
    <div class="section-title">WBS 一覧</div>
    <table>
      <thead>
        <tr>
          <th style="width:60px">WBS</th>
          <th style="min-width:200px">タスク名</th>
          <th style="width:60px">優先度</th>
          <th style="width:70px">開始</th>
          <th style="width:70px">終了</th>
          <th style="width:50px">期間</th>
          <th style="width:100px">担当者</th>
          <th style="width:90px">依存</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

// ---------------------------------------------------------------------------
// Gantt Chart – shared helpers
// ---------------------------------------------------------------------------

const GANTT = {
  TITLE_HEIGHT: 32,
  ROW_HEIGHT: 28,
  LABEL_WIDTH: 260,
  DAY_WIDTH: 32,
  HEADER_HEIGHT: 44,
  BAR_HEIGHT: 16,
  BAR_Y_OFFSET: 6,
};

const A3_PRINTABLE_HEIGHT = 920;
const LEGEND_FOOTER_HEIGHT = 50;

function calcRowMetrics(numTasks: number) {
  const available = A3_PRINTABLE_HEIGHT - GANTT.TITLE_HEIGHT - GANTT.HEADER_HEIGHT - LEGEND_FOOTER_HEIGHT;
  const rowH = Math.min(GANTT.ROW_HEIGHT, Math.max(8, Math.floor(available / numTasks)));
  const barH = Math.max(6, Math.round(rowH * 0.57));
  const barOff = Math.round((rowH - barH) / 2);
  const fontSize = rowH >= 22 ? 9 : rowH >= 16 ? 8 : 7;
  const fontSizeParent = Math.min(fontSize + 1, 10);
  return { rowH, barH, barOff, fontSize, fontSizeParent };
}

export function calculateProjectDurationDays(tasks: WBSTask[]): number {
  const flat = flattenTasksWithLevel(tasks);
  if (flat.length === 0) return 0;
  const allDates = flat.flatMap(t => {
    const end = t.end || (t.duration_days ? calculateEndDate(t.start, t.duration_days) : t.start);
    return [new Date(t.start), new Date(end)];
  });
  const min = Math.min(...allDates.map(d => d.getTime()));
  const max = Math.max(...allDates.map(d => d.getTime()));
  return Math.round((max - min) / (24 * 60 * 60 * 1000)) + 1;
}

function getDateRange(flatTasks: FlatTask[], padDays = 2): { minDate: Date; maxDate: Date; days: Date[] } {
  const allDates = flatTasks.flatMap(t => {
    const end = t.end || (t.duration_days ? calculateEndDate(t.start, t.duration_days) : t.start);
    return [new Date(t.start), new Date(end)];
  });
  const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
  minDate.setDate(minDate.getDate() - padDays);
  maxDate.setDate(maxDate.getDate() + padDays);

  const days: Date[] = [];
  const cur = new Date(minDate);
  while (cur <= maxDate) { days.push(new Date(cur)); cur.setDate(cur.getDate() + 1); }
  return { minDate, maxDate, days };
}

function renderTaskLabelsSVG(svgParts: string[], flatTasks: FlatTask[], hdrTop: number, chartHeight: number, rowH: number, fontSize: number, fontSizeParent: number) {
  svgParts.push(`<rect x="0" y="${hdrTop}" width="${GANTT.LABEL_WIDTH}" height="${chartHeight - hdrTop}" fill="#fafbfc" stroke="#d1d5db" stroke-width="0.5"/>`);
  svgParts.push(`<rect x="0" y="${hdrTop}" width="${GANTT.LABEL_WIDTH}" height="${GANTT.HEADER_HEIGHT}" fill="#f0f5ff" stroke="#d1d5db" stroke-width="0.5"/>`);
  svgParts.push(`<text x="12" y="${hdrTop + 30}" font-size="11" fill="#374151" font-weight="600">タスク</text>`);

  flatTasks.forEach((task, idx) => {
    const y = hdrTop + GANTT.HEADER_HEIGHT + idx * rowH;
    const labelIndent = 12 + task.level * 14;
    const parent = isParentTask(task);
    if (parent) svgParts.push(`<rect x="0" y="${y}" width="${GANTT.LABEL_WIDTH}" height="${rowH}" fill="#eef4fb"/>`);
    const fs = parent ? fontSizeParent : fontSize;
    const fw = parent ? '700' : '400';
    const maxC = Math.floor((GANTT.LABEL_WIDTH - labelIndent - 8) / (fs * 0.55));
    const name = task.name.length > maxC ? task.name.slice(0, maxC - 1) + '…' : task.name;
    svgParts.push(
      `<text x="${labelIndent}" y="${y + rowH / 2 + Math.round(fs * 0.35)}" font-size="${fs}" fill="#1e293b" font-weight="${fw}">`
      + `<tspan fill="#6b7280" font-size="${Math.max(6, fontSize - 1)}">${escapeHtml(task.wbs_code)} </tspan>${escapeHtml(name)}</text>`
    );
  });
}

function renderTaskBarSVG(svgParts: string[], task: FlatTask, idx: number, barX: number, barWidth: number, y: number, prefix: string, barOff?: number, barHeight?: number) {
  const barY = y + (barOff ?? GANTT.BAR_Y_OFFSET);
  const barH = barHeight ?? GANTT.BAR_HEIGHT;
  const color = getPriorityColor(task.priority);
  const parent = isParentTask(task);

  if (parent) {
    svgParts.push(`<rect x="${barX}" y="${barY}" width="${barWidth}" height="${barH}" rx="2" fill="${color.bar}" opacity="0.25"/>`);
    svgParts.push(`<rect x="${barX}" y="${barY}" width="${barWidth}" height="3" fill="${color.bar}" opacity="0.8"/>`);
    svgParts.push(`<rect x="${barX}" y="${barY + barH - 3}" width="${barWidth}" height="3" fill="${color.bar}" opacity="0.8"/>`);
    svgParts.push(`<rect x="${barX}" y="${barY}" width="3" height="${barH}" fill="${color.bar}" opacity="0.8"/>`);
    svgParts.push(`<rect x="${barX + barWidth - 3}" y="${barY}" width="3" height="${barH}" fill="${color.bar}" opacity="0.8"/>`);
  } else if (task.buffer != null) {
    const pid = `${prefix}-buf-${idx}`;
    svgParts.push(`<defs><pattern id="${pid}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="${color.bar}" stroke-width="2" opacity="0.4"/></pattern></defs>`);
    svgParts.push(`<rect x="${barX}" y="${barY}" width="${barWidth}" height="${barH}" rx="3" fill="url(#${pid})" stroke="${color.bar}" stroke-width="1" opacity="0.7"/>`);
  } else {
    svgParts.push(`<rect x="${barX}" y="${barY}" width="${barWidth}" height="${barH}" rx="3" fill="${color.bar}" opacity="0.85"/>`);
    if (task.progress && task.progress > 0) {
      const pw = barWidth * (task.progress / 100);
      svgParts.push(`<rect x="${barX}" y="${barY}" width="${pw}" height="${barH}" rx="3" fill="rgba(0,0,0,0.15)"/>`);
    }
  }
}

function renderTodayLine(svgParts: string[], minDate: Date, maxDate: Date, dayToX: (d: Date) => number, hdrTop: number, chartHeight: number) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (today >= minDate && today <= maxDate) {
    const x = GANTT.LABEL_WIDTH + dayToX(today) + GANTT.DAY_WIDTH / 2;
    svgParts.push(`<line x1="${x}" y1="${hdrTop + GANTT.HEADER_HEIGHT}" x2="${x}" y2="${chartHeight}" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="4 2"/>`);
    svgParts.push(`<text x="${x}" y="${hdrTop + GANTT.HEADER_HEIGHT - 2}" text-anchor="middle" font-size="8" fill="#ef4444" font-weight="600">Today</text>`);
  }
}

function wrapSVG(svgParts: string[], totalWidth: number, chartHeight: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${chartHeight}" viewBox="0 0 ${totalWidth} ${chartHeight}" style="display:block;font-family:'Noto Sans JP','Hiragino Sans','Hiragino Kaku Gothic ProN',sans-serif">\n${svgParts.join('\n')}\n</svg>`;
}

function renderSVGTitle(svgParts: string[], title: string, totalWidth: number, topOffset: number) {
  svgParts.push(`<rect x="0" y="0" width="${totalWidth}" height="${topOffset}" fill="#ffffff"/>`);
  svgParts.push(`<rect x="0" y="6" width="4" height="18" rx="1" fill="#1e40af"/>`);
  svgParts.push(`<text x="12" y="22" font-size="14" fill="#1e40af" font-weight="700">${escapeHtml(title)}</text>`);
}

// ---------------------------------------------------------------------------
// Daily Gantt (single page, for <= DURATION_THRESHOLD days)
// ---------------------------------------------------------------------------

function generateDailyGanttHTML(flatTasks: FlatTask[], title: string, projectName: string, showLegend: boolean): string {
  if (flatTasks.length === 0) return '';
  const { minDate, maxDate, days } = getDateRange(flatTasks);
  const m = calcRowMetrics(flatTasks.length);
  const topOffset = GANTT.TITLE_HEIGHT;
  const hdrTop = topOffset;
  const dayW = Math.max(GANTT.DAY_WIDTH, Math.floor((1512 - GANTT.LABEL_WIDTH) / days.length));
  const chartWidth = days.length * dayW;
  const chartHeight = topOffset + GANTT.HEADER_HEIGHT + flatTasks.length * m.rowH;
  const totalWidth = GANTT.LABEL_WIDTH + chartWidth;
  const dayToX = (date: Date) => Math.round((date.getTime() - minDate.getTime()) / (24 * 60 * 60 * 1000) * dayW);

  const svgParts: string[] = [];
  renderSVGTitle(svgParts, title, totalWidth, topOffset);

  days.forEach((d, i) => { if (isWeekend(d)) svgParts.push(`<rect x="${GANTT.LABEL_WIDTH + i * dayW}" y="${hdrTop + GANTT.HEADER_HEIGHT}" width="${dayW}" height="${flatTasks.length * m.rowH}" fill="#f3f4f6" />`); });
  for (let i = 0; i <= flatTasks.length; i++) { const y = hdrTop + GANTT.HEADER_HEIGHT + i * m.rowH; svgParts.push(`<line x1="${GANTT.LABEL_WIDTH}" y1="${y}" x2="${totalWidth}" y2="${y}" stroke="#e5e7eb" stroke-width="0.5"/>`); }
  days.forEach((_, i) => { const x = GANTT.LABEL_WIDTH + i * dayW; svgParts.push(`<line x1="${x}" y1="${hdrTop + GANTT.HEADER_HEIGHT}" x2="${x}" y2="${chartHeight}" stroke="#e5e7eb" stroke-width="0.5"/>`); });

  const monthGroups = buildMonthGroups(days, dayW);
  monthGroups.forEach(g => {
    svgParts.push(`<rect x="${GANTT.LABEL_WIDTH + g.startX}" y="${hdrTop}" width="${g.width}" height="22" fill="#f0f5ff" stroke="#d1d5db" stroke-width="0.5"/>`);
    svgParts.push(`<text x="${GANTT.LABEL_WIDTH + g.startX + g.width / 2}" y="${hdrTop + 15}" text-anchor="middle" font-size="10" fill="#374151" font-weight="600">${g.label}</text>`);
  });
  days.forEach((d, i) => {
    const x = GANTT.LABEL_WIDTH + i * dayW;
    const bgColor = isWeekend(d) ? '#f3f4f6' : '#ffffff';
    const textColor = d.getDay() === 0 ? '#dc2626' : d.getDay() === 6 ? '#2563eb' : '#374151';
    svgParts.push(`<rect x="${x}" y="${hdrTop + 22}" width="${dayW}" height="22" fill="${bgColor}" stroke="#d1d5db" stroke-width="0.5"/>`);
    svgParts.push(`<text x="${x + dayW / 2}" y="${hdrTop + 37}" text-anchor="middle" font-size="8" fill="${textColor}">${d.getDate()}(${getDayOfWeekLabel(d)})</text>`);
  });

  renderTaskLabelsSVG(svgParts, flatTasks, hdrTop, chartHeight, m.rowH, m.fontSize, m.fontSizeParent);

  flatTasks.forEach((task, idx) => {
    const y = hdrTop + GANTT.HEADER_HEIGHT + idx * m.rowH;
    const taskStart = new Date(task.start);
    const taskEnd = task.end ? new Date(task.end) : task.duration_days ? new Date(calculateEndDate(task.start, task.duration_days)) : new Date(task.start);
    const barX = GANTT.LABEL_WIDTH + dayToX(taskStart);
    const barW = Math.max(dayW * 0.5, dayToX(taskEnd) - dayToX(taskStart) + dayW);
    renderTaskBarSVG(svgParts, task, idx, barX, barW, y, 'day', m.barOff, m.barH);
  });

  renderTodayLine(svgParts, minDate, maxDate, dayToX, hdrTop, chartHeight);

  if (showLegend) {
    const legendY = chartHeight;
    const fullHeight = chartHeight + LEGEND_FOOTER_HEIGHT;
    renderLegendSVG(svgParts, legendY, totalWidth, projectName);
    return `<div style="page-break-before:always">${wrapSVG(svgParts, totalWidth, fullHeight)}</div>`;
  }
  return `<div style="page-break-before:always">${wrapSVG(svgParts, totalWidth, chartHeight)}</div>`;
}

// ---------------------------------------------------------------------------
// Weekly Gantt (overview, for > DURATION_THRESHOLD days)
// ---------------------------------------------------------------------------

interface WeekColumn { start: Date; end: Date; label: string; weekNum: number; }

function buildWeeks(minDate: Date, maxDate: Date): WeekColumn[] {
  const weeks: WeekColumn[] = [];
  const cur = new Date(minDate);
  cur.setDate(cur.getDate() - cur.getDay() + 1); // align to Monday
  let wn = 1;
  while (cur <= maxDate) {
    const wStart = new Date(cur);
    const wEnd = new Date(cur); wEnd.setDate(wEnd.getDate() + 6);
    weeks.push({ start: wStart, end: wEnd, label: `W${wn}`, weekNum: wn });
    cur.setDate(cur.getDate() + 7);
    wn++;
  }
  return weeks;
}

function generateWeeklyGanttHTML(flatTasks: FlatTask[]): string {
  if (flatTasks.length === 0) return '';
  const rm = calcRowMetrics(flatTasks.length);
  const { minDate, maxDate } = getDateRange(flatTasks, 0);
  const weeks = buildWeeks(minDate, maxDate);
  const availableW = 1512 - GANTT.LABEL_WIDTH;
  const weekWidth = Math.max(20, Math.min(50, Math.floor(availableW / weeks.length)));
  const topOffset = GANTT.TITLE_HEIGHT;
  const hdrTop = topOffset;
  const chartWidth = weeks.length * weekWidth;
  const chartHeight = topOffset + GANTT.HEADER_HEIGHT + flatTasks.length * rm.rowH;
  const totalWidth = GANTT.LABEL_WIDTH + chartWidth;

  const weekToX = (date: Date): number => {
    const ms = date.getTime();
    for (let i = 0; i < weeks.length; i++) {
      if (ms <= weeks[i].end.getTime()) {
        const frac = Math.max(0, (ms - weeks[i].start.getTime()) / (7 * 24 * 60 * 60 * 1000));
        return i * weekWidth + Math.round(frac * weekWidth);
      }
    }
    return weeks.length * weekWidth;
  };

  const svgParts: string[] = [];
  renderSVGTitle(svgParts, 'ガントチャート（週表示）', totalWidth, topOffset);

  // Grid
  for (let i = 0; i <= flatTasks.length; i++) { const y = hdrTop + GANTT.HEADER_HEIGHT + i * rm.rowH; svgParts.push(`<line x1="${GANTT.LABEL_WIDTH}" y1="${y}" x2="${totalWidth}" y2="${y}" stroke="#e5e7eb" stroke-width="0.5"/>`); }
  weeks.forEach((_, i) => { const x = GANTT.LABEL_WIDTH + i * weekWidth; svgParts.push(`<line x1="${x}" y1="${hdrTop + GANTT.HEADER_HEIGHT}" x2="${x}" y2="${chartHeight}" stroke="#e5e7eb" stroke-width="0.5"/>`); });

  // Month header for weeks
  const monthGroupsW: { label: string; startX: number; width: number }[] = [];
  let cm = -1, cy = -1, gs = 0;
  weeks.forEach((w, i) => {
    const m = w.start.getMonth(); const y = w.start.getFullYear();
    if (m !== cm || y !== cy) {
      if (cm >= 0) monthGroupsW.push({ label: `${cy}/${cm + 1}`, startX: gs * weekWidth, width: (i - gs) * weekWidth });
      cm = m; cy = y; gs = i;
    }
  });
  monthGroupsW.push({ label: `${cy}/${cm + 1}`, startX: gs * weekWidth, width: (weeks.length - gs) * weekWidth });
  monthGroupsW.forEach(g => {
    svgParts.push(`<rect x="${GANTT.LABEL_WIDTH + g.startX}" y="${hdrTop}" width="${g.width}" height="22" fill="#f0f5ff" stroke="#d1d5db" stroke-width="0.5"/>`);
    svgParts.push(`<text x="${GANTT.LABEL_WIDTH + g.startX + g.width / 2}" y="${hdrTop + 15}" text-anchor="middle" font-size="10" fill="#374151" font-weight="600">${g.label}</text>`);
  });

  // Week header
  weeks.forEach((w, i) => {
    const x = GANTT.LABEL_WIDTH + i * weekWidth;
    svgParts.push(`<rect x="${x}" y="${hdrTop + 22}" width="${weekWidth}" height="22" fill="#ffffff" stroke="#d1d5db" stroke-width="0.5"/>`);
    svgParts.push(`<text x="${x + weekWidth / 2}" y="${hdrTop + 37}" text-anchor="middle" font-size="8" fill="#374151">${w.label}</text>`);
  });

  // Labels
  renderTaskLabelsSVG(svgParts, flatTasks, hdrTop, chartHeight, rm.rowH, rm.fontSize, rm.fontSizeParent);

  // Bars
  flatTasks.forEach((task, idx) => {
    const y = hdrTop + GANTT.HEADER_HEIGHT + idx * rm.rowH;
    const tStart = new Date(task.start);
    const tEnd = task.end ? new Date(task.end) : task.duration_days ? new Date(calculateEndDate(task.start, task.duration_days)) : new Date(task.start);
    const barX = GANTT.LABEL_WIDTH + weekToX(tStart);
    const barEnd = GANTT.LABEL_WIDTH + weekToX(tEnd);
    const barW = Math.max(weekWidth * 0.3, barEnd - barX + weekWidth * 0.15);
    renderTaskBarSVG(svgParts, task, idx, barX, barW, y, 'wk', rm.barOff, rm.barH);
  });

  // Today
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (today >= weeks[0].start && today <= weeks[weeks.length - 1].end) {
    const x = GANTT.LABEL_WIDTH + weekToX(today);
    svgParts.push(`<line x1="${x}" y1="${hdrTop + GANTT.HEADER_HEIGHT}" x2="${x}" y2="${chartHeight}" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="4 2"/>`);
  }

  return `<div style="page-break-before:always">${wrapSVG(svgParts, totalWidth, chartHeight)}</div>`;
}

// ---------------------------------------------------------------------------
// Daily multi-page Gantt (for > DURATION_THRESHOLD days)
// ---------------------------------------------------------------------------

function generateDailyMultiPageGanttHTML(flatTasks: FlatTask[], projectName: string): string {
  if (flatTasks.length === 0) return '';
  const { minDate, maxDate, days } = getDateRange(flatTasks);
  const rm = calcRowMetrics(flatTasks.length);
  const pages: string[] = [];
  const A3_LANDSCAPE_WIDTH = 1512;
  const availableChartW = A3_LANDSCAPE_WIDTH - GANTT.LABEL_WIDTH;

  for (let pageIdx = 0; pageIdx * DAYS_PER_PAGE < days.length; pageIdx++) {
    const sliceStart = pageIdx * DAYS_PER_PAGE;
    const sliceDays = days.slice(sliceStart, sliceStart + DAYS_PER_PAGE);
    if (sliceDays.length === 0) break;

    const dayW = Math.floor(availableChartW / sliceDays.length);
    const sliceMin = sliceDays[0];
    const sliceMax = sliceDays[sliceDays.length - 1];
    const topOffset = GANTT.TITLE_HEIGHT;
    const hdrTop = topOffset;
    const chartWidth = sliceDays.length * dayW;
    const chartHeight = topOffset + GANTT.HEADER_HEIGHT + flatTasks.length * rm.rowH;
    const totalWidth = GANTT.LABEL_WIDTH + chartWidth;
    const dayToX = (date: Date) => Math.round((date.getTime() - sliceMin.getTime()) / (24 * 60 * 60 * 1000) * dayW);

    const svgParts: string[] = [];
    const totalPages = Math.ceil(days.length / DAYS_PER_PAGE);
    const pageLabel = totalPages > 1
      ? `ガントチャート（日表示）${pageIdx + 1}/${totalPages}`
      : 'ガントチャート（日表示）';
    renderSVGTitle(svgParts, pageLabel, totalWidth, topOffset);

    sliceDays.forEach((d, i) => { if (isWeekend(d)) svgParts.push(`<rect x="${GANTT.LABEL_WIDTH + i * dayW}" y="${hdrTop + GANTT.HEADER_HEIGHT}" width="${dayW}" height="${flatTasks.length * rm.rowH}" fill="#f3f4f6" />`); });
    for (let i = 0; i <= flatTasks.length; i++) { const y = hdrTop + GANTT.HEADER_HEIGHT + i * rm.rowH; svgParts.push(`<line x1="${GANTT.LABEL_WIDTH}" y1="${y}" x2="${totalWidth}" y2="${y}" stroke="#e5e7eb" stroke-width="0.5"/>`); }
    sliceDays.forEach((_, i) => { const x = GANTT.LABEL_WIDTH + i * dayW; svgParts.push(`<line x1="${x}" y1="${hdrTop + GANTT.HEADER_HEIGHT}" x2="${x}" y2="${chartHeight}" stroke="#e5e7eb" stroke-width="0.5"/>`); });

    const mg = buildMonthGroups(sliceDays, dayW);
    mg.forEach(g => {
      svgParts.push(`<rect x="${GANTT.LABEL_WIDTH + g.startX}" y="${hdrTop}" width="${g.width}" height="22" fill="#f0f5ff" stroke="#d1d5db" stroke-width="0.5"/>`);
      svgParts.push(`<text x="${GANTT.LABEL_WIDTH + g.startX + g.width / 2}" y="${hdrTop + 15}" text-anchor="middle" font-size="10" fill="#374151" font-weight="600">${g.label}</text>`);
    });

    sliceDays.forEach((d, i) => {
      const x = GANTT.LABEL_WIDTH + i * dayW;
      const bgColor = isWeekend(d) ? '#f3f4f6' : '#ffffff';
      const textColor = d.getDay() === 0 ? '#dc2626' : d.getDay() === 6 ? '#2563eb' : '#374151';
      svgParts.push(`<rect x="${x}" y="${hdrTop + 22}" width="${dayW}" height="22" fill="${bgColor}" stroke="#d1d5db" stroke-width="0.5"/>`);
      svgParts.push(`<text x="${x + dayW / 2}" y="${hdrTop + 37}" text-anchor="middle" font-size="7" fill="${textColor}">${d.getDate()}</text>`);
    });

    renderTaskLabelsSVG(svgParts, flatTasks, hdrTop, chartHeight, rm.rowH, rm.fontSize, rm.fontSizeParent);

    flatTasks.forEach((task, idx) => {
      const y = hdrTop + GANTT.HEADER_HEIGHT + idx * rm.rowH;
      const tStart = new Date(task.start);
      const tEnd = task.end ? new Date(task.end) : task.duration_days ? new Date(calculateEndDate(task.start, task.duration_days)) : new Date(task.start);

      if (tEnd < sliceMin || tStart > sliceMax) return;

      const clippedStart = tStart < sliceMin ? sliceMin : tStart;
      const clippedEnd = tEnd > sliceMax ? sliceMax : tEnd;
      const barX = GANTT.LABEL_WIDTH + dayToX(clippedStart);
      const barEnd = dayToX(clippedEnd) + dayW;
      const barW = Math.max(dayW * 0.5, barEnd - dayToX(clippedStart));
      renderTaskBarSVG(svgParts, task, idx, barX, barW, y, `dp${pageIdx}`, rm.barOff, rm.barH);
    });

    // Today
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (today >= sliceMin && today <= sliceMax) {
      const x = GANTT.LABEL_WIDTH + dayToX(today) + dayW / 2;
      svgParts.push(`<line x1="${x}" y1="${hdrTop + GANTT.HEADER_HEIGHT}" x2="${x}" y2="${chartHeight}" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="4 2"/>`);
      svgParts.push(`<text x="${x}" y="${hdrTop + GANTT.HEADER_HEIGHT - 2}" text-anchor="middle" font-size="8" fill="#ef4444" font-weight="600">Today</text>`);
    }

    const isLastPage = (pageIdx + 1) * DAYS_PER_PAGE >= days.length;
    if (isLastPage) {
      const legendY = chartHeight;
      renderLegendSVG(svgParts, legendY, totalWidth, projectName);
      pages.push(`<div style="page-break-before:always">${wrapSVG(svgParts, totalWidth, chartHeight + LEGEND_FOOTER_HEIGHT)}</div>`);
    } else {
      pages.push(`<div style="page-break-before:always">${wrapSVG(svgParts, totalWidth, chartHeight)}</div>`);
    }
  }

  return pages.join('\n');
}

// ---------------------------------------------------------------------------
// Month group builder
// ---------------------------------------------------------------------------

function buildMonthGroups(days: Date[], colWidth: number): { label: string; startX: number; width: number }[] {
  const groups: { label: string; startX: number; width: number }[] = [];
  let cm = -1, cy = -1, gs = 0;
  for (let i = 0; i < days.length; i++) {
    const m = days[i].getMonth(); const y = days[i].getFullYear();
    if (m !== cm || y !== cy) {
      if (cm >= 0) groups.push({ label: `${cy}/${cm + 1}`, startX: gs * colWidth, width: (i - gs) * colWidth });
      cm = m; cy = y; gs = i;
    }
  }
  groups.push({ label: `${cy}/${cm + 1}`, startX: gs * colWidth, width: (days.length - gs) * colWidth });
  return groups;
}

// ---------------------------------------------------------------------------
// Legend
// ---------------------------------------------------------------------------

function renderLegendSVG(svgParts: string[], y: number, totalWidth: number, projectName: string) {
  const items = [
    { label: 'Must', color: '#ef4444' },
    { label: 'Should', color: '#eab308' },
    { label: 'Could', color: '#22c55e' },
    { label: "Won't", color: '#9ca3af' },
  ];

  svgParts.push(`<line x1="0" y1="${y + 4}" x2="${totalWidth}" y2="${y + 4}" stroke="#e2e8f0" stroke-width="0.5"/>`);
  let x = 12;
  svgParts.push(`<text x="${x}" y="${y + 20}" font-size="9" fill="#6b7280" font-weight="600">凡例:</text>`);
  x += 40;
  items.forEach(item => {
    svgParts.push(`<rect x="${x}" y="${y + 12}" width="10" height="10" rx="2" fill="${item.color}"/>`);
    svgParts.push(`<text x="${x + 14}" y="${y + 21}" font-size="8" fill="#6b7280">${item.label}</text>`);
    x += 55;
  });
  x += 10;
  svgParts.push(`<line x1="${x}" y1="${y + 17}" x2="${x + 10}" y2="${y + 17}" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="3 1"/>`);
  svgParts.push(`<text x="${x + 14}" y="${y + 21}" font-size="8" fill="#6b7280">今日</text>`);

  svgParts.push(`<text x="12" y="${y + 40}" font-size="8" fill="#94a3b8">${escapeHtml(projectName)}</text>`);
  svgParts.push(`<text x="${totalWidth - 12}" y="${y + 40}" text-anchor="end" font-size="8" fill="#94a3b8">Generated by WBS Manager</text>`);
}

// ---------------------------------------------------------------------------
// Full HTML Document
// ---------------------------------------------------------------------------

export function generatePrintHTML(project: Project): string {
  const flatTasks = flattenTasksWithLevel(project.wbs);
  const today = new Date();
  const dateStr = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}`;

  const tableSection = generateTableHTML(project, flatTasks);
  const pName = project.project_info.name;
  const duration = calculateProjectDurationDays(project.wbs);
  const ganttSection = duration > DURATION_THRESHOLD
    ? generateWeeklyGanttHTML(flatTasks) + generateDailyMultiPageGanttHTML(flatTasks, pName)
    : generateDailyGanttHTML(flatTasks, 'ガントチャート', pName, true);

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8"/>
<title>${escapeHtml(project.project_info.name)} - WBSレポート</title>
<style>
  @page {
    size: A3 landscape;
    margin: 12mm 10mm 12mm 10mm;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: "Noto Sans JP", "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic", "Meiryo", sans-serif;
    font-size: 11px;
    color: #1e293b;
    line-height: 1.5;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .header {
    border-bottom: 2px solid #1e40af;
    padding-bottom: 10px;
    margin-bottom: 16px;
  }
  .header h1 {
    font-size: 20px;
    color: #1e3a5f;
    margin-bottom: 6px;
  }
  .header-meta {
    display: flex;
    gap: 20px;
    font-size: 10px;
    color: #64748b;
  }
  .header-meta span { display: inline-flex; align-items: center; gap: 4px; }
  .header-desc {
    margin-top: 6px;
    font-size: 11px;
    color: #475569;
  }
  .section-title {
    font-size: 14px;
    font-weight: 700;
    color: #1e40af;
    border-left: 4px solid #1e40af;
    padding-left: 8px;
    margin: 16px 0 10px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 10px;
  }
  th {
    background: #f0f5ff;
    color: #1e3a5f;
    font-weight: 600;
    padding: 6px 8px;
    border: 1px solid #cbd5e1;
    text-align: left;
    white-space: nowrap;
  }
  td {
    padding: 4px 8px;
    border: 1px solid #e2e8f0;
    vertical-align: middle;
  }
  .c { text-align: center; }
  .badge {
    display: inline-block;
    padding: 1px 6px;
    border-radius: 3px;
    font-size: 9px;
    font-weight: 600;
  }
  tr { page-break-inside: avoid; }
  .footer {
    margin-top: 20px;
    padding-top: 8px;
    border-top: 1px solid #e2e8f0;
    font-size: 9px;
    color: #94a3b8;
    display: flex;
    justify-content: space-between;
  }
</style>
</head>
<body>
  <div class="header">
    <h1>${escapeHtml(project.project_info.name)}</h1>
    <div class="header-meta">
      <span>バージョン: ${escapeHtml(project.project_info.version)}</span>
      <span>PMBOK: ${escapeHtml(project.project_info.pmbok_version)}</span>
      <span>出力日: ${dateStr}</span>
    </div>
    ${project.project_info.description ? `<div class="header-desc">${escapeHtml(project.project_info.description)}</div>` : ''}
  </div>

  ${tableSection}
  ${ganttSection}
</body>
</html>`;
}
