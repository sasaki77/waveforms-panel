import { css } from '@emotion/css';
import React, { useState, useMemo, useEffect } from 'react';
import {
  VizLayout,
  VizLegend,
  Tooltip as GrafanaTooltip,
  type VizLegendItem,
  Slider,
  useTheme2,
  useStyles2,
} from '@grafana/ui';
import { PanelProps, GrafanaTheme2, DataFrame } from '@grafana/data';
import { WaveformsOptions } from 'types';
import { config, PanelDataErrorView } from '@grafana/runtime';

import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ChartData,
  ChartDataset,
  Decimation,
  LineElement,
  PointElement,
  LinearScale,
  Tooltip,
  ChartEvent,
  ActiveElement,
} from 'chart.js';
import 'chartjs-adapter-date-fns';

import zoomPlugin from 'chartjs-plugin-zoom';

ChartJS.register(LineElement, PointElement, LinearScale, Tooltip, Decimation, zoomPlugin);

/** Custom dataset with additional metadata */
type WaveformDataset = ChartDataset<'line'> & {
  custom: {
    key: string;
  };
};

/** A Chart.js point in the pre-parsed form the chart consumes directly. */
type WaveformPoint = { x: number; y: number };

/**
 * Per-series scratch space, rebuilt only when new query results arrive.
 *
 * The x values (the index column) are shared by every timestamp column, so the
 * point objects are allocated once and reused: scrubbing the slider overwrites
 * `y` in place instead of allocating a new object per point per frame.
 */
type SeriesBuffer = {
  key: string;
  name: string;
  frame: DataFrame;
  points: WaveformPoint[];
  /** Whether the index column ascends, which is what `normalized` promises Chart.js. */
  sorted: boolean;
};

/** Shared placeholder for hidden series so Chart.js has nothing to parse. */
const EMPTY_POINTS: WaveformPoint[] = [];

interface Props extends PanelProps<WaveformsOptions> {}
const sliderWidthBorder = 600;

export const WaveformsPanel: React.FC<Props> = ({ options, data, width, height, fieldConfig, id, onOptionsChange }) => {
  const [index, setIndex] = useState(0);
  const [hiddenSeries, setHiddenSeries] = useState<Record<string, boolean>>({});
  const [isSliderDragging, setIsSliderDragging] = useState(false);
  const styles = useStyles2(getStyles);
  const theme = useTheme2();

  const { displayMode, lineWidth, pointSize } = options;

  const buffers = useMemo(() => makeSeriesBuffers(data.series), [data.series]);

  const chartdata = useMemo<ChartData<'line'>>(() => {
    return makeChartData(buffers, index, hiddenSeries, displayMode, lineWidth, pointSize);
  }, [buffers, index, hiddenSeries, displayMode, lineWidth, pointSize]);

  const items = useMemo<VizLegendItem[]>(() => {
    return makeLegendItems(chartdata, options.legend.showLegend);
  }, [chartdata, options.legend.showLegend]);

  // Decimation walks the points assuming an ascending x, so it is only safe
  // where `normalized` already holds.
  const decimation = useMemo(() => {
    return options.decimation && buffers.every((buffer) => buffer.sorted);
  }, [options.decimation, buffers]);

  const coptions = useMemo(() => {
    return makeChartJSOption(options, theme, decimation);
  }, [options, theme, decimation]);

  const sliderMarks = useMemo(() => makeMarks(data.series), [data.series]);

  // Keep the tooltip open while the slider handle is dragged, even if the
  // pointer leaves the slider area.
  useEffect(() => {
    if (!isSliderDragging) {
      return;
    }

    const stopDragging = () => setIsSliderDragging(false);

    window.addEventListener('pointerup', stopDragging);
    window.addEventListener('pointercancel', stopDragging);

    return () => {
      window.removeEventListener('pointerup', stopDragging);
      window.removeEventListener('pointercancel', stopDragging);
    };
  }, [isSliderDragging]);

  if (data.series.length === 0) {
    return <PanelDataErrorView fieldConfig={fieldConfig} panelId={id} data={data} needsStringField />;
  }

  const dlen = data.series[0].fields.length - 1;

  const onIndexChange = (value: number) => {
    setIndex(value >= dlen ? dlen - 1 : value || 0);
  };

  return (
    <VizLayout
      width={width}
      height={height}
      legend={
        <VizLegend
          className={styles.legend}
          placement={options.legend.placement}
          displayMode={options.legend.displayMode}
          items={items}
          sortBy={options.legend.sortBy}
          sortDesc={options.legend.sortDesc}
          isSortable={true}
          onLabelClick={(item, event) => {
            const ctrl = event?.ctrlKey || event?.metaKey; // support macOS cmd key
            const clickedKey = (item as any).data?.custom?.key;
            if (!clickedKey) {
              return;
            }

            const allKeys = (chartdata.datasets as WaveformDataset[]).map((d) => d.custom.key);

            setHiddenSeries((prev) => updateHiddenSeries(prev, clickedKey, allKeys, ctrl));
          }}
        />
      }
    >
      {(w, h) => (
        <div style={{ width: w, height: h }}>
          <div style={{ width: w, height: h - 50 }}>
            <Line data={chartdata} options={coptions} />
          </div>
          <div
            style={{
              width: w > sliderWidthBorder ? w - 300 : w * 0.6,
              height: 50,
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
            // Tooltip overwrites the handlers of its child element, so the drag
            // start is detected on this wrapper instead.
            onPointerDown={() => setIsSliderDragging(true)}
          >
            <GrafanaTooltip
              content={chartdata.datasets.length > 0 ? String(chartdata.datasets[0].label) : ''}
              // `undefined` restores the default hover behaviour
              show={isSliderDragging || undefined}
            >
              <div className={styles.slider}>
                <Slider
                  included={false}
                  marks={w > sliderWidthBorder ? sliderMarks : []}
                  max={dlen - 1}
                  min={0}
                  orientation="horizontal"
                  value={index}
                  onChange={onIndexChange}
                  showInput={false}
                  inputId=""
                />
              </div>
            </GrafanaTooltip>
          </div>
        </div>
      )}
    </VizLayout>
  );
};

const getStyles = () => ({
  legend: css({
    div: {
      justifyContent: 'flex-start',
    },
  }),

  slider: css({
    '.rc-slider-mark-text': {
      whiteSpace: 'nowrap',
    },
  }),
});

/**
 * True when every value is strictly greater than the one before it.
 *
 * Phrased as `>` rather than the inverse `<=` so that a NaN anywhere in the
 * column makes this false: NaN compares false either way, and reporting such a
 * column as sorted would hand Chart.js a `normalized` promise we cannot keep.
 */
function isAscending(values: number[]) {
  return values.every((value, i) => i === 0 || value > values[i - 1]);
}

/**
 * Allocates the reusable point objects for each series. The x values come from
 * the index column, which is shared by every waveform in the frame; y is filled
 * in by `makeChartData` for whichever timestamp column is currently selected.
 */
function makeSeriesBuffers(series: DataFrame[]): SeriesBuffer[] {
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
function fillPoints(points: WaveformPoint[], values: number[]) {
  for (let i = 0; i < points.length; i++) {
    points[i].y = values[i];
  }

  return points;
}

function makeChartData(
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

function makeChartJSOption(options: WaveformsOptions, theme: GrafanaTheme2, decimation: boolean) {
  return {
    responsive: true,
    // Disable animation
    animation: {
      duration: 0,
    },

    // Datasets are built as {x, y} objects already, so Chart.js can skip its own
    // per-point parsing pass over every waveform.
    parsing: false as const,

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
        algorithm: 'min-max' as const,
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
          mode: 'xy' as const,
        },
      },
    },

    scales: {
      x: {
        type: 'linear' as const,
        title: {
          display: true,
          text: 'Index',
          color: 'white',
        },
        ticks: {
          color: 'white',
          precision: 0,
        },
        grid: {
          color: theme.colors.border.weak,
        },
      },
      y: {
        title: {
          display: true,
          text: options.axisLabel,
          color: 'white',
        },
        grid: {
          color: theme.colors.border.weak,
        },
        ticks: {
          color: 'white',
        },
      },
    },
    onClick: (e: ChartEvent, elements: ActiveElement[], chart: ChartJS) => {
      chart.resetZoom();
    },
  };
}

function makeLegendItems(chartdata: ChartData<'line'>, enable: boolean) {
  if (!enable) {
    return [];
  }

  return (chartdata.datasets as WaveformDataset[]).map((ds) => ({
    label: String(ds.label),
    color: String(ds.borderColor),
    yAxis: 1,
    disabled: ds.hidden,
    data: { custom: ds.custom },
  }));
}

function makeMarks(series: DataFrame[]) {
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

// Update hidden series state based on click behavior
function updateHiddenSeries(
  prev: Record<string, boolean>,
  clickedKey: string,
  allKeys: string[],
  ctrl: boolean
): Record<string, boolean> {
  // Ctrl/Cmd: toggle
  if (ctrl) {
    const next = { ...prev };
    if (next[clickedKey]) {
      delete next[clickedKey];
    } else {
      next[clickedKey] = true;
    }
    return next;
  }

  const visibleKeys = allKeys.filter((k) => !prev[k]);

  const isOnlyThisVisible = visibleKeys.length === 1 && visibleKeys[0] === clickedKey;

  // already isolated → reset
  if (isOnlyThisVisible) {
    return {};
  }

  // isolate
  const next: Record<string, boolean> = {};
  allKeys.forEach((k) => {
    if (k !== clickedKey) {
      next[k] = true;
    }
  });

  return next;
}
