import { config } from '@grafana/runtime';
import type { ChartDataset } from 'chart.js';

import type { WaveformsOptions } from 'types';
import { EMPTY_POINTS, fillPoints, type SeriesBuffer } from 'data/seriesBuffer';

/** Custom dataset with additional metadata */
export type WaveformDataset = ChartDataset<'line'> & {
  custom: {
    key: string;
  };
};

export function makeChartData(
  buffers: SeriesBuffer[],
  index: number,
  hiddenSeries: Record<string, boolean>,
  displayMode: WaveformsOptions['displayMode'],
  lineWidth: number,
  pointSize: number
) {
  const { palette, getColorByName } = config.theme2.visualization;

  const showLine = displayMode !== 'point';
  const pointRadius = displayMode === 'line' ? 0 : pointSize;

  const datasets: WaveformDataset[] = buffers.map((buffer, i) => {
    const valueField = buffer.frame.fields[index + 1];
    const hidden = hiddenSeries[buffer.key] === true;
    const color = getColorByName(palette[i]);

    return {
      type: 'line',
      label: `${buffer.name} - ${valueField.name}`,

      // A hidden series is still parsed and updated by Chart.js, so hand it an
      // empty array rather than the real points.
      data: hidden ? EMPTY_POINTS : fillPoints(buffer.points, valueField.values),

      // The points are already in Chart.js' internal shape, so `parsing: false`
      // (set on the chart) lets it use this array as-is. `normalized` additionally
      // skips the sort check, but only holds when the index column ascends.
      normalized: buffer.sorted,

      custom: { key: buffer.key },

      showLine,
      borderWidth: lineWidth,
      pointRadius,
      hidden,

      borderColor: color,
      pointBackgroundColor: color,
      pointBorderColor: color,
      pointBorderWidth: 1,

      // Straight segments. A non-zero tension would make Chart.js compute Bezier
      // control points on every update, draw with bezierCurveTo instead of
      // lineTo, and skip its fast path for dense lines entirely — and the curve
      // would show values that were never sampled.
      tension: 0,
    };
  });

  return { datasets };
}
