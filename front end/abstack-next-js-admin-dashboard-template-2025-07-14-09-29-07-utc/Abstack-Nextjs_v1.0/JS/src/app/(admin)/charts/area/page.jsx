import PageTitle from '@/components/PageTitle';
import AllAreaChart from './components/AllAreaChart';
export const metadata = {
  title: 'Apex Area Chart'
};
const Area = () => {
  return <>
      <PageTitle title="Area Charts" subTitle="Apex" />
      <AllAreaChart />
    </>;
};
export default Area;