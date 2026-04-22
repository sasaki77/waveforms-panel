import { PanelPlugin } from '@grafana/data';
import { commonOptionsBuilder } from '@grafana/ui';
import { WaveformsOptions } from './types';
import { WaveformsPanel } from './components/WaveformsPanel';

export const plugin = new PanelPlugin<WaveformsOptions>(WaveformsPanel).setPanelOptions((builder) => {
  builder
    .addSliderInput({
      path: 'lineWidth',
      name: 'Line width',
      defaultValue: 1,
      settings: {
        min: 0,
        max: 10,
        step: 1,
      },
    })
    .addSliderInput({
      path: 'pointSize',
      name: 'Point size',
      defaultValue: 1,
      settings: {
        min: 0,
        max: 10,
        step: 1,
      },
    });

  commonOptionsBuilder.addLegendOptions(builder);
});
