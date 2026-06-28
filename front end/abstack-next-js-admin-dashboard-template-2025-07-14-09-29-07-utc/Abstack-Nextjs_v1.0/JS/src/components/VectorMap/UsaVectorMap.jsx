'use client';

import 'jsvectormap';
import 'jsvectormap/dist/maps/us-mill-en';
import 'jsvectormap/dist/maps/us-aea-en';
import 'jsvectormap/dist/maps/us-merc-en';
import 'jsvectormap/dist/maps/us-lcc-en';

//components
import BaseVectorMap from './BaseVectorMap';
const UsaVectorMap = ({
  width,
  height,
  options
}) => {
  return <>
            <BaseVectorMap width={width} height={height} options={options} />
        </>;
};
export default UsaVectorMap;