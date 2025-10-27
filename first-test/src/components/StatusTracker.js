import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Paper, Dialog, DialogTitle, DialogContent,
  CircularProgress, Alert, Chip, Grid, Avatar, IconButton,
  Stepper, Step, StepLabel, StepContent, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Person as PersonIcon,
  Close as CloseIcon,
  Cancel as CancelIcon,
  Pending as PendingIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Download as DownloadIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { useAppContext } from '../App';
import { useTheme } from '@mui/material/styles';

function StatusTracker() {
  const { user, showNotification } = useAppContext();
  const [reimbursements, setReimbursements] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // 🆕 Receipt viewer state
  const [receiptZoom, setReceiptZoom] = useState(1);
  const [receiptLoading, setReceiptLoading] = useState(false);

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
      console.log('📋 Fetched reimbursements:', data);
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
    setReceiptZoom(1); // Reset zoom
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedTicket(null);
    setReceiptZoom(1);
  };

  // 🆕 Receipt zoom controls
  const handleZoomIn = () => setReceiptZoom((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setReceiptZoom((prev) => Math.max(prev - 0.25, 0.5));

  // 🆕 Download receipt
  const handleDownloadReceipt = () => {
    if (!selectedTicket?.receipt) return;

    try {
      const { data, mimetype, filename } = selectedTicket.receipt;
      
      // Convert base64 to blob
      const byteCharacters = atob(data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimetype });
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `receipt-${selectedTicket.id}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      showNotification('Receipt downloaded successfully', 'success');
    } catch (error) {
      console.error('Download failed:', error);
      showNotification('Failed to download receipt', 'error');
    }
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

  const theme = useTheme();
  const { darkMode } = useAppContext();

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-CA'); // YYYY-MM-DD format
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3, borderRadius: 3 }}>
      <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3 }}>
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
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>REQUEST</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>AMOUNT</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>CATEGORY</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>DATES</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>STATUS</TableCell>
                <TableCell></TableCell> {/* Empty header for actions */}
              </TableRow>
            </TableHead>
            <TableBody>
              {reimbursements.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {item.items || `${item.category} Reimbursement`}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.description || 'No description provided'}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                      ₱{parseFloat(item.total).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {item.category}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2">
                        {item.date ? formatDate(item.date) : 'N/A'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Submitted: {formatDate(item.submittedAt)}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={item.status}
                      size="small"
                      color={getStatusColor(item.status)}
                      sx={{
                        fontWeight: 600,
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDetails(item)}
                      title="See Details"
                    >
                      <VisibilityIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
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
              <Box sx={{ p: 3, 
                bgcolor: darkMode 
                  ? theme.palette.background.paper
                  : theme.palette.grey[50],
                borderBottom: 1, 
                borderColor: 'divider' }}>
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
                        Date of Expense:
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

                    {/* 🆕 Updated Receipt Display with Base64 Support */}
                    {selectedTicket.receipt && (
                      <Box sx={{ mt: 3 }}>
                        <Box sx={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          mb: 1 
                        }}>
                          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                            Receipt:
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <IconButton 
                              size="small" 
                              onClick={handleZoomOut} 
                              disabled={receiptZoom <= 0.5}
                              title="Zoom Out"
                            >
                              <ZoomOutIcon fontSize="small" />
                            </IconButton>
                            <IconButton 
                              size="small" 
                              onClick={handleZoomIn} 
                              disabled={receiptZoom >= 3}
                              title="Zoom In"
                            >
                              <ZoomInIcon fontSize="small" />
                            </IconButton>
                            <IconButton 
                              size="small" 
                              onClick={handleDownloadReceipt}
                              title="Download Receipt"
                            >
                              <DownloadIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </Box>
                        
                        <Box
                          sx={{
                            position: 'relative',
                            width: '100%',
                            maxHeight: '500px',
                            overflow: 'auto',
                            border: 1,
                            borderColor: 'divider',
                            borderRadius: 1,
                            bgcolor: darkMode ? 'grey.900' : 'grey.100',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            p: 2
                          }}
                        >
                          {receiptLoading && (
                            <CircularProgress 
                              sx={{ position: 'absolute' }} 
                            />
                          )}
                          <Box
                            component="img"
                            src={`data:${selectedTicket.receipt.mimetype};base64,${selectedTicket.receipt.data}`}
                            alt="Receipt"
                            sx={{
                              maxWidth: '100%',
                              maxHeight: '480px',
                              objectFit: 'contain',
                              transform: `scale(${receiptZoom})`,
                              transition: 'transform 0.2s ease-in-out',
                              display: receiptLoading ? 'none' : 'block'
                            }}
                            onLoad={() => setReceiptLoading(false)}
                            onLoadStart={() => setReceiptLoading(true)}
                            onError={(e) => {
                              console.error('Failed to load receipt');
                              setReceiptLoading(false);
                              showNotification('Failed to load receipt image', 'error');
                            }}
                          />
                        </Box>
                        
                        {selectedTicket.receipt.filename && (
                          <Typography 
                            variant="caption" 
                            color="text.secondary" 
                            sx={{ display: 'block', mt: 1, textAlign: 'center' }}
                          >
                            {selectedTicket.receipt.filename}
                          </Typography>
                        )}
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