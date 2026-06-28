'use client';

import React from 'react';
import SimpleBar from 'simplebar-react';
const SimplebarReactClient = React.forwardRef(({
  children,
  ...options
}, ref) => {
  return <SimpleBar {...options} ref={ref}>
      {children}
    </SimpleBar>;
});
SimplebarReactClient.displayName = 'SimplebarReactClient';
export default SimplebarReactClient;