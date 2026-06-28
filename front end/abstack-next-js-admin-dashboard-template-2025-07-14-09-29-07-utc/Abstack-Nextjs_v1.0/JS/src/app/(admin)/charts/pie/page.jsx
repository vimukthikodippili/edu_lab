import PageTitle from '@/components/PageTitle';
import AllPieChart from './components/AllPieChart';
export const metadata = {
  title: 'Apex Pie Charts'
};
const PieChart = () => {
  return <>
      <PageTitle title="Pie Charts" subTitle="Apex" />
      <AllPieChart />
    </>;
};
export default PieChart;