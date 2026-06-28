import PageTitle from '@/components/PageTitle';
import AllEditors from './components/AllEditors';
export const metadata = {
  title: 'Editors'
};
const EditorsPage = () => {
  return <>
      <PageTitle title="Editors" subTitle="Forms" />
      <AllEditors />
    </>;
};
export default EditorsPage;