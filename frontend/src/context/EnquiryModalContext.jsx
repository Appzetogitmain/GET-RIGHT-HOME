import React, { createContext, useContext, useState } from 'react';

const EnquiryModalContext = createContext();

export const useEnquiryModal = () => useContext(EnquiryModalContext);

export const EnquiryModalProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const [modalPayload, setModalPayload] = useState({
    targetId: null,
    targetType: 'property',
    actionType: 'call',
    sourceContext: 'detail_page',
    requirement: null,
    propertyData: null,
    brokerData: null,
    builderData: null,
    message: '',
    preferredDate: null,
    timeSlot: '',
    budget: 0,
    onSuccess: null,
  });

  const openEnquiryModal = (payload) => {
    setModalPayload({
      targetId: payload.targetId || null,
      targetType: (payload.targetType || 'property').toLowerCase(),
      actionType: payload.actionType || 'call',
      sourceContext: payload.sourceContext || 'detail_page',
      requirement: payload.requirement || null,
      propertyData: payload.propertyData || null,
      brokerData: payload.brokerData || null,
      builderData: payload.builderData || null,
      message: payload.message || '',
      preferredDate: payload.preferredDate || null,
      timeSlot: payload.timeSlot || '',
      budget: payload.budget || 0,
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
