import { PanelPlugin } from '@grafana/data';
import { SimpleOptions } from './types';
import { SimplePanel } from './components/SimplePanel';

export const plugin = new PanelPlugin<SimpleOptions>(SimplePanel).setPanelOptions((builder) => {
  return builder
    .addTextInput({
      path: 'displayName',
      name: 'Display name',
      defaultValue: '',
    })
    .addNumberInput({
      path: 'min',
      name: 'Min',
      defaultValue: 0,
    })
    .addNumberInput({
      path: 'max',
      name: 'Max',
      defaultValue: 100,
    })
    .addTextInput({
      path: 'unitSuffix',
      name: 'Unit suffix',
      description: 'Text appended to the displayed value, for example " °C".',
      defaultValue: '',
    })
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
    })
    .addTextInput({
      path: 'thresholds',
      name: 'Thresholds',
      description: 'Comma separated color thresholds. Example: red:17,yellow:19,green:22,yellow:26,red:28',
      defaultValue: 'green:0',
    });
});
