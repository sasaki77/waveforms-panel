import type { GrafanaTheme2 } from '@grafana/data';

/**
 * The slice of `GrafanaTheme2` the chart actually reads.
 *
 * Built by hand rather than with `createTheme()` because importing
 * `@grafana/data` for its runtime pulls in `date-fns`, which this plugin does
 * not depend on. Extend it as the chart starts reading more of the theme.
 */
export const testTheme = {
  colors: {
    border: { weak: '#eeeeee' },
    text: { primary: '#111111' },
  },
  visualization: {
    palette: ['red', 'green', 'blue'],
    getColorByName: (name: string) => `resolved-${name}`,
  },
} as unknown as GrafanaTheme2;
