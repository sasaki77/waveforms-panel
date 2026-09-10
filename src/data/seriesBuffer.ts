import type { DataFrame } from '@grafana/data';

/** A Chart.js point in the pre-parsed form the chart consumes directly. */
export type WaveformPoint = { x: number; y: number };

/**
 * Per-series scratch space, rebuilt only when new query results arrive.
 *
 * The x values (the index column) are shared by every timestamp column, so the
 * point objects are allocated once and reused: scrubbing the slider overwrites
 * `y` in place instead of allocating a new object per point per frame.
 */
export type SeriesBuffer = {
  key: string;
  name: string;
  frame: DataFrame;
  points: WaveformPoint[];
  /** Whether the index column ascends, which is what `normalized` promises Chart.js. */
  sorted: boolean;
};

/** Shared placeholder for hidden series so Chart.js has nothing to parse. */
export const EMPTY_POINTS: WaveformPoint[] = [];

/**
 * True when every value is strictly greater than the one before it.
 *
 * Phrased as `>` rather than the inverse `<=` so that a NaN anywhere in the
 * column makes this false: NaN compares false either way, and reporting such a
 * column as sorted would hand Chart.js a `normalized` promise we cannot keep.
 */
export function isAscending(values: number[]) {
  return values.every((value, i) => i === 0 || value > values[i - 1]);
}

/**
 * One name per series, unique within the panel. It is both what the legend
 * shows and what the hidden-series state is keyed by — deliberately the same
 * string, so clicking a legend row always acts on the series it names.
 *
 *     frame              name
 *     -----------------  ----------
 *     name PV1           PV1
 *     name PV1           PV1 2
 *     refId A            Series (A)
 *     (neither)          Series (3)
 *
 * `Series (…)` is how getFrameDisplayName names an unnamed frame; its earlier
 * branches want a lone value field, which a waveform frame never has. Written
 * out, not imported: a runtime `@grafana/data` import drags in date-fns.
 *
 * The names must not repeat. `updateHiddenSeries` isolates by hiding every name
 * that is not the clicked one, which is nothing at all when two series share
 * one, leaving the legend inert.
 */
export function makeSeriesNames(series: DataFrame[]): string[] {
  const taken = new Set<string>();

  return series.map((s, i) => {
    const base = s.name || (s.refId ? `Series (${s.refId})` : `Series (${i})`);

    return claimKey(base, taken);
  });
}

/**
 * `base`, or the first free `base 2`, `base 3`, … — then records the choice, so
 * no two series come away with the same key. A frame named `A 2` outright just
 * pushes the next claimant along to `A 2 2`. Numbered like the repeated field
 * names in `@grafana/data`'s getUniqueFieldName.
 */
function claimKey(base: string, taken: Set<string>): string {
  let key = base;
  let n = 1;

  while (taken.has(key)) {
    n += 1;
    key = `${base} ${n}`;
  }

  taken.add(key);

  return key;
}

/**
 * Allocates the reusable point objects for each series. The x values come from
 * the index column, which is shared by every waveform in the frame; y is filled
 * in by `makeChartData` for whichever timestamp column is currently selected.
 */
export function makeSeriesBuffers(series: DataFrame[]): SeriesBuffer[] {
  const names = makeSeriesNames(series);

  return series.map((s, i) => {
    const indexValues = s.fields[0].values;
    const points: WaveformPoint[] = new Array(indexValues.length);

    for (let j = 0; j < indexValues.length; j++) {
      points[j] = { x: indexValues[j], y: NaN };
    }

    return {
      // The same string twice: the legend shows `name` and keys its state and
      // its React list off `key`, and they have to agree for a click to land on
      // the series the reader picked. Kept as two fields because callers ask
      // two different questions of it.
      key: names[i],
      name: names[i],
      frame: s,
      points,
      sorted: isAscending(indexValues),
    };
  });
}

/**
 * Overwrites the reused point buffer with the selected timestamp column and
 * returns it. Reusing the objects is what keeps scrubbing the slider free of
 * per-point allocation.
 */
export function fillPoints(points: WaveformPoint[], values: number[]) {
  for (let i = 0; i < points.length; i++) {
    points[i].y = values[i];
  }

  return points;
}
