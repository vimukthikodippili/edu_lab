import PageTitle from '@/components/PageTitle';
import AllSelect from './components/AllSelect';
export const metadata = {
  title: 'Form Select'
};
const SelectForm = () => {
  return <>
      <PageTitle title="Form Select" subTitle="Forms" />
      <AllSelect />
    </>;
};
export default SelectForm;