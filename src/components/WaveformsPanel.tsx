import { css } from '@emotion/css';
import React, { useState } from 'react';
import {
  VizLayout,
  VizLegend,
  Tooltip as GrafanaTooltip,
  type VizLegendItem,
  Slider,
  useTheme2,
  useStyles2,
} from '@grafana/ui';
import { PanelProps } from '@grafana/data';
import { WaveformsOptions } from 'types';
import { config, PanelDataErrorView } from '@grafana/runtime';

import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, LineElement, PointElement, LinearScale, Tooltip, ChartEvent, ActiveElement } from 'chart.js';
import 'chartjs-adapter-date-fns';

import zoomPlugin from 'chartjs-plugin-zoom';

ChartJS.register(LineElement, PointElement, LinearScale, Tooltip, zoomPlugin);

interface Props extends PanelProps<WaveformsOptions> {}

export const WaveformsPanel: React.FC<Props> = ({ options, data, width, height, fieldConfig, id, onOptionsChange }) => {
  const [index, setIndex] = useState(0);
  const styles = useStyles2(getStyles);
  const theme = useTheme2();

  const sliderWidthBorder = 600;

  if (data.series.length === 0) {
    return <PanelDataErrorView fieldConfig={fieldConfig} panelId={id} data={data} needsStringField />;
  }

  const dlen = data.series[0].fields.length - 1;

  const onIndexChange = (value: number) => {
    setIndex(value >= dlen ? dlen - 1 : value || 0);
    onOptionsChange({ ...options });
  };

  const datasets: any[] = [];
  const { palette, getColorByName } = config.theme2.visualization;

  const marks = {
    '0': [data.series[0].fields[1].name],
    [dlen - 1]: [data.series[0].fields[dlen].name],
  };

  data.series.forEach((series, seriesIndex) => {
    const timeField = series.fields[0];
    const valueFields = series.fields[index + 1];

    const timeValues = Array.from(timeField.values) ?? [];

    const valueValues = Array.from(valueFields.values);
    const dataPoints = timeValues.map((time, i) => ({
      x: time,
      y: valueValues[i],
    }));

    datasets.push({
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

  const items: VizLegendItem[] = [];
  if (options.legend.showLegend) {
    datasets.forEach((ds, idx) => {
      items.push({
        label: ds.label,
        color: ds.borderColor,
        yAxis: 1,
        disabled: false,
      });
    });
  }

  const coptions = {
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
            <Line data={{ datasets }} options={coptions} />
          </div>
          <div
            style={{
              width: w > sliderWidthBorder ? w - 300 : w * 0.6,
              height: 50,
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            <GrafanaTooltip content={datasets[0].label}>
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
