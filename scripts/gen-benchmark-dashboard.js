#!/usr/bin/env node
/**
 * Generates a provisioned Grafana dashboard used to benchmark the Waveforms panel.
 *
 * The panel's per-render cost is driven by (points per waveform) x (number of series),
 * so the generated dashboard contains panels that vary those two dimensions
 * independently. The number of timestamp columns only controls the slider range.
 *
 * Output is deterministic: re-running produces a byte-identical file. The generated
 * dashboard is a few MB, so it is gitignored rather than committed.
 *
 * Takes no arguments — adjust PANELS below to change the sizes being measured.
 */

const { writeFileSync, mkdirSync } = require('node:fs');
const { dirname, resolve } = require('node:path');

const OUT_FILE = resolve(__dirname, '../provisioning/dashboards/benchmark.json');

const DATASOURCE = { type: 'grafana-testdata-datasource', uid: 'trlxrdZVk' };
const SERIES_NAMES = ['CH1', 'CH2', 'CH3', 'CH4', 'CH5', 'CH6', 'CH7', 'CH8'];
const BASE_TIME = Date.parse('2024-01-01T00:00:00+09:00');
const COLUMN_INTERVAL_MS = 10 * 60 * 1000;

/** Panels to emit, in dashboard order. */
const PANELS = [
  {
    title: 'S — 512 points x 3 series',
    description:
      'Baseline. Well below the Chart.js decimation threshold; use it to spot regressions on small waveforms.',
    points: 512,
    series: 3,
    columns: 6,
  },
  {
    title: 'M — 2,048 points x 3 series',
    description: 'Typical Archiver Appliance waveform size.',
    points: 2048,
    series: 3,
    columns: 6,
  },
  {
    title: 'L — 8,192 points x 3 series',
    description:
      'Main benchmark. On a full-width panel this crosses the 4x-canvas-width point count where Chart.js decimation starts to apply.',
    points: 8192,
    series: 3,
    columns: 6,
  },
  {
    title: 'W — 2,048 points x 8 series',
    description: 'Stresses the number of simultaneously drawn datasets rather than the points per waveform.',
    points: 2048,
    series: 8,
    columns: 6,
  },
];

/** Deterministic PRNG so the generated file never churns between runs. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * One waveform: a couple of harmonics, broadband noise, and a few narrow spikes.
 * The spikes matter — they are what a min-max decimation must preserve and an
 * averaging decimation would flatten.
 */
function makeWaveform(points, seed) {
  const rand = mulberry32(seed);
  const phase = rand() * Math.PI * 2;
  const amplitude = 400 + rand() * 800;
  const harmonic = 3 + Math.floor(rand() * 6);
  const values = new Array(points);

  for (let i = 0; i < points; i++) {
    const t = i / points;
    let v =
      amplitude * Math.sin(2 * Math.PI * 2 * t + phase) +
      (amplitude / 4) * Math.sin(2 * Math.PI * harmonic * t) +
      (rand() - 0.5) * (amplitude / 10);
    values[i] = Math.round(v * 100) / 100;
  }

  const spikeCount = Math.max(4, Math.round(points / 512));
  for (let s = 0; s < spikeCount; s++) {
    const at = Math.floor(rand() * points);
    values[at] = Math.round(values[at] * (2.5 + rand() * 2) * 100) / 100;
  }

  return values;
}

function columnNames(count) {
  return Array.from({ length: count }, (_, c) => new Date(BASE_TIME + c * COLUMN_INTERVAL_MS).toISOString());
}

/**
 * Builds one frame in Grafana's DataFrame JSON format. The testdata `raw_frame`
 * scenario feeds each element of rawFrameContent through `toDataFrame`, which
 * dispatches a `{schema, data}` object to `dataFrameFromJSON`. That shape is
 * column-oriented, so it stays compact at these sizes.
 */
function makeFrame({ name, refId, points, columns, seed }) {
  const timestamps = columnNames(columns);
  const numberField = (fieldName) => ({
    name: fieldName,
    type: 'number',
    typeInfo: { frame: 'float64' },
  });

  const index = Array.from({ length: points }, (_, i) => i);
  const values = [index, ...timestamps.map((_, c) => makeWaveform(points, seed + c * 7919))];

  return {
    schema: {
      name,
      refId,
      fields: [numberField('index'), ...timestamps.map(numberField)],
    },
    data: { values },
  };
}

function makePanel(spec, id, gridY) {
  const targets = Array.from({ length: spec.series }, (_, s) => {
    const refId = String.fromCharCode(65 + s);
    return {
      refId,
      scenarioId: 'raw_frame',
      datasource: DATASOURCE,
      rawFrameContent: JSON.stringify([
        makeFrame({
          name: SERIES_NAMES[s],
          refId,
          points: spec.points,
          columns: spec.columns,
          seed: 1000 + id * 100 + s,
        }),
      ]),
    };
  });

  return {
    id,
    type: 'sasaki77-waveforms-panel',
    title: spec.title,
    description: spec.description,
    datasource: DATASOURCE,
    gridPos: { h: 11, w: 24, x: 0, y: gridY },
    fieldConfig: { defaults: {}, overrides: [] },
    options: {
      displayMode: 'both',
      lineWidth: 1,
      pointSize: 1,
      axisLabel: 'value',
      legend: {
        calcs: [],
        displayMode: 'list',
        placement: 'bottom',
        showLegend: true,
      },
    },
    targets,
  };
}

const dashboard = {
  annotations: { list: [] },
  editable: true,
  fiscalYearStartMonth: 0,
  graphTooltip: 0,
  links: [],
  panels: PANELS.map((spec, i) => makePanel(spec, i + 1, i * 11)),
  preload: false,
  refresh: '',
  schemaVersion: 41,
  tags: ['benchmark'],
  templating: { list: [] },
  time: { from: 'now-6h', to: 'now' },
  timepicker: {},
  timezone: '',
  title: 'Waveforms panel benchmark',
  uid: 'waveforms-benchmark',
  version: 1,
};

mkdirSync(dirname(OUT_FILE), { recursive: true });
writeFileSync(OUT_FILE, JSON.stringify(dashboard, null, 2) + '\n');

const totalPoints = PANELS.reduce((sum, p) => sum + p.points * p.series * p.columns, 0);
console.log(
  `Wrote ${OUT_FILE} (${PANELS.length} panels, ${totalPoints.toLocaleString('en-US')} values, ` +
    `${(JSON.stringify(dashboard).length / 1024 / 1024).toFixed(1)} MB)`
);
