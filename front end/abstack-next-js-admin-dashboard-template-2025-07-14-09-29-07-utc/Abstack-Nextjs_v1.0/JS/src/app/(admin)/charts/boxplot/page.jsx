import PageTitle from '@/components/PageTitle';
import AllBoxplotChart from './components/AllBoxplotChart';
export const metadata = {
  title: 'Apex Boxplot Charts'
};
const BoxplotChart = () => {
  return <>
      <PageTitle title="Boxplot Charts" subTitle="Apex" />
      <AllBoxplotChart />
    </>;
};
export default BoxplotChart;