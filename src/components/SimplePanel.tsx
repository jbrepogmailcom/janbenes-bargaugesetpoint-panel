import React from 'react';
import { Field, FieldType, getDisplayProcessor, PanelProps } from '@grafana/data';
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

const getStyles = () => ({
  wrapper: css`
    align-items: stretch;
    background: transparent;
    display: flex;
    flex-direction: column;
    font-family: Open Sans, sans-serif;
    height: 100%;
    justify-content: stretch;
    overflow: hidden;
    position: relative;
    width: 100%;
  `,
  value: css`
    flex: 0 0 auto;
    font-weight: 600;
    line-height: 1.1;
    overflow: hidden;
    padding: 2px 4px 0;
    text-align: center;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  gaugeWrap: css`
    flex: 1 1 auto;
    min-height: 0;
    padding: 4px 8px 2px;
    position: relative;
  `,
  gauge: css`
    display: flex;
    flex-direction: column-reverse;
    gap: 3px;
    height: 100%;
    margin: 0 auto;
    max-width: 90px;
    min-width: 34px;
    position: relative;
    width: 100%;
  `,
  segment: css`
    border-radius: 2px;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12), inset 0 -1px 0 rgba(0, 0, 0, 0.45);
    flex: 1 1 0;
    min-height: 3px;
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
    border-bottom: 5px solid transparent;
    border-top: 5px solid transparent;
    height: 0;
    left: 0;
    position: absolute;
    top: -5px;
    width: 0;
  `,
  rightArrow: css`
    border-bottom: 5px solid transparent;
    border-top: 5px solid transparent;
    height: 0;
    position: absolute;
    right: 0;
    top: -5px;
    width: 0;
  `,
  name: css`
    flex: 0 0 auto;
    font-size: 13px;
    line-height: 1.15;
    overflow: hidden;
    padding: 0 4px 4px;
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

const colorFor = (value: number, min: number, max: number, steps: Array<{ color: string; value?: number | null }>) => {
  let color = steps[0]?.color || 'green';

  for (const step of steps) {
    if (step.value == null || value >= step.value) {
      color = step.color;
    }
  }

  return color;
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

  const fieldMin = main.field.config.min ?? fieldConfig.defaults.min ?? DEFAULT_MIN;
  const fieldMax = main.field.config.max ?? fieldConfig.defaults.max ?? DEFAULT_MAX;
  const min = Number.isFinite(fieldMin) ? Number(fieldMin) : DEFAULT_MIN;
  const maxCandidate = Number.isFinite(fieldMax) ? Number(fieldMax) : DEFAULT_MAX;
  const max = maxCandidate > min ? maxCandidate : min + 1;
  const thresholds = main.field.config.thresholds?.steps ?? fieldConfig.defaults.thresholds?.steps ?? [];
  const segmentCount = clamp(Math.round(options.segmentCount || 24), 6, 80);
  const filledSegments = Math.round(((clamp(main.value, min, max) - min) / (max - min)) * segmentCount);
  const display = main.field.display ?? getDisplayProcessor({ field: main.field, theme });
  const formatted = display(main.value);
  const title = main.field.config.displayName || fieldConfig.defaults.displayName || main.field.name;
  const fontSize = clamp(Math.floor(Math.min(width / 5.4, height / 7)), 10, 22);
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
      <div
        className={cx(
          styles.value,
          css`
            color: ${formatted.color || theme.colors.text.primary};
            font-size: ${fontSize}px;
          `
        )}
      >
        {formatted.text}
        {formatted.suffix}
      </div>

      <div className={styles.gaugeWrap}>
        <div className={styles.gauge}>
          {Array.from({ length: segmentCount }, (_, index) => {
            const segmentValue = min + ((index + 1) / segmentCount) * (max - min);
            const isFilled = index < filledSegments;
            const color = theme.visualization.getColorByName(colorFor(segmentValue, min, max, thresholds));

            return (
              <div
                className={styles.segment}
                key={index}
                style={{
                  background: isFilled ? color : theme.colors.background.secondary,
                  opacity: isFilled ? 0.95 : 0.55,
                }}
              />
            );
          })}

          {setpointPosition !== undefined && (
            <div className={styles.setpoint} style={{ top: `${setpointPosition}%` }}>
              <div className={styles.setpointLine} style={{ background: options.setpointColor || '#fff' }} />
              <div className={styles.leftArrow} style={{ borderLeft: `7px solid ${options.setpointColor || '#fff'}` }} />
              <div
                className={styles.rightArrow}
                style={{ borderRight: `7px solid ${options.setpointColor || '#fff'}` }}
              />
            </div>
          )}
        </div>
      </div>

      <div className={styles.name}>{title}</div>
    </div>
  );
};
