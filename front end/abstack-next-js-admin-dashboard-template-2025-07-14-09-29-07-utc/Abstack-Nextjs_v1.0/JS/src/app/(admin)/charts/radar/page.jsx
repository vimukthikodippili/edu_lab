import PageTitle from '@/components/PageTitle';
import AllRadarChart from './components/AllRadarChart';
export const metadata = {
  title: 'Apex Radar Charts'
};
const RadarChart = () => {
  return <>
      <PageTitle title="Radar Charts" subTitle="Apex" />
      <AllRadarChart />
    </>;
};
export default RadarChart;