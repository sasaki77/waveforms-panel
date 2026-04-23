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

interface Props extends PanelProps<WaveformsOptions> {}
const sliderWidthBorder = 600;

export const WaveformsPanel: React.FC<Props> = ({ options, data, width, height, fieldConfig, id, onOptionsChange }) => {
  const [index, setIndex] = useState(0);
  const styles = useStyles2(getStyles);
  const theme = useTheme2();

  const chartdata = useMemo<ChartData<'line'>>(() => {
    return makeChartData(options, data.series, index);
  }, [options, data.series, index]);

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
    onOptionsChange({ ...options });
  };

  const marks = makeMarks(data.series);

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
            <GrafanaTooltip content={String(chartdata.datasets[0].label)}>
              <div className={styles.slider}>
                <Slider
                  included={false}
                  marks={w > sliderWidthBorder ? marks : []}
                  max={dlen - 1}
                  min={0}
                  orientation="horizontal"
                  value={0}
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

function makeChartData(options: WaveformsOptions, series: DataFrame[], index: number) {
  const chartdata: ChartData<'line'> = { datasets: [] };

  if (series.length === 0) {
    return chartdata;
  }

  const { palette, getColorByName } = config.theme2.visualization;

  series.forEach((series, seriesIndex) => {
    const timeField = series.fields[0];
    const valueFields = series.fields[index + 1];

    const timeValues = Array.from(timeField.values) ?? [];

    const valueValues = Array.from(valueFields.values);
    const dataPoints = timeValues.map((time, i) => ({
      x: time,
      y: valueValues[i],
    }));

    chartdata.datasets.push({
      type: 'line',
      label: `${series.name ?? 'Series'} - ${valueFields.name}`,
      data: dataPoints,
      showLine: true,
      fill: false,
      borderWidth: options.lineWidth,
      pointRadius: options.pointSize,
      borderColor: getColorByName(palette[seriesIndex]),
      tension: 0.1,
    });
  });

  return chartdata;
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
        time: {
          unit: 'minute' as const,
        },
        title: {
          display: true,
          text: 'Index',
          color: 'white',
        },
        ticks: {
          color: 'white',
          stepSize: 1,
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

  if (chartdata.datasets.length === 0) {
    return [];
  }

  const items: VizLegendItem[] = [];
  chartdata.datasets.forEach((ds, idx) => {
    items.push({
      label: String(ds.label),
      color: String(ds.borderColor),
      yAxis: 1,
      disabled: false,
    });
  });

  return items;
}

function makeMarks(series: DataFrame[]) {
  const dlen = series[0].fields.length - 1;
  const marks = {
    '0': [series[0].fields[1].name],
    [dlen - 1]: [series[0].fields[dlen].name],
  };

  return marks;
}
