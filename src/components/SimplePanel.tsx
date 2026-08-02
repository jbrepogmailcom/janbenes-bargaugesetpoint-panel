import React from 'react';
import { Field, FieldType, PanelProps } from '@grafana/data';
import { PanelDataErrorView } from '@grafana/runtime';
import { css, cx } from '@emotion/css';
import { useStyles2, useTheme2 } from '@grafana/ui';
import { SimpleOptions } from 'types';

interface Props extends PanelProps<SimpleOptions> {}

type NumericSample = {
  field: Field;
  value: number;
};

const DEFAULT_MIN = 0;
const DEFAULT_MAX = 100;
const LCD_CELL_WIDTH = 12;
const LCD_CELL_SPACING = 2;
const MIN_VALUE_HEIGHT = 18;
const MAX_VALUE_HEIGHT = 50;
const TITLE_LINE_HEIGHT = 1.5;
const VALUE_LINE_HEIGHT = 1;

const getStyles = () => ({
  wrapper: css`
    background: transparent;
    display: flex;
    flex-direction: column-reverse;
    font-family: Open Sans, sans-serif;
    height: 100%;
    overflow: hidden;
    position: relative;
    width: 100%;
  `,
  retro: css`
    display: flex;
    flex-direction: column-reverse;
    align-items: center;
    position: relative;
  `,
  value: css`
    flex: 0 0 auto;
    font-weight: 400;
    line-height: ${VALUE_LINE_HEIGHT};
    overflow: hidden;
    text-align: center;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  gauge: css`
    display: flex;
    flex-direction: column-reverse;
    justify-content: flex-start;
    max-width: 90px;
    min-width: 34px;
    position: relative;
    width: 100%;
  `,
  segment: css`
    border-radius: 2px;
    flex: 0 0 auto;
  `,
  setpoint: css`
    left: -7px;
    pointer-events: none;
    position: absolute;
    right: -7px;
    transform: translateY(50%);
    z-index: 2;
  `,
  setpointLine: css`
    height: 2px;
    left: 7px;
    position: absolute;
    right: 7px;
    top: -1px;
  `,
  leftArrow: css`
    left: 0;
    position: absolute;
  `,
  rightArrow: css`
    position: absolute;
    right: 0;
  `,
  name: css`
    flex: 0 0 auto;
    font-size: 13px;
    line-height: ${TITLE_LINE_HEIGHT};
    overflow: hidden;
    text-align: center;
    text-overflow: ellipsis;
    white-space: nowrap;
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

const parseThresholds = (raw: string): Array<{ color: string; value?: number | null }> => {
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

  return steps.length > 0 ? steps : [{ color: 'green', value: null }];
};

const colorFor = (value: number, steps: Array<{ color: string; value?: number | null }>) => {
  let color = steps[0]?.color || 'green';

  for (const step of steps) {
    if (step.value == null || value >= step.value) {
      color = step.color;
    }
  }

  return color;
};

const colorWithAlpha = (color: string, alpha: number) => {
  const rgb = color.match(/^rgba?\(([^)]+)\)$/);

  if (rgb) {
    const parts = rgb[1].split(',').slice(0, 3).map((part) => part.trim());
    return `rgba(${parts.join(', ')}, ${alpha})`;
  }

  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const normalized =
      hex.length === 3
        ? hex
            .split('')
            .map((part) => part + part)
            .join('')
        : hex;
    const value = Number.parseInt(normalized.slice(0, 6), 16);

    if (Number.isFinite(value)) {
      const red = (value >> 16) & 255;
      const green = (value >> 8) & 255;
      const blue = value & 255;
      return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
    }
  }

  return color;
};

const calculateVerticalLayout = (panelHeight: number, title: string) => {
  const titleHeight = title ? 14 * TITLE_LINE_HEIGHT : 0;
  const valueHeight = Math.min(Math.max(panelHeight * 0.1, MIN_VALUE_HEIGHT), MAX_VALUE_HEIGHT);
  const wrapperHeight = Math.max(0, panelHeight - titleHeight);
  const maxBarHeight = Math.max(0, panelHeight - (titleHeight + valueHeight));

  return {
    titleHeight,
    valueHeight,
    wrapperHeight,
    maxBarHeight,
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
  const formattedText = `${main.value.toFixed(1)}${options.unitSuffix || ''}`;
  const valueColor = theme.visualization.getColorByName(colorFor(main.value, thresholds));
  const title = options.displayName || main.field.config.displayName || fieldConfig.defaults.displayName || main.field.name;
  const fontSize = clamp(Math.floor(Math.min(width / 5.4, height / 7)), 10, 22);
  const { titleHeight, valueHeight, wrapperHeight, maxBarHeight } = calculateVerticalLayout(height, title);
  const segmentCount = clamp(Math.floor(maxBarHeight / LCD_CELL_WIDTH), 6, 80);
  const segmentHeight = Math.max(
    1,
    Math.floor((maxBarHeight - LCD_CELL_SPACING * segmentCount) / segmentCount)
  );
  const markerScale = clamp(Number(options.setpointMarkerScale || 1), 0.25, 5);
  const arrowDepth = 8 * markerScale;
  const arrowHeight = 9 * markerScale;
  const lineHeight = Math.max(2, 2 * markerScale);
  const setpointPosition =
    setpoint && options.showSetpoint ? 100 - ((clamp(setpoint.value, min, max) - min) / (max - min)) * 100 : undefined;

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
      {title && (
        <div
          className={styles.name}
          style={{
            height: `${titleHeight}px`,
            minHeight: `${titleHeight}px`,
            padding: '0 4px',
          }}
        >
          {title}
        </div>
      )}

      <div
        className={styles.retro}
        style={{
          height: `${wrapperHeight}px`,
          width: `${width}px`,
        }}
      >
        <div
          className={cx(
            styles.value,
            css`
              color: ${valueColor || theme.colors.text.primary};
              font-size: ${fontSize}px;
            `
          )}
          style={{
            height: `${valueHeight}px`,
            maxWidth: `${width}px`,
            width: `${width}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {formattedText}
        </div>

        <div
          className={styles.gauge}
          style={{
            height: `${maxBarHeight}px`,
          }}
        >
          {Array.from({ length: segmentCount }, (_, index) => {
            const segmentValue = min + ((max - min) / segmentCount) * index;
            const isFilled = Number.isFinite(main.value) && segmentValue <= main.value;
            const color = theme.visualization.getColorByName(colorFor(segmentValue, thresholds));
            const background = isFilled ? undefined : colorWithAlpha(color, 0.18);
            const backgroundImage = isFilled
              ? `radial-gradient(${colorWithAlpha(color, 0.95)} 10%, ${colorWithAlpha(color, 0.55)})`
              : undefined;

            return (
              <div
                className={styles.segment}
                key={index}
                style={{
                  backgroundColor: background,
                  backgroundImage,
                  height: `${segmentHeight}px`,
                  marginTop: `${LCD_CELL_SPACING}px`,
                }}
              />
            );
          })}

          {setpointPosition !== undefined && (
            <div
              className={styles.setpoint}
              data-testid="bar-gauge-setpoint-marker"
              data-marker-scale={markerScale}
              style={{ left: `${-arrowDepth}px`, right: `${-arrowDepth}px`, top: `${setpointPosition}%` }}
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
      </div>
    </div>
  );
};
