import React, { createContext, useContext, useState } from 'react';

const EnquiryModalContext = createContext();

export const useEnquiryModal = () => useContext(EnquiryModalContext);

export const EnquiryModalProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const [modalPayload, setModalPayload] = useState({
    targetId: null,
    targetType: 'Property',
    actionType: 'call',
    onSuccess: null,
  });

  const openEnquiryModal = (payload) => {
    setModalPayload({
      targetId: payload.targetId || null,
      targetType: payload.targetType || 'Property',
      actionType: payload.actionType || 'call',
      onSuccess: payload.onSuccess || null
    });
    setIsOpen(true);
  };

  const closeEnquiryModal = () => {
    setIsOpen(false);
  };

  return (
    <EnquiryModalContext.Provider value={{ isOpen, modalPayload, openEnquiryModal, closeEnquiryModal }}>
      {children}
    </EnquiryModalContext.Provider>
  );
};
