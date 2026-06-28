import React from 'react';
import AllModal from './components/AllModal';
import PageTitle from '@/components/PageTitle';
export const metadata = {
  title: 'Modals'
};
const Modals = () => {
  return <>
      <PageTitle title="Modals" subTitle="Base UI" />
      <AllModal />
    </>;
};
export default Modals;