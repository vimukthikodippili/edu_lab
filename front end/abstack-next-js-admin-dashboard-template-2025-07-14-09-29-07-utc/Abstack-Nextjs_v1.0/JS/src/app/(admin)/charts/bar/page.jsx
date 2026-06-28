import PageTitle from '@/components/PageTitle';
import AllBarChart from './components/AllBarChart';
export const metadata = {
  title: 'Apex Bar Charts'
};
const BarChart = () => {
  return <>
      <PageTitle title="Bar Charts" subTitle="Apex" />
      <AllBarChart />
    </>;
};
export default BarChart;