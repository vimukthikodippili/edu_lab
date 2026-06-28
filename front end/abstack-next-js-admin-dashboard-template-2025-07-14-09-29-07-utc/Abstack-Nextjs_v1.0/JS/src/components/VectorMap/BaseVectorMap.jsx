'use client';

import { useEffect, useState } from 'react';
import 'jsvectormap';
import 'jsvectormap/dist/maps/world';
import 'jsvectormap/dist/maps/world-merc';
import 'jsvectormap/src/scss/jsvectormap.scss';
const BaseVectorMap = ({
  width,
  height,
  options
}) => {
  const selectorId = options.map + new Date().getTime().toString();
  const [map, setMap] = useState();
  useEffect(() => {
    if (!map) {
      // create jsvectormap
      const map = new window['jsVectorMap']({
        selector: '#' + selectorId,
        ...options
      });
      setMap(map);
    }
  }, [selectorId, map, options]);
  return <>
            <div id={selectorId} style={{
      width: width,
      height: height
    }}></div>
        </>;
};
export default BaseVectorMap;