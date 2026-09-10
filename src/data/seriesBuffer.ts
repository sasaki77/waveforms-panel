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
 * Allocates the reusable point objects for each series. The x values come from
 * the index column, which is shared by every waveform in the frame; y is filled
 * in by `makeChartData` for whichever timestamp column is currently selected.
 */
export function makeSeriesBuffers(series: DataFrame[]): SeriesBuffer[] {
  return series.map((s, i) => {
    const indexValues = s.fields[0].values;
    const points: WaveformPoint[] = new Array(indexValues.length);

    for (let j = 0; j < indexValues.length; j++) {
      points[j] = { x: indexValues[j], y: NaN };
    }

    return {
      key: s.refId ?? s.name ?? `series-${i}`,
      name: s.name ?? 'Series',
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
