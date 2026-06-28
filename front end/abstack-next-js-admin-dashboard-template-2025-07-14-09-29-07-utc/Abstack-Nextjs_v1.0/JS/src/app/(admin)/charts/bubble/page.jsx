import PageTitle from '@/components/PageTitle';
import AllBubbleChart from './components/AllBubbleChart';
export const metadata = {
  title: 'Apex Bubble Charts'
};
const BubbleChart = () => {
  return <>
      <PageTitle title="Bubble Charts" subTitle="Apex" />
      <AllBubbleChart />
    </>;
};
export default BubbleChart;