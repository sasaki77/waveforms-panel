import type { ChartData } from 'chart.js';

import { makeLegendItems, updateHiddenSeries } from './legend';

function chartData(datasets: Array<{ key: string; label: string; color: string; hidden: boolean }>) {
  return {
    datasets: datasets.map((d) => ({
      label: d.label,
      borderColor: d.color,
      hidden: d.hidden,
      custom: { key: d.key },
    })),
  } as unknown as ChartData<'line'>;
}

describe('makeLegendItems', () => {
  const data = chartData([
    { key: 'A', label: 'a - t0', color: '#ff0000', hidden: false },
    { key: 'B', label: 'b - t0', color: '#00ff00', hidden: true },
  ]);

  it('returns nothing when the legend is switched off', () => {
    expect(makeLegendItems(data, false)).toEqual([]);
  });

  it('carries the dataset key through so a click can be traced back', () => {
    expect(makeLegendItems(data, true).map((item) => item.data?.custom.key)).toEqual(['A', 'B']);
  });

  it('mirrors the label, colour and hidden state of each dataset', () => {
    expect(makeLegendItems(data, true)[0]).toMatchObject({
      label: 'a - t0',
      color: '#ff0000',
      yAxis: 1,
      disabled: false,
    });
    expect(makeLegendItems(data, true)[1].disabled).toBe(true);
  });
});

describe('updateHiddenSeries', () => {
  const allKeys = ['A', 'B', 'C'];

  describe('ctrl/cmd click', () => {
    it('hides a visible series without touching the others', () => {
      expect(updateHiddenSeries({}, 'B', allKeys, true)).toEqual({ B: true });
    });

    it('reveals a hidden series again', () => {
      expect(updateHiddenSeries({ B: true, C: true }, 'B', allKeys, true)).toEqual({ C: true });
    });

    it('does not mutate the previous state', () => {
      const prev = { B: true };

      updateHiddenSeries(prev, 'B', allKeys, true);

      expect(prev).toEqual({ B: true });
    });
  });

  describe('plain click', () => {
    it('isolates the clicked series by hiding every other one', () => {
      expect(updateHiddenSeries({}, 'B', allKeys, false)).toEqual({ A: true, C: true });
    });

    it('clears everything when the clicked series is already the only visible one', () => {
      expect(updateHiddenSeries({ A: true, C: true }, 'B', allKeys, false)).toEqual({});
    });

    it('isolates rather than clears when others are still visible', () => {
      expect(updateHiddenSeries({ A: true }, 'B', allKeys, false)).toEqual({ A: true, C: true });
    });

    it('hides everything when the clicked series is not one of the known keys', () => {
      expect(updateHiddenSeries({}, 'unknown', allKeys, false)).toEqual({ A: true, B: true, C: true });
    });
  });
});
