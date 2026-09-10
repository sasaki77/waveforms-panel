import { css } from '@emotion/css';
import React, { useEffect, useState } from 'react';
import { Slider, Tooltip as GrafanaTooltip, useStyles2 } from '@grafana/ui';

import { makeMarks } from 'data/marks';

/** Height the slider reserves at the bottom of the panel. */
export const SLIDER_HEIGHT = 50;

const sliderWidthBorder = 600;

interface Props {
  width: number;
  marks: ReturnType<typeof makeMarks>;
  max: number;
  value: number;
  onChange: (value: number) => void;
  /** Shown in the tooltip while the handle is dragged. */
  label: string;
}

export const WaveformsSlider: React.FC<Props> = ({ width, marks, max, value, onChange, label }) => {
  const [isDragging, setIsDragging] = useState(false);
  const styles = useStyles2(getStyles);

  // Keep the tooltip open while the slider handle is dragged, even if the
  // pointer leaves the slider area.
  useEffect(() => {
    if (!isDragging) {
      return;
    }

    const stopDragging = () => setIsDragging(false);

    window.addEventListener('pointerup', stopDragging);
    window.addEventListener('pointercancel', stopDragging);

    return () => {
      window.removeEventListener('pointerup', stopDragging);
      window.removeEventListener('pointercancel', stopDragging);
    };
  }, [isDragging]);

  return (
    <div
      style={{
        width: width > sliderWidthBorder ? width - 300 : width * 0.6,
        height: SLIDER_HEIGHT,
        marginLeft: 'auto',
        marginRight: 'auto',
      }}
      // Tooltip overwrites the handlers of its child element, so the drag
      // start is detected on this wrapper instead.
      onPointerDown={() => setIsDragging(true)}
    >
      <GrafanaTooltip
        content={label}
        // `undefined` restores the default hover behaviour
        show={isDragging || undefined}
      >
        <div className={styles.slider}>
          <Slider
            included={false}
            marks={width > sliderWidthBorder ? marks : []}
            max={max}
            min={0}
            orientation="horizontal"
            value={value}
            onChange={onChange}
            showInput={false}
            inputId=""
          />
        </div>
      </GrafanaTooltip>
    </div>
  );
};

const getStyles = () => ({
  slider: css({
    '.rc-slider-mark-text': {
      whiteSpace: 'nowrap',
    },
  }),
});
