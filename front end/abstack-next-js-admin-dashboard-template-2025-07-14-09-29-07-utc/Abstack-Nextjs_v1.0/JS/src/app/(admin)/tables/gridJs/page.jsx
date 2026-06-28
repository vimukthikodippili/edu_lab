import PageTitle from '@/components/PageTitle';
import { getAllDataTableRecords } from '@/helpers/data';
import AllDataTable from './components/AllDataTable';
export const metadata = {
  title: 'Grid Js Tables'
};
const GridJs = async () => {
  const dataTableRecords = await getAllDataTableRecords();
  return <>
      <PageTitle title="Grid Js Tables" subTitle="Tables" />
      <AllDataTable dataTableRecords={dataTableRecords} />
    </>;
};
export default GridJs;