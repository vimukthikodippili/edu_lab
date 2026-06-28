import PageTitle from '@/components/PageTitle';
import AllWizard from './components/AllWizard';
export const metadata = {
  title: 'Form Wizard'
};
const WizardPage = () => {
  return <>
      <PageTitle title="Form Validation" subTitle="Forms" />
      <AllWizard />
    </>;
};
export default WizardPage;