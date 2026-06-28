'use client';

import { NotificationProvider } from '@/context/useNotificationContext';
import { SessionProvider } from 'next-auth/react';
import dynamic from 'next/dynamic';
import { ToastContainer } from 'react-toastify';
const LayoutProvider = dynamic(() => import('@/context/useLayoutContext').then(mod => mod.LayoutProvider), {
  ssr: false
});
const AppProvidersWrapper = ({
  children
}) => {
  return <>
      <SessionProvider>
        <LayoutProvider>
          <NotificationProvider>
            {children}
            <ToastContainer theme="colored" />
          </NotificationProvider>
        </LayoutProvider>
      </SessionProvider>
    </>;
};
export default AppProvidersWrapper;