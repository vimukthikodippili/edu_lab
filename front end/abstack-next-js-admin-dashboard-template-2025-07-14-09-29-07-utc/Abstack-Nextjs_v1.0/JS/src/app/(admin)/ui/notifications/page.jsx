import PageTitle from '@/components/PageTitle';
import React from 'react';
import AllNotifications from './components/AllNotifications';
export const metadata = {
  title: 'Notifications'
};
const Notifications = () => {
  return <>
      <PageTitle title="Notifications" subTitle="Base UI" />
      <AllNotifications />
    </>;
};
export default Notifications;