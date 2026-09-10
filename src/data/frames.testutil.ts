import type { DataFrame } from '@grafana/data';

/**
 * A hand-built frame in the shape the panel reads: field 0 is the index column
 * and every field after it is one waveform, named by its timestamp.
 *
 * Built by hand rather than with `toDataFrame` because importing `@grafana/data`
 * for its runtime pulls in `date-fns`, which this plugin does not depend on.
 */
export function testFrame(props: {
  refId?: string;
  name?: string;
  /** Omit where the test is only about how the frame is identified. */
  index?: number[];
  columns?: Record<string, number[]>;
}): DataFrame {
  const { refId, name, index = [], columns = {} } = props;

  const fields = [
    { name: 'index', values: index },
    ...Object.entries(columns).map(([fieldName, values]) => ({ name: fieldName, values })),
  ];

  return { refId, name, fields, length: index.length } as unknown as DataFrame;
}
