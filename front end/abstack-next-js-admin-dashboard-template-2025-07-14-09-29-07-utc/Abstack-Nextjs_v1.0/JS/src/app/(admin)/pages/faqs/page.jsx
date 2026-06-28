import React from 'react';
import Faqs from './components/Faqs';
import PageTitle from '@/components/PageTitle';
export const metadata = {
  title: 'FAQ'
};
const FaqsPage = () => {
  return <>
      <PageTitle title="FAQ" subTitle="Pages" />
      <Faqs />
    </>;
};
export default FaqsPage;