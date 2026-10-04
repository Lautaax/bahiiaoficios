import React from 'react';
import { ServiceLanding, ServiceLandingProps } from './ServiceLanding';

/**
 * Backward compatibility wrapper for ProfessionLanding.
 * Delegates directly to the unified ServiceLanding component.
 */
export const ProfessionLanding: React.FC<ServiceLandingProps> = (props) => {
  return <ServiceLanding {...props} />;
};

export default ProfessionLanding;
