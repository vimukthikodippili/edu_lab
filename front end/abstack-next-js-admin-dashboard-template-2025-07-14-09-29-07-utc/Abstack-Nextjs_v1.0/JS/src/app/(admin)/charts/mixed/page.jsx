import PageTitle from '@/components/PageTitle';
import AllMixedChart from './components/AllMixedChart';
export const metadata = {
  title: 'Apex Mixed Charts'
};
const MixedChart = () => {
  return <>
      <PageTitle title="Mixed Charts" subTitle="Apex" />
      <AllMixedChart />
    </>;
};
export default MixedChart;