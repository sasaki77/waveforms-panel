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
  <div style={{ width, height }}>
    <Line data={data} options={options} />
  </div>
);
