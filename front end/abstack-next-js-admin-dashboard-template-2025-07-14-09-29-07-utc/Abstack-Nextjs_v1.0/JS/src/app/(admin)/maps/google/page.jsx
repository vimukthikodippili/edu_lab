import PageTitle from '@/components/PageTitle';
import AllGoogleMap from './components/AllGoogleMap';
export const metadata = {
  title: 'Google Maps'
};
const GoogleMaps = () => {
  return <>
      <PageTitle title="Google Maps" subTitle="Maps" />
      <AllGoogleMap />
    </>;
};
export default GoogleMaps;