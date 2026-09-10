import type { WaveformsOptions } from 'types';
import { testTheme as theme } from 'theme.testutil';
import { makeChartJSOption } from './options';

const options = {
  lineWidth: 1,
  pointSize: 1,
  xAxisLabel: 'Index',
  yAxisLabel: 'Voltage',
  displayMode: 'both',
  decimation: false,
} as WaveformsOptions;

describe('makeChartJSOption', () => {
  // `parsing: false` promises Chart.js that x ascends, so it may only be claimed
  // when every index column does.
  it('skips parsing when the index columns are sorted', () => {
    expect(makeChartJSOption(options, theme, false, true).parsing).toBe(false);
  });

  it('falls back to the default keys when they are not', () => {
    expect(makeChartJSOption(options, theme, false, false).parsing).toEqual({ xAxisKey: 'x', yAxisKey: 'y' });
  });

  it('passes the decimation flag through to the plugin', () => {
    expect(makeChartJSOption(options, theme, true, true).plugins?.decimation?.enabled).toBe(true);
    expect(makeChartJSOption(options, theme, false, true).plugins?.decimation?.enabled).toBe(false);
  });

  // 'min-max' is what preserves narrow spikes; averaging would smooth them away.
  it('decimates by keeping the extremes of each pixel column', () => {
    expect(makeChartJSOption(options, theme, true, true).plugins?.decimation?.algorithm).toBe('min-max');
  });

  it('labels each axis with its own configured label', () => {
    const withAxisOptions = { ...options, xAxisLabel: 'Sample', yAxisLabel: 'Voltage' } as WaveformsOptions;
    const scales = makeChartJSOption(withAxisOptions, theme, false, true).scales;

    expect(scales?.x?.title).toMatchObject({ display: true, text: 'Sample' });
    expect(scales?.y?.title).toMatchObject({ display: true, text: 'Voltage' });
  });

  it('takes the grid colour from the theme', () => {
    const scales = makeChartJSOption(options, theme, false, true).scales;

    expect(scales?.x?.grid?.color).toBe('#eeeeee');
    expect(scales?.y?.grid?.color).toBe('#eeeeee');
  });

  // These were hardcoded to 'white', which is invisible on a light theme.
  it('takes the axis title and tick colours from the theme', () => {
    const scales = makeChartJSOption(options, theme, false, true).scales;

    expect(scales?.x?.title?.color).toBe('#111111');
    expect(scales?.x?.ticks?.color).toBe('#111111');
    expect(scales?.y?.title?.color).toBe('#111111');
    expect(scales?.y?.ticks?.color).toBe('#111111');
  });

  it('zooms by drag only, leaving pan and wheel off', () => {
    const zoom = makeChartJSOption(options, theme, false, true).plugins?.zoom;

    expect(zoom?.pan?.enabled).toBe(false);
    expect(zoom?.zoom?.wheel?.enabled).toBe(false);
    expect(zoom?.zoom?.drag?.enabled).toBe(true);
    expect(zoom?.zoom?.mode).toBe('xy');
  });

  it('hides the built-in legend, which the panel renders itself', () => {
    expect(makeChartJSOption(options, theme, false, true).plugins?.legend?.display).toBe(false);
  });

  // Otherwise Chart.js extends the x axis out to the nearest round tick, e.g.
  // drawing all the way to 600 for data maxing out at 510.
  it('clips the x axis to the data range instead of the nearest tick', () => {
    expect(makeChartJSOption(options, theme, false, true).scales?.x?.bounds).toBe('data');
  });

  it('leaves axis bounds to Chart.js when no axis options are configured', () => {
    const scales = makeChartJSOption(options, theme, false, true).scales;

    expect(scales?.x?.min).toBeUndefined();
    expect(scales?.x?.max).toBeUndefined();
    expect(scales?.y?.min).toBeUndefined();
    expect(scales?.y?.max).toBeUndefined();
    expect(scales?.y?.suggestedMin).toBeUndefined();
    expect(scales?.y?.suggestedMax).toBeUndefined();
  });

  it('fixes the x axis to the configured min/max', () => {
    const withAxisOptions = { ...options, xAxisMin: 1, xAxisMax: 9 } as WaveformsOptions;
    const scales = makeChartJSOption(withAxisOptions, theme, false, true).scales;

    expect(scales?.x?.min).toBe(1);
    expect(scales?.x?.max).toBe(9);
  });

  it('fixes the y axis to the configured min/max', () => {
    const withAxisOptions = { ...options, yAxisMin: -5, yAxisMax: 5 } as WaveformsOptions;
    const scales = makeChartJSOption(withAxisOptions, theme, false, true).scales;

    expect(scales?.y?.min).toBe(-5);
    expect(scales?.y?.max).toBe(5);
  });

  it('passes the y axis soft min/max through as suggested bounds', () => {
    const withAxisOptions = { ...options, yAxisSoftMin: 0, yAxisSoftMax: 100 } as WaveformsOptions;
    const scales = makeChartJSOption(withAxisOptions, theme, false, true).scales;

    expect(scales?.y?.suggestedMin).toBe(0);
    expect(scales?.y?.suggestedMax).toBe(100);
  });
});
