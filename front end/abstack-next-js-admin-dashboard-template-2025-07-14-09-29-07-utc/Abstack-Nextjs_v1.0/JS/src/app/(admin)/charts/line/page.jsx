import PageTitle from '@/components/PageTitle';
import AllLineChart from './components/AllLineChart';
export const metadata = {
  title: 'Apex Line Charts'
};
const LineChart = () => {
  return <>
      <PageTitle title="Line Charts" subTitle="Apex" />
      <AllLineChart />
    </>;
};
export default LineChart;