import type { VizLegendItem } from '@grafana/ui';
import type { ChartData } from 'chart.js';

import type { WaveformDataset } from 'data/chartData';

/**
 * What a legend item carries back to the panel on click: the dataset key the
 * hidden-series state is indexed by.
 */
export type WaveformLegendItemData = {
  custom: WaveformDataset['custom'];
};

export type WaveformLegendItem = VizLegendItem<WaveformLegendItemData>;

export function makeLegendItems(chartdata: ChartData<'line'>, enable: boolean): WaveformLegendItem[] {
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

// Update hidden series state based on click behavior
export function updateHiddenSeries(
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
