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
    .addBooleanSwitch({
      path: 'decimation',
      name: 'Decimation',
      description:
        'Speed up waveforms with far more points than the panel has pixels. Peaks are kept, but dropped samples are not reachable by the tooltip.',
      defaultValue: false,
    })
    .addTextInput({
      path: 'xAxisLabel',
      name: 'Label',
      defaultValue: 'Index',
      category: ['X axis'],
    })
    .addNumberInput({
      path: 'xAxisMin',
      name: 'Min',
      description: 'Leave empty to fit the axis to the data.',
      category: ['X axis'],
      settings: { placeholder: 'auto' },
    })
    .addNumberInput({
      path: 'xAxisMax',
      name: 'Max',
      description: 'Leave empty to fit the axis to the data.',
      category: ['X axis'],
      settings: { placeholder: 'auto' },
    })
    .addTextInput({
      path: 'yAxisLabel',
      name: 'Label',
      defaultValue: '',
      category: ['Y axis'],
    })
    .addNumberInput({
      path: 'yAxisMin',
      name: 'Min',
      description: 'Leave empty to fit the axis to the data.',
      category: ['Y axis'],
      settings: { placeholder: 'auto' },
    })
    .addNumberInput({
      path: 'yAxisMax',
      name: 'Max',
      description: 'Leave empty to fit the axis to the data.',
      category: ['Y axis'],
      settings: { placeholder: 'auto' },
    })
    .addNumberInput({
      path: 'yAxisSoftMin',
      name: 'Soft min',
      description: 'A suggested lower bound: the axis still expands past it if the data goes lower.',
      category: ['Y axis'],
      settings: { placeholder: 'auto' },
    })
    .addNumberInput({
      path: 'yAxisSoftMax',
      name: 'Soft max',
      description: 'A suggested upper bound: the axis still expands past it if the data goes higher.',
      category: ['Y axis'],
      settings: { placeholder: 'auto' },
    });

  commonOptionsBuilder.addLegendOptions(builder);
});
