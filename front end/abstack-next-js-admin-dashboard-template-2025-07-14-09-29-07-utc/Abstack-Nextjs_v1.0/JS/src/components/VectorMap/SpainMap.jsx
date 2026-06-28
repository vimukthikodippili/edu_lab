'use client';

import 'jsvectormap';
import 'jsvectormap/dist/maps/spain.js';

//components
import BaseVectorMap from './BaseVectorMap';
const SpainVectorMap = ({
  width,
  height,
  options
}) => {
  return <>
      <BaseVectorMap width={width} height={height} options={options} />
    </>;
};
export default SpainVectorMap;