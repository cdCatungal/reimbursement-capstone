import React, { useState, useEffect } from 'react';
import {
  Box, Typography, List, ListItem, ListItemText,
  Button, Paper, Dialog, DialogTitle, DialogContent,
  CircularProgress, Alert, Chip, Grid, Avatar, IconButton,
  Stepper, Step, StepLabel, StepContent,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Person as PersonIcon,
  Close as CloseIcon,
  Cancel as CancelIcon,
  Pending as PendingIcon,
} from '@mui/icons-material';
import { useAppContext } from '../App';

function StatusTracker() {
  const { user, showNotification } = useAppContext();
  const [reimbursements, setReimbursements] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchUserReimbursements();
  }, [user]);

  const fetchUserReimbursements = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/reimbursements/my-reimbursements`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch reimbursements');
      }
      
      const data = await response.json();
      setReimbursements(data);
    } catch (err) {
      setError(err.message);
      showNotification('Failed to load reimbursements', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetails = (ticket) => {
    setSelectedTicket(ticket);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedTicket(null);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending':
        return 'warning';
      case 'Approved':
        return 'success';
      case 'Rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  // Build approval flow from actual approval records
  const getApprovalFlow = (ticket) => {
    if (!ticket.approvals || ticket.approvals.length === 0) {
      return [];
    }

    // Sort approvals by level (reverse for display - latest first)
    const sortedApprovals = [...ticket.approvals].sort((a, b) => b.approval_level - a.approval_level);

    return sortedApprovals.map((approval) => ({
      role: approval.approver_role,
      status: approval.status,
      name: approval.approver?.name || 'Awaiting Approval',
      date: approval.approved_at ? new Date(approval.approved_at).toLocaleString() : null,
      remarks: approval.remarks,
      level: approval.approval_level
    }));
  };

  // Get active step for stepper
  const getActiveStep = (approvals) => {
    if (!approvals || approvals.length === 0) return 0;
    
    const sortedApprovals = [...approvals].sort((a, b) => a.approval_level - b.approval_level);
    const pendingIndex = sortedApprovals.findIndex(a => a.status === 'Pending');
    
    if (pendingIndex === -1) {
      // All approved or rejected
      return sortedApprovals.length;
    }
    
    return pendingIndex;
  };

  const getStepIcon = (approval) => {
    if (approval.status === 'Approved') {
      return <CheckCircleIcon sx={{ color: 'success.main' }} />;
    } else if (approval.status === 'Rejected') {
      return <CancelIcon sx={{ color: 'error.main' }} />;
    } else {
      return <PendingIcon sx={{ color: 'warning.main' }} />;
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3, borderRadius: 3 }}>
      <Typography variant="h6" sx={{ fontWeight: 'medium', mb: 3 }}>
        My Reimbursement Requests
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : reimbursements.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography color="text.secondary">
            No reimbursement requests found
          </Typography>
        </Box>
      ) : (
        <List>
          {reimbursements.map((item) => (
            <ListItem
              key={item.id}
              divider
              sx={{ py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <ListItemText
                primary={`${item.category} Reimbursement`}
                secondary={
                  <>
                    <Typography component="span" variant="body2" color="text.secondary">
                      Submitted: {new Date(item.submittedAt).toLocaleDateString()}
                    </Typography>
                    <br />
                    <Chip
                      label={item.status}
                      size="small"
                      color={getStatusColor(item.status)}
                      sx={{
                        mt: 0.5,
                        fontWeight: 600,
                      }}
                    />
                    <br />
                    <Typography component="span" variant="body2" color="text.secondary" sx={{ mt: 0.5, display: 'inline-block' }}>
                      Amount: ₱{parseFloat(item.total).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Typography>
                  </>
                }
                primaryTypographyProps={{ fontWeight: 'medium' }}
              />
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={() => handleOpenDetails(item)}
                >
                  Track Status
                </Button>
              </Box>
            </ListItem>
          ))}
        </List>
      )}

      {/* Details Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="xl"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2, minHeight: '80vh', maxWidth: '1400px' }
        }}
      >
        <DialogTitle 
          sx={{ 
            fontWeight: "bold", 
            pb: 1,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: 1,
            borderColor: 'divider'
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            REIMBURSEMENT TRACKING
          </Typography>
          <IconButton onClick={handleCloseDialog} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ p: 0 }}>
          {selectedTicket && (
            <>
              {/* Header with Status */}
              <Box sx={{ p: 3, bgcolor: 'grey.50', borderBottom: 1, borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.main' }}>
                      <PersonIcon sx={{ fontSize: 32 }} />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {selectedTicket.category} Reimbursement
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Submitted: {new Date(selectedTicket.submittedAt).toLocaleString()}
                      </Typography>
                    </Box>
                  </Box>
                  <Chip
                    label={selectedTicket.status}
                    color={getStatusColor(selectedTicket.status)}
                    sx={{ fontWeight: 700, fontSize: '1rem', px: 2, py: 2.5 }}
                  />
                </Box>
              </Box>

              {/* Two Column Content */}
              <Grid container spacing={3} wrap="nowrap" sx={{ p: 3 }}>
                {/* Left Column - Details */}
                <Grid item sx={{ width: '650px', flexShrink: 0 }}>
                  <Box sx={{ 
                    p: 3, 
                    height: '100%',
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 2,
                    bgcolor: 'background.paper'
                  }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3 }}>
                      Request Details
                    </Typography>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                        Amount:
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
                        ₱{parseFloat(selectedTicket.total).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Typography>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                        Purpose:
                      </Typography>
                      <Typography variant="body2">
                        {selectedTicket.items || 'No purpose provided'}
                      </Typography>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                        Description:
                      </Typography>
                      <Typography variant="body2">
                        {selectedTicket.description || 'No description provided.'}
                      </Typography>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                        Date:
                      </Typography>
                      <Typography variant="body2">
                        {new Date(selectedTicket.date || selectedTicket.submittedAt).toLocaleDateString()}
                      </Typography>
                    </Box>

                    {selectedTicket.merchant && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                          Merchant:
                        </Typography>
                        <Typography variant="body2">
                          {selectedTicket.merchant}
                        </Typography>
                      </Box>
                    )}

                    {selectedTicket.extractedText && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                          Extracted Text:
                        </Typography>
                        <Typography variant="body2" component="pre" sx={{ 
                          whiteSpace: 'pre-wrap', 
                          wordBreak: 'break-word',
                          fontSize: '0.875rem',
                          bgcolor: 'grey.50',
                          p: 1,
                          borderRadius: 1
                        }}>
                          {selectedTicket.extractedText}
                        </Typography>
                      </Box>
                    )}

                    {selectedTicket.receipt && (
                      <Box sx={{ mt: 3 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, mb: 1 }}>
                          Receipt:
                        </Typography>
                        <Box
                          component="img"
                          src={`${process.env.REACT_APP_API_URL}${selectedTicket.receipt}`}
                          alt="Receipt"
                          sx={{
                            width: '100%',
                            maxHeight: '500px',
                            objectFit: 'contain',
                            borderRadius: 1,
                            border: 1,
                            borderColor: 'divider',
                            display: 'block'
                          }}
                          onError={(e) => {
                            console.error('Failed to load receipt:', selectedTicket.receipt);
                          }}
                        />
                      </Box>
                    )}
                  </Box>
                </Grid>

                {/* Right Column - Approval Progress */}
                <Grid item sx={{ width: '450px', flexShrink: 0 }}>
                  <Box sx={{ 
                    p: 3, 
                    height: '100%',
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 2,
                    bgcolor: 'background.paper'
                  }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3 }}>
                      Approval Progress
                    </Typography>

                    {/* Approval Stepper */}
                    <Stepper 
                      activeStep={getActiveStep(selectedTicket.approvals)} 
                      orientation="vertical"
                      sx={{
                        '& .MuiStepConnector-line': {
                          minHeight: '30px',
                        }
                      }}
                    >
                      {getApprovalFlow(selectedTicket).map((step, index) => (
                        <Step key={index} expanded>
                          <StepLabel
                            StepIconComponent={() => getStepIcon(step)}
                            sx={{
                              '& .MuiStepLabel-label': {
                                fontWeight: 600,
                                fontSize: '0.95rem'
                              }
                            }}
                          >
                            <Box>
                              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                Level {step.level}: {step.role}
                              </Typography>
                              <Chip
                                label={step.status}
                                size="small"
                                color={getStatusColor(step.status)}
                                sx={{ fontWeight: 600, height: 20, mt: 0.5 }}
                              />
                            </Box>
                          </StepLabel>
                          <StepContent>
                            <Box sx={{ ml: 1, mt: 1 }}>
                              {step.name && step.name !== 'Awaiting Approval' && (
                                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                  Processed by: {step.name}
                                </Typography>
                              )}
                              {step.date && (
                                <Typography variant="caption" color="text.secondary" display="block">
                                  {step.status === 'Approved' ? 'Approved' : step.status === 'Rejected' ? 'Rejected' : 'Processed'} on: {step.date}
                                </Typography>
                              )}
                              {step.status === 'Pending' && !step.date && (
                                <Typography variant="body2" color="warning.main" sx={{ mt: 1, fontStyle: 'italic' }}>
                                  Waiting for approval from {step.role}
                                </Typography>
                              )}
                              {step.remarks && (
                                <Box
                                  sx={{
                                    mt: 1.5,
                                    p: 1.5,
                                    bgcolor: step.status === 'Rejected' ? 'error.50' : 'grey.50',
                                    borderRadius: 1,
                                    borderLeft: 3,
                                    borderColor: step.status === 'Rejected' ? 'error.main' : 'info.main'
                                  }}
                                >
                                  <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                                    Remarks:
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      fontSize: '0.813rem',
                                      fontStyle: 'italic'
                                    }}
                                  >
                                    {step.remarks}
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                          </StepContent>
                        </Step>
                      ))}
                      
                      {/* Submission Step */}
                      <Step expanded completed>
                        <StepLabel
                          StepIconComponent={() => <CheckCircleIcon sx={{ color: 'success.main' }} />}
                          sx={{
                            '& .MuiStepLabel-label': {
                              fontWeight: 600,
                              fontSize: '0.95rem'
                            }
                          }}
                        >
                          Request Submitted
                        </StepLabel>
                        <StepContent>
                          <Typography variant="caption" color="text.secondary">
                            Submitted on: {new Date(selectedTicket.submittedAt).toLocaleString()}
                          </Typography>
                        </StepContent>
                      </Step>
                    </Stepper>

                    {/* Status Summary */}
                    <Box sx={{ mt: 4, pt: 3, borderTop: 1, borderColor: 'divider' }}>
                      {selectedTicket.status === 'Pending' && (
                        <Alert severity="info">
                          Your reimbursement is currently under review. You will be notified once it's processed.
                        </Alert>
                      )}
                      {selectedTicket.status === 'Approved' && (
                        <Alert severity="success">
                          Your reimbursement has been fully approved! Payment processing will begin shortly.
                        </Alert>
                      )}
                      {selectedTicket.status === 'Rejected' && (
                        <Alert severity="error">
                          Your reimbursement request was rejected. Please review the remarks above and submit a new request if needed.
                        </Alert>
                      )}
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Paper>
  );
}

export default StatusTracker;