import { css } from '@emotion/css';
import React from 'react';
import { VizLegend, useStyles2 } from '@grafana/ui';
import { LegendDisplayMode, LegendPlacement } from '@grafana/schema';

import { WaveformLegendItem } from 'data/legend';

interface Props {
  /**
   * Read straight off this element by `VizLayout`, which destructures the
   * `legend` element's props to decide the layout direction and the size it
   * hands the chart. It has to stay a top-level prop under this exact name.
   */
  placement: LegendPlacement;
  displayMode: LegendDisplayMode;
  sortBy?: string;
  sortDesc?: boolean;
  items: WaveformLegendItem[];
  onSeriesClick: (key: string, ctrl: boolean) => void;
}

export const WaveformsLegend: React.FC<Props> = ({
  placement,
  displayMode,
  sortBy,
  sortDesc,
  items,
  onSeriesClick,
}) => {
  const styles = useStyles2(getStyles);

  return (
    <VizLegend
      className={styles.legend}
      placement={placement}
      displayMode={displayMode}
      items={items}
      sortBy={sortBy}
      sortDesc={sortDesc}
      isSortable={true}
      onLabelClick={(item, event) => {
        const ctrl = event?.ctrlKey || event?.metaKey; // support macOS cmd key
        const clickedKey = item.data?.custom?.key;
        if (!clickedKey) {
          return;
        }

        onSeriesClick(clickedKey, ctrl);
      }}
    />
  );
};

const getStyles = () => ({
  legend: css({
    div: {
      justifyContent: 'flex-start',
    },
  }),
});
