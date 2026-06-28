import PageTitle from '@/components/PageTitle';
import AllCandlestick from './components/AllCandlestick';
export const metadata = {
  title: 'Apex Candlestick Charts'
};
const Candlestick = () => {
  return <>
      <PageTitle title="Candlestick Charts" subTitle="Apex" />
      <AllCandlestick />
    </>;
};
export default Candlestick;