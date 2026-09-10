import type { GrafanaTheme2 } from '@grafana/data';
import type { ActiveElement, Chart as ChartJS, ChartEvent, ChartOptions } from 'chart.js';

import type { WaveformsOptions } from 'types';

export function makeChartJSOption(
  options: WaveformsOptions,
  theme: GrafanaTheme2,
  decimation: boolean,
  sorted: boolean
): ChartOptions<'line'> {
  return {
    responsive: true,
    // Disable animation
    animation: {
      duration: 0,
    },

    // Datasets are built as {x, y} objects already, so `false` lets Chart.js adopt
    // them as-is instead of parsing every point into a copy. It also reads that as
    // a promise that x ascends: it marks the data sorted without checking, and
    // then takes the x range from the first and last point alone. Where that does
    // not hold, fall back to parsing the same keys it would use by default.
    parsing: sorted ? false : { xAxisKey: 'x', yAxisKey: 'y' },

    maintainAspectRatio: false,

    plugins: {
      legend: {
        display: false,
      },

      // Chart.js only steps in past 4x the canvas width, so this stays a no-op
      // for waveforms the panel can draw point for point. 'min-max' keeps the
      // extremes of each pixel column, which is what preserves narrow spikes.
      decimation: {
        enabled: decimation,
        algorithm: 'min-max',
      },

      zoom: {
        pan: {
          enabled: false,
        },
        zoom: {
          wheel: {
            enabled: false,
          },
          drag: {
            enabled: true,
          },
          pinch: {
            enabled: true,
          },
          mode: 'xy',
        },
      },
    },

    scales: {
      x: {
        type: 'linear',
        min: options.xAxisMin,
        max: options.xAxisMax,
        bounds: 'data',
        title: {
          display: true,
          text: options.xAxisLabel,
          color: theme.colors.text.primary,
        },
        ticks: {
          color: theme.colors.text.primary,
          precision: 0,
        },
        grid: {
          color: theme.colors.border.weak,
        },
      },
      y: {
        min: options.yAxisMin,
        max: options.yAxisMax,
        suggestedMin: options.yAxisSoftMin,
        suggestedMax: options.yAxisSoftMax,
        title: {
          display: true,
          text: options.yAxisLabel,
          color: theme.colors.text.primary,
        },
        grid: {
          color: theme.colors.border.weak,
        },
        ticks: {
          color: theme.colors.text.primary,
        },
      },
    },
    onClick: (e: ChartEvent, elements: ActiveElement[], chart: ChartJS) => {
      chart.resetZoom();
    },
  };
}
