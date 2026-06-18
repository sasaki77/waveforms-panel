import { css } from '@emotion/css';
import React, { useState, useMemo } from 'react';
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
  LineElement,
  PointElement,
  LinearScale,
  Tooltip,
  ChartEvent,
  ActiveElement,
} from 'chart.js';
import 'chartjs-adapter-date-fns';

import zoomPlugin from 'chartjs-plugin-zoom';

ChartJS.register(LineElement, PointElement, LinearScale, Tooltip, zoomPlugin);

/** Custom dataset with additional metadata */
type WaveformDataset = ChartDataset<'line'> & {
  custom: {
    key: string;
  };
};

interface Props extends PanelProps<WaveformsOptions> {}
const sliderWidthBorder = 600;

export const WaveformsPanel: React.FC<Props> = ({ options, data, width, height, fieldConfig, id, onOptionsChange }) => {
  const [index, setIndex] = useState(0);
  const [hiddenSeries, setHiddenSeries] = useState<Record<string, boolean>>({});
  const styles = useStyles2(getStyles);
  const theme = useTheme2();

  const chartdata = useMemo<ChartData<'line'>>(() => {
    return makeChartData(options, data.series, index, hiddenSeries);
  }, [options, data.series, index, hiddenSeries]);

  const items = useMemo<VizLegendItem[]>(() => {
    return makeLegendItems(chartdata, options.legend.showLegend);
  }, [chartdata, options.legend.showLegend]);

  const coptions = useMemo(() => {
    return makeChartJSOption(options, theme);
  }, [options, theme]);

  if (data.series.length === 0) {
    return <PanelDataErrorView fieldConfig={fieldConfig} panelId={id} data={data} needsStringField />;
  }

  const dlen = data.series[0].fields.length - 1;

  const onIndexChange = (value: number) => {
    setIndex(value >= dlen ? dlen - 1 : value || 0);
  };

  const sliderMarks = makeMarks(data.series);

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
            const clickedKey = (item as any).data.custom.key;

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
          >
            <GrafanaTooltip content={chartdata.datasets.length > 0 ? String(chartdata.datasets[0].label) : ''}>
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

function makeChartData(
  options: WaveformsOptions,
  series: DataFrame[],
  index: number,
  hiddenSeries: Record<string, boolean>
) {
  const { palette, getColorByName } = config.theme2.visualization;

  const datasets: WaveformDataset[] = series.map((s, i) => {
    const timeField = s.fields[0];
    const valueField = s.fields[index + 1];

    const data = Array.from(timeField.values).map((time, j) => ({
      x: time,
      y: valueField.values[j],
    }));

    const key = s.refId ?? s.name ?? `series-${i}`;
    const label = `${s.name ?? 'Series'} - ${valueField.name}`;

    const hidden = hiddenSeries[key] === true;

    const color = getColorByName(palette[i]);

    const showLine = options.displayMode !== 'point';
    const pointRadius = options.displayMode === 'line' ? 0 : options.pointSize;

    return {
      type: 'line',
      label,
      data,

      custom: { key },

      showLine,
      borderWidth: options.lineWidth,
      pointRadius,
      hidden,

      borderColor: color,
      pointBackgroundColor: color,
      pointBorderColor: color,
      pointBorderWidth: 1,

      tension: 0.1,
    };
  });

  return { datasets };
}

function makeChartJSOption(options: WaveformsOptions, theme: GrafanaTheme2) {
  return {
    responsive: true,
    // Disable animation
    animation: {
      duration: 0,
    },

    maintainAspectRatio: false,

    plugins: {
      legend: {
        display: false,
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
