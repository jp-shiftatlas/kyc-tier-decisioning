// lib/chrome/regulatoryReferences.ts
// Shared regulatory + architecture reference content for the page chrome.
// Consumed by both PageFooter (bottom bar) and ReferencesSidebar (left
// panel at lg+). Single source of truth — if ruleset_v1.md adds/removes
// anchors, update only here.
//
// Anchors lifted from ruleset_v1.md lines 23–37 (Regulatory Anchor Stack
// short-form). Statements locked verbatim per PRIMARY_PROMPT.md §6.7.

export const REGULATORY_ANCHORS: readonly string[] = [
  'MORB §921 / MORNBFI §921Q',
  'MORB §923 / MORNBFI §923Q',
  'BSP Circular 1170 (Mar 2023)',
  'BSP Circular 1218 (Sept 2025)',
  'BSP Memorandum M-2023-029',
  'BSP Memorandum M-2026-005',
  'BSP Circular 1230 (Feb 27, 2026)',
  'AMLA / RA 9160',
  'DPA / RA 10173',
  'NPC Advisory 2024-04',
  'FATF Recommendations 10–12',
  'RA 11055 (PhilSys Act)',
];

export const ARCHITECTURE_STATEMENTS: readonly string[] = [
  'Reference architecture: deployed via Amazon Bedrock in client AWS environment',
  'Customer data never leaves client infrastructure',
  'Final decision authority rests with the compliance analyst',
];

export const SHIFT_ATLAS_ATTRIBUTION = 'Shift Atlas Consulting · kyc.shiftatlas.tech';
