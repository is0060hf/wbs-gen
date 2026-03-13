import { describe, it, expect } from 'vitest';
import {
  calculateProjectDurationDays,
  generatePrintHTML,
} from '../pdf-template';
import { Project, WBSTask } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTask(overrides: Partial<WBSTask> & { id: string; wbs_code: string; name: string }): WBSTask {
  return {
    priority: 'Must' as const,
    start: '2025-06-01',
    duration_days: 1,
    ...overrides,
  };
}

function makeProject(tasks: WBSTask[], daysSpan?: { start: string; end: string }): Project {
  const adjustedTasks = daysSpan
    ? tasks.map((t, i) => ({
        ...t,
        start: i === 0 ? daysSpan.start : t.start,
        end: i === tasks.length - 1 ? daysSpan.end : t.end,
      }))
    : tasks;

  return {
    project_info: {
      name: 'Test Project',
      version: '1.0',
      pmbok_version: '7',
      description: 'test',
    },
    wbs: adjustedTasks,
  };
}

/** Generate N sequential tasks spanning `totalDays` days */
function generateSpanningTasks(totalDays: number): WBSTask[] {
  const start = new Date('2025-06-01');
  const tasks: WBSTask[] = [];
  const chunkSize = Math.ceil(totalDays / 5);

  for (let i = 0; i < 5; i++) {
    const taskStart = new Date(start);
    taskStart.setDate(start.getDate() + i * chunkSize);
    const dur = Math.min(chunkSize, totalDays - i * chunkSize);
    if (dur <= 0) break;

    const taskEnd = new Date(taskStart);
    taskEnd.setDate(taskStart.getDate() + dur - 1);

    tasks.push(
      makeTask({
        id: `T-${i + 1}`,
        wbs_code: `${i + 1}`,
        name: `Phase ${i + 1}`,
        start: taskStart.toISOString().split('T')[0],
        end: taskEnd.toISOString().split('T')[0],
        duration_days: dur,
      })
    );
  }
  return tasks;
}

// ---------------------------------------------------------------------------
// Tests: calculateProjectDurationDays
// ---------------------------------------------------------------------------

describe('calculateProjectDurationDays', () => {
  it('returns 0 for empty tasks', () => {
    expect(calculateProjectDurationDays([])).toBe(0);
  });

  it('correctly calculates duration for a single task', () => {
    const tasks = [
      makeTask({ id: 'T-1', wbs_code: '1', name: 'A', start: '2025-06-01', end: '2025-06-10', duration_days: 10 }),
    ];
    expect(calculateProjectDurationDays(tasks)).toBe(10);
  });

  it('calculates span across multiple tasks with gaps', () => {
    const tasks = [
      makeTask({ id: 'T-1', wbs_code: '1', name: 'A', start: '2025-06-01', end: '2025-06-10', duration_days: 10 }),
      makeTask({ id: 'T-2', wbs_code: '2', name: 'B', start: '2025-06-20', end: '2025-06-30', duration_days: 11 }),
    ];
    // June 1 to June 30 = 30 days
    expect(calculateProjectDurationDays(tasks)).toBe(30);
  });

  it('handles nested children tasks', () => {
    const tasks = [
      makeTask({
        id: 'T-1', wbs_code: '1', name: 'Parent',
        start: '2025-06-01', duration_days: 60,
        children: [
          makeTask({ id: 'T-1-1', wbs_code: '1.1', name: 'Child', start: '2025-06-01', end: '2025-07-30', duration_days: 60 }),
        ],
      }),
    ];
    expect(calculateProjectDurationDays(tasks)).toBe(60);
  });
});

// ---------------------------------------------------------------------------
// Tests: generatePrintHTML routing logic
// ---------------------------------------------------------------------------

describe('generatePrintHTML - Gantt mode selection', () => {
  it('produces daily-only Gantt for projects <= 60 days', () => {
    const tasks = generateSpanningTasks(30);
    const project = makeProject(tasks);
    const html = generatePrintHTML(project);

    // Should contain daily Gantt (day-of-week labels like (月), (火))
    expect(html).toContain('(月)');
    // Should NOT contain weekly Gantt section title
    expect(html).not.toContain('ガントチャート（週表示）');
  });

  it('produces BOTH weekly and multi-page daily Gantt for projects > 60 days', () => {
    const tasks = generateSpanningTasks(90);
    const project = makeProject(tasks);
    const html = generatePrintHTML(project);

    // Should contain weekly overview
    expect(html).toContain('ガントチャート（週表示）');
    // Should also contain daily detail
    expect(html).toContain('ガントチャート（日表示）');
  });

  it('weekly Gantt uses week-based columns (W prefix or week date ranges)', () => {
    const tasks = generateSpanningTasks(120);
    const project = makeProject(tasks);
    const html = generatePrintHTML(project);

    // Weekly gantt should have "W" week indicators in SVG
    expect(html).toMatch(/W\d+/);
  });

  it('daily multi-page Gantt has page-break markers for > 60 days', () => {
    const tasks = generateSpanningTasks(90);
    const project = makeProject(tasks);
    const html = generatePrintHTML(project);

    // Should contain page-break-before for subsequent daily chart pages
    const dailyDetailSection = html.split('ガントチャート（日表示）')[1] || '';
    expect(dailyDetailSection).toContain('page-break-before');
  });

  it('boundary: exactly 60 days uses daily-only mode', () => {
    const tasks = generateSpanningTasks(60);
    const project = makeProject(tasks);
    const html = generatePrintHTML(project);

    expect(html).not.toContain('ガントチャート（週表示）');
  });

  it('boundary: 61 days triggers dual mode', () => {
    const tasks = generateSpanningTasks(61);
    const project = makeProject(tasks);
    const html = generatePrintHTML(project);

    expect(html).toContain('ガントチャート（週表示）');
    expect(html).toContain('ガントチャート（日表示）');
  });
});
