import PageTitle from '@/components/PageTitle';
import AllColumnChart from './Components/AllColumnChart';
export const metadata = {
  title: 'Apex Column Charts'
};
const ColumnChart = () => {
  return <>
      <PageTitle title="Candlestick Charts" subTitle="Apex" />
      <AllColumnChart />
    </>;
};
export default ColumnChart;