import PageTitle from '@/components/PageTitle';
import SparkChart from './components/SparkChart';
export const metadata = {
  title: 'Apex Sparklines Charts'
};
const SparkLinesChart = () => {
  return <>
      <PageTitle title="Sparklines Charts" subTitle="Apex" />
      <SparkChart />
    </>;
};
export default SparkLinesChart;