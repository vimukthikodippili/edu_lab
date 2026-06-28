import PageTitle from '@/components/PageTitle';
import AllRadialBarChart from './components/AllRadialBarChart';
export const metadata = {
  title: 'Apex RadialBar Charts'
};
const RadialBar = () => {
  return <>
      <PageTitle title="RadialBar Charts" subTitle="Apex" />
      <AllRadialBarChart />
    </>;
};
export default RadialBar;