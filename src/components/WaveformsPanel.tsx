import React, { useState, useMemo } from 'react';
import { VizLayout, useTheme2 } from '@grafana/ui';
import { PanelProps } from '@grafana/data';
import { PanelDataErrorView } from '@grafana/runtime';
import { ChartData } from 'chart.js';

import { WaveformsOptions } from 'types';
import { makeChartJSOption } from 'chart/options';
import { WaveformDataset, makeChartData } from 'data/chartData';
import { WaveformLegendItem, makeLegendItems, updateHiddenSeries } from 'data/legend';
import { makeMarks } from 'data/marks';
import { makeSeriesBuffers } from 'data/seriesBuffer';

import { WaveformsChart } from './WaveformsChart';
import { WaveformsLegend } from './WaveformsLegend';
import { SLIDER_HEIGHT, WaveformsSlider } from './WaveformsSlider';

interface Props extends PanelProps<WaveformsOptions> {}

export const WaveformsPanel: React.FC<Props> = ({ options, data, width, height, fieldConfig, id, onOptionsChange }) => {
  const [index, setIndex] = useState(0);
  const [hiddenSeries, setHiddenSeries] = useState<Record<string, boolean>>({});
  const theme = useTheme2();

  const { displayMode, lineWidth, pointSize } = options;

  const buffers = useMemo(() => makeSeriesBuffers(data.series), [data.series]);

  const chartdata = useMemo<ChartData<'line'>>(() => {
    return makeChartData(buffers, index, hiddenSeries, displayMode, lineWidth, pointSize, theme);
  }, [buffers, index, hiddenSeries, displayMode, lineWidth, pointSize, theme]);

  const items = useMemo<WaveformLegendItem[]>(() => {
    return makeLegendItems(chartdata, options.legend.showLegend);
  }, [chartdata, options.legend.showLegend]);

  // `parsing: false` is a chart-wide switch, so it may only be claimed when
  // every index column ascends, not just some of them.
  const sorted = useMemo(() => buffers.every((buffer) => buffer.sorted), [buffers]);

  // Decimation locates the visible range by binary search, so it needs the same
  // guarantee.
  const decimation = options.decimation && sorted;

  const coptions = useMemo(() => {
    return makeChartJSOption(options, theme, decimation, sorted);
  }, [options, theme, decimation, sorted]);

  const sliderMarks = useMemo(() => makeMarks(data.series), [data.series]);

  if (data.series.length === 0) {
    return <PanelDataErrorView fieldConfig={fieldConfig} panelId={id} data={data} needsStringField />;
  }

  const dlen = data.series[0].fields.length - 1;

  const onIndexChange = (value: number) => {
    setIndex(value >= dlen ? dlen - 1 : value || 0);
  };

  const onSeriesClick = (clickedKey: string, ctrl: boolean) => {
    const allKeys = (chartdata.datasets as WaveformDataset[]).map((d) => d.custom.key);

    setHiddenSeries((prev) => updateHiddenSeries(prev, clickedKey, allKeys, ctrl));
  };

  return (
    <VizLayout
      width={width}
      height={height}
      legend={
        <WaveformsLegend
          placement={options.legend.placement}
          displayMode={options.legend.displayMode}
          sortBy={options.legend.sortBy}
          sortDesc={options.legend.sortDesc}
          items={items}
          onSeriesClick={onSeriesClick}
        />
      }
    >
      {(w, h) => (
        <div style={{ width: w, height: h }}>
          <WaveformsChart width={w} height={h - SLIDER_HEIGHT} data={chartdata} options={coptions} />
          <WaveformsSlider
            width={w}
            marks={sliderMarks}
            max={dlen - 1}
            value={index}
            onChange={onIndexChange}
            label={chartdata.datasets.length > 0 ? String(chartdata.datasets[0].label) : ''}
          />
        </div>
      )}
    </VizLayout>
  );
};
