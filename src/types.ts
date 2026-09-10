import * as common from '@grafana/schema';

export interface WaveformsOptions extends common.OptionsWithLegend {
  lineWidth: number;
  pointSize: number;

  displayMode: 'line' | 'point' | 'both';

  /** Thin out waveforms that carry far more points than the panel has pixels. */
  decimation: boolean;

  xAxisLabel: string;
  /** Hard axis bounds; undefined leaves that end of the range to Chart.js. */
  xAxisMin?: number;
  xAxisMax?: number;

  yAxisLabel: string;
  yAxisMin?: number;
  yAxisMax?: number;

  /** Like Grafana's soft min/max: a suggested bound the data may still exceed. */
  yAxisSoftMin?: number;
  yAxisSoftMax?: number;
}
