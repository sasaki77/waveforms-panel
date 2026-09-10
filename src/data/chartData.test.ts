import { testTheme } from 'theme.testutil';

import { makeChartData } from './chartData';
import { testFrame } from './frames.testutil';
import { EMPTY_POINTS, makeSeriesBuffers } from './seriesBuffer';

const frames = [
  testFrame({ refId: 'A', name: 'a', index: [0, 1, 2], columns: { t0: [1, 2, 3], t1: [4, 5, 6] } }),
  testFrame({ refId: 'B', name: 'b', index: [2, 1, 0], columns: { t0: [7, 8, 9], t1: [10, 11, 12] } }),
];

const buffers = () => makeSeriesBuffers(frames);

describe('makeChartData', () => {
  it('selects the timestamp column at the given index', () => {
    const { datasets } = makeChartData(buffers(), 1, {}, 'both', 1, 1, testTheme);

    expect(datasets[0].label).toBe('a - t1');
    expect(datasets[0].data).toEqual([
      { x: 0, y: 4 },
      { x: 1, y: 5 },
      { x: 2, y: 6 },
    ]);
  });

  it('names each dataset after its series and timestamp column', () => {
    const { datasets } = makeChartData(buffers(), 0, {}, 'both', 1, 1, testTheme);

    expect(datasets.map((d) => d.label)).toEqual(['a - t0', 'b - t0']);
  });

  it('assigns colours from the palette by series position', () => {
    const { datasets } = makeChartData(buffers(), 0, {}, 'both', 1, 1, testTheme);

    expect(datasets[0].borderColor).toBe('resolved-red');
    expect(datasets[0].pointBackgroundColor).toBe('resolved-red');
    expect(datasets[1].borderColor).toBe('resolved-green');
  });

  // Series colours come from the theme passed in, not from the global
  // `config.theme2`, so that they match the theme the axes are drawn with.
  it('resolves colours through the theme it is given', () => {
    const other = {
      visualization: {
        palette: ['magenta'],
        getColorByName: (name: string) => `other-${name}`,
      },
    } as unknown as typeof testTheme;

    const { datasets } = makeChartData(buffers(), 0, {}, 'both', 1, 1, other);

    expect(datasets[0].borderColor).toBe('other-magenta');
  });

  // A hidden series is still parsed and updated by Chart.js, so it must not be
  // handed the real points.
  it('hands hidden series the shared empty array instead of their points', () => {
    const { datasets } = makeChartData(buffers(), 0, { A: true }, 'both', 1, 1, testTheme);

    expect(datasets[0].hidden).toBe(true);
    expect(datasets[0].data).toBe(EMPTY_POINTS);
    expect(datasets[1].hidden).toBe(false);
    expect(datasets[1].data).toHaveLength(3);
  });

  it('only hides a series whose flag is exactly true', () => {
    const { datasets } = makeChartData(buffers(), 0, { A: false }, 'both', 1, 1, testTheme);

    expect(datasets[0].hidden).toBe(false);
  });

  it('claims normalized only for series whose index column ascends', () => {
    const { datasets } = makeChartData(buffers(), 0, {}, 'both', 1, 1, testTheme);

    expect(datasets.map((d) => d.normalized)).toEqual([true, false]);
  });

  describe('display mode', () => {
    it('draws both the line and the points in "both"', () => {
      const [dataset] = makeChartData(buffers(), 0, {}, 'both', 2, 5, testTheme).datasets;

      expect(dataset.showLine).toBe(true);
      expect(dataset.borderWidth).toBe(2);
      expect(dataset.pointRadius).toBe(5);
    });

    it('collapses the points in "line"', () => {
      const [dataset] = makeChartData(buffers(), 0, {}, 'line', 2, 5, testTheme).datasets;

      expect(dataset.showLine).toBe(true);
      expect(dataset.pointRadius).toBe(0);
    });

    it('drops the line in "point"', () => {
      const [dataset] = makeChartData(buffers(), 0, {}, 'point', 2, 5, testTheme).datasets;

      expect(dataset.showLine).toBe(false);
      expect(dataset.pointRadius).toBe(5);
    });
  });

  // Chart.js would otherwise compute Bezier control points on every update and
  // draw values that were never sampled.
  it('keeps the segments straight', () => {
    expect(makeChartData(buffers(), 0, {}, 'both', 1, 1, testTheme).datasets[0].tension).toBe(0);
  });
});
