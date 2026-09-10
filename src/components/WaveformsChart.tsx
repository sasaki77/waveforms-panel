import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  Decimation,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';

// react-chartjs-2 does not register anything itself (that is what `chart.js/auto`
// is for), so the pieces the panel draws with have to be registered before the
// first render. Removing this leaves the build, the types and the linter happy
// and fails at runtime with `"linear" is not a registered scale`.
ChartJS.register(LineElement, PointElement, LinearScale, Tooltip, Decimation, zoomPlugin);

interface Props {
  width: number;
  height: number;
  data: ChartData<'line'>;
  options: ChartOptions<'line'>;
}

export const WaveformsChart: React.FC<Props> = ({ width, height, data, options }) => (
  // Chart.js documents a relatively positioned container dedicated to the chart.
  // v4 sizes the canvas from a ResizeObserver on this element, so the positioning
  // is not load-bearing today; it keeps us on the documented shape and gives any
  // future overlay something to anchor to.
  <div style={{ position: 'relative', width, height }}>
    <Line data={data} options={options} />
  </div>
);
