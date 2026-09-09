import * as common from '@grafana/schema';

export interface WaveformsOptions extends common.OptionsWithLegend {
  lineWidth: number;
  pointSize: number;
  axisLabel: string;

  displayMode: 'line' | 'point' | 'both';

  /** Thin out waveforms that carry far more points than the panel has pixels. */
  decimation: boolean;
}
