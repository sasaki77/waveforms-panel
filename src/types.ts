import * as common from '@grafana/schema';

type SeriesSize = 'sm' | 'md' | 'lg';

export interface WaveformsOptions  extends common.OptionsWithLegend {
  text: string;
  showSeriesCount: boolean;
  seriesCountSize: SeriesSize;
}
