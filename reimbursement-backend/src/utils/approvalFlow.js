// src/utils/approvalFlow.js
export const approvalFlow = ['Manager', 'Michelle', 'Grace'];

export function getNextApprover(currentRole) {
  const idx = approvalFlow.indexOf(currentRole);
  if (idx === -1) return approvalFlow[0]; // default first
  return idx < approvalFlow.length - 1 ? approvalFlow[idx + 1] : null;
}