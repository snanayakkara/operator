/**
 * ValveSizingPage - Presentation valve sizing view
 *
 * Renders the full 4-column valve sizing grid using the static HTML generator.
 */

import React, { useMemo } from 'react';
import type { TAVIWorkupItem } from '@/types/taviWorkup.types';
import { ValveSizingServiceV2 } from '@/services/ValveSizingServiceV2';
import { generateValveSizingHTML } from '@/sidepanel/components/taviWorkup/ValveSizingTab';
import { PlanCommandCard } from './PlanCommandCard';

interface ValveSizingPageProps {
  workup: TAVIWorkupItem;
  planPinned: boolean;
}

export const ValveSizingPage: React.FC<ValveSizingPageProps> = ({
  workup,
  planPinned
}) => {
  const service = ValveSizingServiceV2.getInstance();
  const area = workup.ctMeasurements?.annulusArea ?? workup.ctMeasurements?.annulusAreaMm2;
  const perimeter = workup.ctMeasurements?.annulusPerimeter ?? workup.ctMeasurements?.annulusPerimeterMm;
  const hasMeasurements =
    Number.isFinite(area ?? Number.NaN) &&
    Number.isFinite(perimeter ?? Number.NaN);
  const validation = hasMeasurements
    ? service.validateMeasurements(area as number, perimeter as number)
    : { valid: false, message: 'Enter annulus area and perimeter to view sizing.' };

  const sizingHtml = useMemo(() => {
    if (!hasMeasurements || !validation.valid) {
      return '';
    }
    return generateValveSizingHTML(area as number, perimeter as number, workup.selectedValve);
  }, [area, perimeter, hasMeasurements, validation.valid, workup.selectedValve]);

  const emptyMessage = !hasMeasurements
    ? 'Enter annulus area and perimeter in CT measurements to view valve sizing.'
    : validation.message || 'Measurements are out of range for valve sizing.';

  return (
    <div className={`valve-sizing-layout ${planPinned ? 'plan-pinned' : 'plan-hidden'}`}>
      <div className="valve-sizing-container">
        {validation.valid && sizingHtml ? (
          <div
            className="valve-sizing-html"
            dangerouslySetInnerHTML={{ __html: sizingHtml }}
          />
        ) : (
          <div className="valve-sizing-empty">
            <h3>Valve sizing unavailable</h3>
            <p>{emptyMessage}</p>
          </div>
        )}
      </div>

      {planPinned && (
        <div className="valve-sizing-plan-rail">
          <PlanCommandCard
            workup={workup}
            isFocused={false}
            isExpanded={true}
            onClick={() => {}}
            onToggleExpand={() => {}}
          />
        </div>
      )}
    </div>
  );
};

export default ValveSizingPage;
