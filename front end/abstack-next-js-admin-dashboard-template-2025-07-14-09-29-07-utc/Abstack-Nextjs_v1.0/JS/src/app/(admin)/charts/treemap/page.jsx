import PageTitle from '@/components/PageTitle';
import AllTreemap from './components/AllTreemap';
export const metadata = {
  title: 'Apex Treemap Charts'
};
const page = () => {
  return <>
      <PageTitle title="Treemap Charts" subTitle="Apex" />
      <AllTreemap />
    </>;
};
export default page;