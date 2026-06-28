import PageTitle from '@/components/PageTitle';
import AllPolarChart from './components/AllPolarChart';
export const metadata = {
  title: 'Apex Polar Area Charts'
};
const PolarChart = () => {
  return <>
      <PageTitle title="Polar Area Charts" subTitle="Apex" />
      <AllPolarChart />
    </>;
};
export default PolarChart;