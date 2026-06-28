import PageTitle from '@/components/PageTitle';
import React from 'react';
import AllCollapse from './components/AllCollapse';
export const metadata = {
  title: 'Collapse'
};
const CollapsePage = () => {
  return <>
      <PageTitle title="Collapse" subTitle="Base UI" />
      <AllCollapse />
    </>;
};
export default CollapsePage;