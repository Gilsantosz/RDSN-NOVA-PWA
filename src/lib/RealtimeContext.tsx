import React, { createContext, useContext, useState } from 'react';

const RealtimeContext = createContext({
  status: 'DISCONNECTED',
  setStatus: (status: string) => {}
});

export const RealtimeProvider = ({ children }) => {
  const [status, setStatus] = useState('DISCONNECTED');

  return (
    <RealtimeContext.Provider value={{ status, setStatus }}>
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = () => useContext(RealtimeContext);
