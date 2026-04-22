import * as common from '@grafana/schema';

export interface WaveformsOptions extends common.OptionsWithLegend {
  lineWidth: number;
  pointSize: number;
  axisLabel: string;
}
