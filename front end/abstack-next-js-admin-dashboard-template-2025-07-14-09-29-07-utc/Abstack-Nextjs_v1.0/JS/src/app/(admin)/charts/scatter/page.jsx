import PageTitle from '@/components/PageTitle';
import AllScatterChart from './components/AllScatterChart';
export const metadata = {
  title: 'Apex Scatter Charts'
};
const ScatterChart = () => {
  return <>
      <PageTitle title="Scatter Charts" subTitle="Apex" />
      <AllScatterChart />
    </>;
};
export default ScatterChart;