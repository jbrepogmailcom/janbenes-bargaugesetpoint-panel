import React from 'react';
import {
  DisplayValue,
  Field,
  FieldColorModeId,
  FieldConfig,
  FieldType,
  getDisplayProcessor,
  PanelProps,
  ThresholdsMode,
} from '@grafana/data';
import { PanelDataErrorView } from '@grafana/runtime';
import { css, cx } from '@emotion/css';
import {
  BarGauge,
  BarGaugeDisplayMode,
  useStyles2,
  useTheme2,
} from '@grafana/ui';
import { BarGaugeNamePlacement, BarGaugeValueMode, VizOrientation } from '@grafana/schema';
import { SimpleOptions } from 'types';

interface Props extends PanelProps<SimpleOptions> {}

type NumericSample = {
  field: Field;
  value: number;
};

type ThresholdStep = {
  color: string;
  value?: number | null;
};

const DEFAULT_MIN = 0;
const DEFAULT_MAX = 100;
const MIN_VALUE_HEIGHT = 18;
const MAX_VALUE_HEIGHT = 50;
const TITLE_LINE_HEIGHT = 1.5;

const getStyles = () => ({
  wrapper: css`
    height: 100%;
    overflow: hidden;
    position: relative;
    width: 100%;
  `,
  setpoint: css`
    pointer-events: none;
    position: absolute;
    z-index: 3;
  `,
  setpointLine: css`
    position: absolute;
  `,
  leftArrow: css`
    left: 0;
    position: absolute;
  `,
  rightArrow: css`
    position: absolute;
    right: 0;
  `,
});

const lastNumber = (field: Field): number | undefined => {
  for (let i = field.values.length - 1; i >= 0; i--) {
    const value = field.values[i];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }

  return undefined;
};

const firstNumericSample = (props: Props, refId?: string): NumericSample | undefined => {
  for (const series of props.data.series) {
    if (refId && series.refId !== refId) {
      continue;
    }

    for (const field of series.fields) {
      if (field.type !== FieldType.number) {
        continue;
      }

      const value = lastNumber(field);
      if (value !== undefined) {
        return { field, value };
      }
    }
  }

  return undefined;
};

const firstMainNumericSample = (props: Props): NumericSample | undefined => {
  const setpointRefId = props.options.setpointRefId || 'B';

  for (const series of props.data.series) {
    if (series.refId === setpointRefId) {
      continue;
    }

    for (const field of series.fields) {
      if (field.type !== FieldType.number) {
        continue;
      }

      const value = lastNumber(field);
      if (value !== undefined) {
        return { field, value };
      }
    }
  }

  return firstNumericSample(props);
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const parseThresholds = (raw: string): ThresholdStep[] => {
  const steps = raw
    .split(',')
    .map((part) => {
      const [color, value] = part.split(':').map((item) => item.trim());
      const numericValue = Number(value);

      if (!color || !Number.isFinite(numericValue)) {
        return undefined;
      }

      return { color, value: numericValue };
    })
    .filter((step): step is { color: string; value: number } => Boolean(step))
    .sort((a, b) => a.value - b.value);

  return steps.length > 0 ? steps : [{ color: 'green', value: 0 }];
};

const calculateVerticalLayout = (panelHeight: number, title: string) => {
  const titleHeight = title ? 14 * TITLE_LINE_HEIGHT : 0;
  const valueHeight = Math.min(Math.max(panelHeight * 0.1, MIN_VALUE_HEIGHT), MAX_VALUE_HEIGHT);
  const maxBarHeight = Math.max(0, panelHeight - (titleHeight + valueHeight));

  return {
    titleHeight,
    valueHeight,
    maxBarHeight,
  };
};

const makeGaugeField = (field: Field, min: number, max: number, thresholds: ThresholdStep[]): FieldConfig => ({
  ...field.config,
  min,
  max,
  color: {
    ...field.config.color,
    mode: FieldColorModeId.Thresholds,
  },
  thresholds: {
    mode: ThresholdsMode.Absolute,
    steps: thresholds.map((step, index) => ({
      color: step.color,
      value: index === 0 ? min : step.value ?? min,
    })),
  },
});

const makeDisplayValue = (
  field: Field,
  fieldConfig: FieldConfig,
  value: number,
  title: string,
  unitSuffix: string,
  theme: ReturnType<typeof useTheme2>
): DisplayValue => {
  const processor = getDisplayProcessor({
    field: {
      ...field,
      config: fieldConfig,
    },
    theme,
  });
  const displayValue = processor(value);

  return {
    ...displayValue,
    numeric: value,
    text: `${value.toFixed(1)}${unitSuffix || ''}`,
    title,
  };
};

export const SimplePanel: React.FC<Props> = (props) => {
  const { options, data, width, height, fieldConfig, id } = props;
  const theme = useTheme2();
  const styles = useStyles2(getStyles);
  const main = firstMainNumericSample(props);
  const setpoint = firstNumericSample(props, options.setpointRefId || 'B');

  if (!main) {
    return <PanelDataErrorView fieldConfig={fieldConfig} panelId={id} data={data} needsNumberField />;
  }

  const fieldMin = options.min ?? DEFAULT_MIN;
  const fieldMax = options.max ?? DEFAULT_MAX;
  const min = Number.isFinite(fieldMin) ? Number(fieldMin) : DEFAULT_MIN;
  const maxCandidate = Number.isFinite(fieldMax) ? Number(fieldMax) : DEFAULT_MAX;
  const max = maxCandidate > min ? maxCandidate : min + 1;
  const thresholds = parseThresholds(options.thresholds || 'green:0');
  const title = options.displayName || main.field.config.displayName || fieldConfig.defaults.displayName || main.field.name;
  const gaugeFieldConfig = makeGaugeField(main.field, min, max, thresholds);
  const gaugeValue = makeDisplayValue(main.field, gaugeFieldConfig, main.value, title, options.unitSuffix || '', theme);
  const display = getDisplayProcessor({
    field: {
      ...main.field,
      config: gaugeFieldConfig,
    },
    theme,
  });
  const { valueHeight, maxBarHeight } = calculateVerticalLayout(height, title);
  const markerScale = clamp(Number(options.setpointMarkerScale || 1), 0.25, 5);
  const arrowDepth = 8 * markerScale;
  const arrowHeight = 9 * markerScale;
  const lineHeight = Math.max(2, 2 * markerScale);
  const setpointTop =
    setpoint && options.showSetpoint
      ? valueHeight + (1 - (clamp(setpoint.value, min, max) - min) / (max - min)) * maxBarHeight
      : undefined;

  return (
    <div
      className={cx(
        styles.wrapper,
        css`
          width: ${width}px;
          height: ${height}px;
        `
      )}
    >
      <BarGauge
        display={display}
        displayMode={BarGaugeDisplayMode.Lcd}
        field={gaugeFieldConfig}
        height={height}
        isOverflow={false}
        itemSpacing={2}
        lcdCellWidth={12}
        namePlacement={BarGaugeNamePlacement.Auto}
        orientation={VizOrientation.Vertical}
        showUnfilled={true}
        theme={theme}
        value={gaugeValue}
        valueDisplayMode={BarGaugeValueMode.Color}
        width={width}
      />

      {setpointTop !== undefined && (
        <div
          className={styles.setpoint}
          data-testid="bar-gauge-setpoint-marker"
          data-marker-scale={markerScale}
          style={{
            left: `${-arrowDepth}px`,
            right: `${-arrowDepth}px`,
            top: `${setpointTop}px`,
          }}
        >
          <div
            className={styles.setpointLine}
            style={{
              background: options.setpointColor || '#fff',
              height: `${lineHeight}px`,
              left: `${arrowDepth}px`,
              right: `${arrowDepth}px`,
              top: `${-lineHeight / 2}px`,
            }}
          />
          <div
            className={styles.leftArrow}
            style={{
              background: options.setpointColor || '#fff',
              clipPath: 'polygon(0 0, 100% 50%, 0 100%)',
              height: `${arrowHeight}px`,
              top: `${-arrowHeight / 2}px`,
              width: `${arrowDepth}px`,
            }}
          />
          <div
            className={styles.rightArrow}
            style={{
              background: options.setpointColor || '#fff',
              clipPath: 'polygon(100% 0, 0 50%, 100% 100%)',
              height: `${arrowHeight}px`,
              top: `${-arrowHeight / 2}px`,
              width: `${arrowDepth}px`,
            }}
          />
        </div>
      )}
    </div>
  );
};
