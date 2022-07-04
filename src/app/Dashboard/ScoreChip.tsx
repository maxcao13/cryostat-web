import React from 'react';
import { Grid, GridItem, Label, LabelGroup } from '@patternfly/react-core';
import InfoCircleIcon from '@patternfly/react-icons/dist/esm/icons/info-circle-icon';
import { Chart, ChartAxis, ChartGroup, ChartLine, ChartVoronoiContainer } from '@patternfly/react-charts';

export const ScoreChip: React.FunctionComponent = () => (<>
  <Grid>
    <GridItem span={6}>
      <LabelGroup categoryName="Critical" isVertical numLabels={3}>
        <Label icon={<InfoCircleIcon />} color="red">Heap Content: 97</Label>
        <Label icon={<InfoCircleIcon />} color="red">
        G1/CMS Full Collection: 100
        </Label>
        <Label icon={<InfoCircleIcon />} color="red" isTruncated>
        Discouraged Management Agent Settings: 100
        </Label>
        <Label icon={<InfoCircleIcon />} color="red">
        Discouraged Management Agent Settings: 100
        </Label>
        <Label icon={<InfoCircleIcon />} color="red">
        Discouraged Management Agent Settings: 100
        </Label>
      </LabelGroup>
    </GridItem>

    <GridItem span={6}>
      <LabelGroup categoryName="Warning" isVertical >
      <Label icon={<InfoCircleIcon />} color="orange">GC Pressure: 26</Label>
      <Label icon={<InfoCircleIcon />} color="orange">
      High JVM CPU Load: 50
      </Label>
      <Label icon={<InfoCircleIcon />} color="orange">
      Discouraged Recording Settings: 50
      </Label>
      </LabelGroup>
    </GridItem>

  </Grid>
</> );