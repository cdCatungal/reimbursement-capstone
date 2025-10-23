// src/utils/approvalFlow.js

// Define all possible approval chains based on submitter's role
const approvalFlows = {
  Employee: ["SUL", "Account Manager", "Invoice Specialist", "Finance Officer"],
  SUL: ["SuperAdmin", "Invoice Specialist", "Finance Officer"],
  "Account Manager": ["SuperAdmin", "Invoice Specialist", "Finance Officer"],
  "Invoice Specialist": ["SuperAdmin", "Invoice Specialist", "Finance Officer"],
};

/**
 * Get the full approval flow for a submitter
 * @param {string} submitterRole - The role of the person submitting
 * @returns {Array} Array of approval roles in order
 */
export function getApprovalFlow(submitterRole) {
  return approvalFlows[submitterRole] || [];
}

/**
 * Get the next approver role in the sequence
 * @param {string} submitterRole - The role of the submitter
 * @param {string} currentApproverRole - Current approver's role
 * @returns {string|null} Next approver role or null if complete
 */
export function getNextApprover(submitterRole, currentApproverRole = null) {
  const flow = approvalFlows[submitterRole];
  if (!flow || flow.length === 0) return null;

  // If no current approver, return the first in the flow
  if (!currentApproverRole) return flow[0];

  // Otherwise, find next in sequence
  const idx = flow.indexOf(currentApproverRole);
  if (idx === -1) return null;
  return flow[idx + 1] || null; // return null if last approver
}