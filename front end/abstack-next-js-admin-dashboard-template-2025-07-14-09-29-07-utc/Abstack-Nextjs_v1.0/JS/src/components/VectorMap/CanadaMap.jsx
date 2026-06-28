'use client';

import 'jsvectormap';
import 'jsvectormap/dist/maps/canada';

//components
import BaseVectorMap from './BaseVectorMap';
const CanadaVectorMap = ({
  width,
  height,
  options
}) => {
  return <>
      <BaseVectorMap width={width} height={height} options={options} />
    </>;
};
export default CanadaVectorMap;