import PageTitle from '@/components/PageTitle';
import AllAlert from './components/AllAlert';
export const metadata = {
  title: 'Sweet Alert 2'
};
const SweetAlert = () => {
  return <>
      <PageTitle title="Sweet Alert 2" subTitle="Extended UI" />
      <AllAlert />
    </>;
};
export default SweetAlert;