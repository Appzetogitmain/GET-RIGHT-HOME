// frontend/src/hooks/useLeadCapture.js
// Centralized lead capture hook for all user actions across cards, detail pages, and profiles

import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useEnquiryModal } from '../context/EnquiryModalContext';
import { enquiryService } from '../services/apiService';
import { getRequirementSnapshot } from '../utils/requirementSnapshot';

export const useLeadCapture = () => {
  const { user } = useAuth();
  const { openEnquiryModal } = useEnquiryModal();

  const captureLeadAndExecute = useCallback(async ({
    targetId,
    targetType = 'property',
    actionType = 'call',
    sourceContext = 'property_card',
    propertyData = null,
    brokerData = null,
    builderData = null,
    message = '',
    preferredDate = null,
    timeSlot = '',
    budget = 0,
    onExecute = null
  }) => {
    const isLoggedIn = !!(user || localStorage.getItem('user'));
    const requirement = getRequirementSnapshot(propertyData);

    const payload = {
      targetId,
      targetType: targetType.toLowerCase(),
      actionType,
      sourceContext,
      sourceUrl: window.location.href,
      requirement,
      message,
      preferredDate,
      timeSlot,
      budget: budget || requirement.budgetMax || 0
    };

    if (targetType.toLowerCase() === 'property' || targetType.toLowerCase() === 'owner') {
      payload.propertyId = targetId;
    } else if (targetType.toLowerCase() === 'broker') {
      payload.brokerId = targetId;
    } else if (targetType.toLowerCase() === 'builder') {
      payload.builderId = targetId;
    }

    if (isLoggedIn) {
      // 1. Logged in: Submit lead in background (fire-and-forget, zero blocking)
      enquiryService.create(payload).catch(err => {
        console.warn('Background lead capture error:', err);
      });

      // 2. Immediately execute the intended action
      if (typeof onExecute === 'function') {
        onExecute();
      }
    } else {
      // 3. Logged out: Open Enquiry OTP modal to verify & auto-resume action
      openEnquiryModal({
        targetId,
        targetType: targetType.toLowerCase(),
        actionType,
        sourceContext,
        propertyData,
        brokerData,
        builderData,
        requirement,
        message,
        preferredDate,
        timeSlot,
        budget: payload.budget,
        onSuccess: () => {
          if (typeof onExecute === 'function') {
            onExecute();
          }
        }
      });
    }
  }, [user, openEnquiryModal]);

  return { captureLeadAndExecute };
};

export default useLeadCapture;
