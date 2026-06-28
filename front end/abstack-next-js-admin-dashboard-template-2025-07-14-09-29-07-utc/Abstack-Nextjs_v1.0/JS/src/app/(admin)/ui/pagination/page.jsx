import PageTitle from '@/components/PageTitle';
import AllPagination from './components/AllPagination';
export const metadata = {
  title: 'Pagination}'
};
const Pagination = () => {
  return <>
      <PageTitle title="Pagination" subTitle="Base UI" />
      <AllPagination />
    </>;
};
export default Pagination;