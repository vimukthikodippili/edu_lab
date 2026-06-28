import PageTitle from '@/components/PageTitle';
import AllTimeLineChart from './components/AllTimeLineChart';
export const metadata = {
  title: 'Apex Timeline Chart'
};
const TimelineChart = () => {
  return <>
      <PageTitle title="Timeline Charts" subTitle="Apex" />
      <AllTimeLineChart />
    </>;
};
export default TimelineChart;