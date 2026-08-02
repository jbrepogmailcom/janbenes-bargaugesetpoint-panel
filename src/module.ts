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
    .addNumberInput({
      path: 'setpointMarkerScale',
      name: 'Setpoint marker size',
      description: 'Setpoint arrow and line size. 1.0 is the original 100% size.',
      defaultValue: 1,
      settings: {
        min: 0.25,
        max: 5,
        step: 0.25,
      },
      showIf: (config) => config.showSetpoint,
    })
    .addTextInput({
      path: 'thresholds',
      name: 'Thresholds',
      description: 'Comma separated color thresholds. Example: red:17,yellow:19,green:22,yellow:26,red:28',
      defaultValue: 'green:0',
    });
});
