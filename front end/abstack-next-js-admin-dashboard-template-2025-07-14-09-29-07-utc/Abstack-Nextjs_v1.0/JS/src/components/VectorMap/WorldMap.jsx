'use client';

//components
import BaseVectorMap from './BaseVectorMap';
const WorldVectorMap = ({
  width,
  height,
  options
}) => {
  return <>
      <BaseVectorMap width={width} height={height} options={options} />
    </>;
};
export default WorldVectorMap;