import { PanelPlugin } from '@grafana/data';
import { commonOptionsBuilder } from '@grafana/ui';
import { WaveformsOptions } from './types';
import { WaveformsPanel } from './components/WaveformsPanel';

export const plugin = new PanelPlugin<WaveformsOptions>(WaveformsPanel).setPanelOptions((builder) => {
  builder
    .addTextInput({
      path: 'text',
      name: 'Simple text option',
      description: 'Description of panel option',
      defaultValue: 'Default value of text input option',
    })
    .addBooleanSwitch({
      path: 'showSeriesCount',
      name: 'Show series counter',
      defaultValue: false,
    })
    .addRadio({
      path: 'seriesCountSize',
      defaultValue: 'sm',
      name: 'Series counter size',
      settings: {
        options: [
          {
            value: 'sm',
            label: 'Small',
          },
          {
            value: 'md',
            label: 'Medium',
          },
          {
            value: 'lg',
            label: 'Large',
          },
        ],
      },
      showIf: (config) => config.showSeriesCount,
    });

  commonOptionsBuilder.addLegendOptions(builder);
});
