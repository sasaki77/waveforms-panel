import type { DataFrame } from '@grafana/data';

/**
 * Slider tick marks for the first and last waveform, labelled with the
 * timestamp column names taken from the first series.
 */
export function makeMarks(series: DataFrame[]) {
  const fields = series[0]?.fields;

  // No series at all, or a frame carrying only the index column: nothing to label.
  if (!fields || fields.length < 2) {
    return {};
  }

  const dlen = fields.length - 1;
  const marks = {
    '0': [fields[1].name],
    [dlen - 1]: [fields[dlen].name],
  };

  return marks;
}
