import { SPACING_SCALE } from '../shared/constants';

export interface SpacingIssue {
  value: number;
  count: number;
  suggestedValue: number;
  suggestedName: string;
  delta: number;
}

/**
 * Check spacing values for consistency against the spacing scale.
 * Flags values within ±2px of a scale value that aren't exact matches.
 */
export function checkSpacingConsistency(spacings: any[]): SpacingIssue[] {
  var issues: SpacingIssue[] = [];
  var scaleEntries = Object.keys(SPACING_SCALE).map(function(name) {
    return { name: name, value: SPACING_SCALE[name] };
  });

  for (var i = 0; i < spacings.length; i++) {
    var sp = spacings[i];
    var val = Math.round(sp.value);
    if (val <= 0) continue;

    // Check if it's an exact match to any scale value
    var isExact = false;
    for (var j = 0; j < scaleEntries.length; j++) {
      if (val === scaleEntries[j].value) {
        isExact = true;
        break;
      }
    }
    if (isExact) continue;

    // Find the closest scale value
    var closestName = '';
    var closestValue = 0;
    var closestDelta = Infinity;
    for (var k = 0; k < scaleEntries.length; k++) {
      var delta = Math.abs(val - scaleEntries[k].value);
      if (delta < closestDelta) {
        closestDelta = delta;
        closestValue = scaleEntries[k].value;
        closestName = scaleEntries[k].name;
      }
    }

    // Only flag if within ±2px of a scale value (near-miss)
    if (closestDelta <= 2 && closestDelta > 0) {
      issues.push({
        value: val,
        count: sp.count,
        suggestedValue: closestValue,
        suggestedName: closestName,
        delta: closestDelta,
      });
    }
  }

  return issues;
}
