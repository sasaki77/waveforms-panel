import React from 'react';
import { VizLayout, VizLegend } from '@grafana/ui';
import { PanelProps } from '@grafana/data';
import { WaveformsOptions } from 'types';
import { config, PanelDataErrorView } from '@grafana/runtime';

import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend,
} from 'chart.js';
import 'chartjs-adapter-date-fns';

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, TimeScale, Tooltip, Legend);

interface Props extends PanelProps<WaveformsOptions> {}

export const WaveformsPanel: React.FC<Props> = ({ options, data, width, height, fieldConfig, id }) => {
  if (data.series.length === 0) {
    return <PanelDataErrorView fieldConfig={fieldConfig} panelId={id} data={data} needsStringField />;
  }

  const datasets: any[] = [];
  const { palette, getColorByName } = config.theme2.visualization;

  data.series.forEach((series, seriesIndex) => {
    const timeField = series.fields.filter((f) => f.type === 'time');
    const valueFields = series.fields.filter((f) => f.type === 'number');

    const timeValues = Array.from(timeField[0].values) ?? [];

    valueFields.forEach((field, fieldIndex) => {
      const valueValues = Array.from(field.values);
      const dataPoints = timeValues.map((time, i) => ({
        x: time,
        y: valueValues[i],
      }));

      datasets.push({
        label: `${series.name ?? 'Series'} - ${field.name}`,
        data: dataPoints,
        fill: false,
        borderColor: getColorByName(palette[seriesIndex]),
        tension: 0.1,
      });
    });
  });

  const coptions = {
    responsive: true,
    maintainAspectRatio: false,

    plugins: {
      legend: {
        display: false,
      },
    },

    scales: {
      x: {
        type: 'time' as const,
        time: {
          unit: 'minute' as const,
        },
        title: {
          display: true,
          text: 'Time',
          color: 'white',
        },
        ticks: {
          color: 'white',
        },
        grid: {
          color: 'white',
        },
      },
      y: {
        title: {
          display: true,
          text: 'Value',
          color: 'white',
        },
        grid: {
          color: 'white',
        },

        ticks: {
          color: 'white',
        },
      },
    },
  };

  return (
    <VizLayout
      width={width}
      height={height}
      legend={
        <VizLegend
          placement={options.legend.placement}
          displayMode={options.legend.displayMode}
          items={datasets.map((ds, i) => ({
            label: ds.label,
            color: ds.borderColor,
            yAxis: 1,
            disabled: false,
          }))}
        />
      }
    >
      {(w, h) => (
        <div style={{ width: w, height: h }}>
          <div style={{ width: w, height: h }}>
            <Line data={{ datasets }} options={coptions} />
          </div>
        </div>
      )}
    </VizLayout>
  );
};
