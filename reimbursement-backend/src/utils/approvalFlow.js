// src/utils/approvalFlow.js

// ✅ UPDATED: Approval flows based on submitter's role
const approvalFlows = {
  Employee: ["SUL", "Account Manager", "Invoice Specialist", "Finance Officer"],
  SUL: ["Sales Director", "Invoice Specialist", "Finance Officer"],
  "Account Manager": ["Sales Director", "Invoice Specialist", "Finance Officer"],
  "Invoice Specialist": ["Sales Director", "Invoice Specialist", "Finance Officer"],
};

// Roles that don't need SAP code matching
const NON_SAP_DEPENDENT_ROLES = ["Sales Director", "Invoice Specialist", "Finance Officer"];

/**
 * Get the full approval flow for a submitter
 */
export function getApprovalFlow(submitterRole) {
  return approvalFlows[submitterRole] || [];
}

/**
 * Get the next approver role in the sequence
 */
export function getNextApprover(submitterRole, currentApproverRole = null) {
  const flow = approvalFlows[submitterRole];
  if (!flow || flow.length === 0) return null;

  if (!currentApproverRole) return flow[0];

  const idx = flow.indexOf(currentApproverRole);
  if (idx === -1) return null;
  return flow[idx + 1] || null;
}

/**
 * Check if a role requires SAP code matching for approval
 */
export function requiresSapCodeMatch(role) {
  return !NON_SAP_DEPENDENT_ROLES.includes(role);
}

/**
 * ✅ NEW: Find SUL assigned to an employee
 * @param {Object} employee - Employee user object with assignedSUL included
 * @returns {Object|null} Assigned SUL user or null
 */
export function findAssignedSUL(employee) {
  if (!employee) return null;
  
  // Check if assignedSUL is already loaded (from include)
  if (employee.assignedSUL) {
    return employee.assignedSUL;
  }
  
  // Check if assigned_sul_id exists
  if (employee.assigned_sul_id) {
    console.log(`✅ Employee ${employee.name} has assigned SUL ID: ${employee.assigned_sul_id}`);
    return { id: employee.assigned_sul_id }; // Return minimal object for further query
  }
  
  console.log(`⚠️ Employee ${employee.name} has NO assigned SUL`);
  return null;
}

/**
 * ✅ NEW: Find Account Manager assigned to a SAP Code
 * @param {string} sapCodeValue - SAP code string (e.g., "E-12345-6789")
 * @param {Array} sapCodes - Array of SapCode objects with accountManager included
 * @returns {Object|null} Account Manager user or null
 */
export function findAccountManagerForSapCode(sapCodeValue, sapCodes) {
  if (!sapCodeValue || !sapCodes) return null;
  
  const sapCodeObj = sapCodes.find(sc => sc.code === sapCodeValue);
  
  if (!sapCodeObj) {
    console.log(`⚠️ SAP Code ${sapCodeValue} not found`);
    return null;
  }
  
  if (sapCodeObj.accountManager) {
    console.log(`✅ Found Account Manager for ${sapCodeValue}: ${sapCodeObj.accountManager.name}`);
    return sapCodeObj.accountManager;
  }
  
  console.log(`⚠️ SAP Code ${sapCodeValue} has NO assigned Account Manager`);
  return null;
}

/**
 * ❌ DEPRECATED: Old function - kept for backward compatibility during transition
 * Use findAssignedSUL() and findAccountManagerForSapCode() instead
 */
export function findApproverBySapCode(role, sapCode, users) {
  console.warn('⚠️ findApproverBySapCode() is deprecated. Use new functions instead.');
  
  if (!requiresSapCodeMatch(role)) {
    return users.find(u => u.role === role) || null;
  }
  
  // Old logic for backward compatibility
  return users.find(u => 
    u.role === role && 
    (u.sap_code_1 === sapCode || u.sap_code_2 === sapCode)
  ) || null;
}