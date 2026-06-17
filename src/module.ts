import { PanelPlugin } from '@grafana/data';
import { commonOptionsBuilder } from '@grafana/ui';
import { WaveformsOptions } from './types';
import { WaveformsPanel } from './components/WaveformsPanel';

export const plugin = new PanelPlugin<WaveformsOptions>(WaveformsPanel).setPanelOptions((builder) => {
  builder
    .addRadio({
      path: 'displayMode',
      name: 'Display mode',
      defaultValue: 'both',
      settings: {
        options: [
          { value: 'both', label: 'Both' },
          { value: 'line', label: 'Line' },
          { value: 'point', label: 'Points' },
        ],
      },
    })
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
    })
    .addTextInput({
      path: 'axisLabel',
      name: 'Axis label',
      defaultValue: '',
    });

  commonOptionsBuilder.addLegendOptions(builder);
});
