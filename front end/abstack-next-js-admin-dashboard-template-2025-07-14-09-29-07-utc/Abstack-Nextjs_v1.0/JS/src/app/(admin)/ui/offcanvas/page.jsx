import PageTitle from '@/components/PageTitle';
import AllOffcanvas from './components/AllOffcanvas';
export const metadata = {
  title: 'OffCanvas'
};
const Offcanvas = () => {
  return <>
      <PageTitle title="Offcanvas" subTitle="Base UI" />
      <AllOffcanvas />
    </>;
};
export default Offcanvas;