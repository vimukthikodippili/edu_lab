import PageTitle from '@/components/PageTitle';
import AllDragula from './components/AllDragula';
export const metadata = {
  title: 'Dragula'
};
const Dragula = () => {
  return <>
      <PageTitle title="Dragula" subTitle="Extended UI" />
      <AllDragula />
    </>;
};
export default Dragula;