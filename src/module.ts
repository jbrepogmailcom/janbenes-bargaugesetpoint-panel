import { PanelPlugin } from '@grafana/data';
import { SimpleOptions } from './types';
import { SimplePanel } from './components/SimplePanel';

export const plugin = new PanelPlugin<SimpleOptions>(SimplePanel).setPanelOptions((builder) => {
  return builder
    .addNumberInput({
      path: 'segmentCount',
      name: 'LED segments',
      description: 'Number of vertical LED segments in the bar.',
      defaultValue: 24,
      settings: {
        min: 6,
        max: 80,
        integer: true,
      },
    })
    .addTextInput({
      path: 'setpointRefId',
      name: 'Setpoint query refId',
      description: 'Query refId used as the setpoint value. The main value is read from the first other numeric query.',
      defaultValue: 'B',
    })
    .addBooleanSwitch({
      path: 'showSetpoint',
      name: 'Show setpoint',
      defaultValue: true,
    })
    .addColorPicker({
      path: 'setpointColor',
      name: 'Setpoint color',
      defaultValue: '#ffffff',
      showIf: (config) => config.showSetpoint,
    });
});
