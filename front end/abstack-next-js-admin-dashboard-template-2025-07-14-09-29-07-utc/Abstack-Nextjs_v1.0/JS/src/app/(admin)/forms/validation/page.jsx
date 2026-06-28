import PageTitle from '@/components/PageTitle';
import AllValidation from './components/AllValidation';
export const metadata = {
  title: 'Form Validation'
};
const ValidationPage = () => {
  return <>
      <PageTitle title="Form Validation" subTitle="Forms" />
      <AllValidation />
    </>;
};
export default ValidationPage;