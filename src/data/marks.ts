import type { DataFrame } from '@grafana/data';

/**
 * Slider tick marks for the first and last waveform, labelled with the
 * timestamp column names taken from the first series.
 */
export function makeMarks(series: DataFrame[]) {
  if (series.length === 0) {
    return {};
  }

  const dlen = series[0].fields.length - 1;
  const marks = {
    '0': [series[0].fields[1].name],
    [dlen - 1]: [series[0].fields[dlen].name],
  };

  return marks;
}
