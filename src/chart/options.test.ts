import type { GrafanaTheme2 } from '@grafana/data';

import type { WaveformsOptions } from 'types';
import { makeChartJSOption } from './options';

// `makeChartJSOption` only reaches for the grid colour, so a stub avoids pulling
// the whole theme (and `@grafana/data`'s runtime) into the test.
const theme = { colors: { border: { weak: '#eeeeee' } } } as GrafanaTheme2;

const options = {
  lineWidth: 1,
  pointSize: 1,
  axisLabel: 'Voltage',
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

  it('labels the y axis with the configured axis label', () => {
    const scales = makeChartJSOption(options, theme, false, true).scales;

    expect(scales?.y?.title).toMatchObject({ display: true, text: 'Voltage' });
    expect(scales?.x?.title).toMatchObject({ display: true, text: 'Index' });
  });

  it('takes the grid colour from the theme', () => {
    const scales = makeChartJSOption(options, theme, false, true).scales;

    expect(scales?.x?.grid?.color).toBe('#eeeeee');
    expect(scales?.y?.grid?.color).toBe('#eeeeee');
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
});
