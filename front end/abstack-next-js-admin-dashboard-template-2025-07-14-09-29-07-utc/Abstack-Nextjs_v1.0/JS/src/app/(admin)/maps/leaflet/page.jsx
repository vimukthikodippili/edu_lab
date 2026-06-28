import PageTitle from '@/components/PageTitle';
import React from 'react';
import AllLeaflet from './components/AllLeaflet';
export const metadata = {
  title: 'Leaflet Maps'
};
const LeafletMaps = () => {
  return <>
      <PageTitle title="Leaflet Maps" subTitle="Maps" />
      <AllLeaflet />
    </>;
};
export default LeafletMaps;