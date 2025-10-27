import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Button, Paper, Dialog, DialogTitle, DialogContent,
  CircularProgress, Alert, TextField, InputAdornment, Select,
  MenuItem, Chip, Grid, Avatar, IconButton, DialogActions,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import {
  Search,
  CheckCircle as CheckCircleIcon,
  Person as PersonIcon,
  Close as CloseIcon,
  Cancel as CancelIcon,
  Visibility as VisibilityIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useAppContext } from '../App';

function ReimbursementList() {
  const { user, showNotification } = useAppContext();
  const [pendings, setPendings] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openRejectDialog, setOpenRejectDialog] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [remarks, setRemarks] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [receiptZoom, setReceiptZoom] = useState(1);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const hasFetched = useRef(false);

  useEffect(() => {
    fetchReimbursements();
  }, [user]);

  const fetchReimbursements = async () => {
    if (!user || hasFetched.current) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/reimbursements/pending-approvals`, {
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
      setPendings(data);
      hasFetched.current = true;
    } catch (err) {
      setError(err.message);
      showNotification('Failed to load reimbursements', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id, remarksText = '') => {
    try {
      setActionLoading(true);
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/approvals/${id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ remarks: remarksText }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to approve reimbursement');
      }
      
      setPendings(pendings.filter(p => p.id !== id));
      showNotification('Reimbursement approved successfully', 'success');
      handleCloseDialog();
    } catch (err) {
      showNotification(err.message || 'Failed to approve reimbursement', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (id, remarksText) => {
    if (!remarksText || remarksText.trim() === '') {
      showNotification('Please provide remarks for rejection', 'warning');
      return;
    }

    try {
      setActionLoading(true);
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/approvals/${id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ remarks: remarksText }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to reject reimbursement');
      }
      
      setPendings(pendings.filter(p => p.id !== id));
      showNotification('Reimbursement rejected successfully', 'success');
      handleCloseRejectDialog();
      handleCloseDialog();
    } catch (err) {
      showNotification(err.message || 'Failed to reject reimbursement', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenDetails = (ticket) => {
    setSelectedTicket(ticket);
    setOpenDialog(true);
    setRemarks('');
    setReceiptZoom(1);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedTicket(null);
    setRemarks('');
    setReceiptZoom(1);
  };

  const handleOpenRejectDialog = () => {
    setOpenRejectDialog(true);
  };

  const handleCloseRejectDialog = () => {
    setOpenRejectDialog(false);
    setRemarks('');
  };

  const handleZoomIn = () => setReceiptZoom((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setReceiptZoom((prev) => Math.max(prev - 0.25, 0.5));

  const handleDownloadReceipt = () => {
    if (!selectedTicket?.receipt) return;

    try {
      let url, filename;
      if (typeof selectedTicket.receipt === 'string') {
        url = `${process.env.REACT_APP_API_URL}${selectedTicket.receipt}`;
        filename = `receipt-${selectedTicket.id}.jpg`;
      } else {
        const { data, mimetype, filename: receiptFilename } = selectedTicket.receipt;
        const byteCharacters = atob(data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mimetype });
        url = URL.createObjectURL(blob);
        filename = receiptFilename || `receipt-${selectedTicket.id}.jpg`;
      }

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
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
      case 'Validated':
        return 'info';
      default:
        return 'default';
    }
  };

  const filteredData = pendings.filter((r) => {
    const matchStatus = statusFilter === 'All' || r.status === statusFilter;
    const matchCategory = categoryFilter === 'All' || r.category === categoryFilter;
    const matchSearch =
      searchQuery === '' ||
      r.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.merchant?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.items?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchCategory && matchSearch;
  });

  const getApprovalFlow = (ticket) => {
    if (!ticket.approvals || ticket.approvals.length === 0) {
      return [];
    }

    const sortedApprovals = [...ticket.approvals].sort((a, b) => b.approval_level - a.approval_level);

    return sortedApprovals.map((approval) => ({
      role: approval.approver_role,
      status: approval.status,
      name: approval.approver?.name || 'Pending Assignment',
      date: approval.approved_at ? new Date(approval.approved_at).toLocaleString() : null,
      remarks: approval.remarks,
      level: approval.approval_level
    }));
  };

  const canApprove = (ticket) => {
    if (!ticket.approvals || !user) return false;
    
    const sortedApprovals = [...ticket.approvals].sort((a, b) => a.approval_level - b.approval_level);
    const nextPending = sortedApprovals.find(a => a.status === 'Pending');
    
    return nextPending && nextPending.approver_role === user.role;
  };

  const theme = useTheme();
  const { darkMode } = useAppContext();

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-CA');
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3, borderRadius: 3 }}>
      <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3 }}>
        Pending Approvals - {user?.role}
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : filteredData.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography color="text.secondary">
            No pending approvals at this time
          </Typography>
        </Box>
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>EMPLOYEE</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>REQUEST</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>AMOUNT</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>CATEGORY</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>DATES</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>STATUS</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredData.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {item.user?.name || 'Unknown'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.user?.role || 'Unknown Role'}
                      </Typography>
                    </Box>
                  </TableCell>
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
                      title="View Details"
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
            REIMBURSEMENT DETAILS
          </Typography>
          <IconButton onClick={handleCloseDialog} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ p: 0 }}>
          {selectedTicket && (
            <>
              <Box sx={{ p: 3, 
                bgcolor: darkMode 
                  ? theme.palette.background.paper 
                  : theme.palette.grey[50], 
                borderBottom: 1, 
                borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.main' }}>
                    <PersonIcon sx={{ fontSize: 32 }} />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Employee: {selectedTicket.user?.name || 'N/A'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Role: {selectedTicket.user?.role || 'N/A'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Email: {selectedTicket.user?.email || 'N/A'}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Grid container spacing={3} wrap="nowrap" sx={{ p: 3 }}>
                <Grid item sx={{ width: '650px', flexShrink: 0 }}>
                  <Box sx={{ 
                    p: 3, 
                    height: '100%',
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 2,
                    bgcolor: 'background.paper'
                  }}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                        Reimbursement Type:
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {selectedTicket.category}
                      </Typography>
                    </Box>

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
                        {selectedTicket.items || 'No purpose provided.'}
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

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                        Date Submitted:
                      </Typography>
                      <Typography variant="body2">
                        {new Date(selectedTicket.submittedAt).toLocaleString()}
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
                            src={
                              typeof selectedTicket.receipt === 'string'
                                ? `${process.env.REACT_APP_API_URL}${selectedTicket.receipt}`
                                : `data:${selectedTicket.receipt.mimetype};base64,${selectedTicket.receipt.data}`
                            }
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
                              console.error('Failed to load receipt:', selectedTicket.receipt);
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

                    <Box sx={{ position: 'relative', mb: 3 }}>
                      {getApprovalFlow(selectedTicket).map((step, index) => (
                        <Box
                          key={index}
                          sx={{
                            display: 'flex',
                            mb: 3,
                            position: 'relative',
                            '&:not(:last-child)::before': {
                              content: '""',
                              position: 'absolute',
                              left: '15px',
                              top: '32px',
                              bottom: '-24px',
                              width: '2px',
                              bgcolor: step.status === 'Pending' ? 'grey.300' : 
                                      step.status === 'Rejected' ? 'error.main' : 'success.main'
                            }
                          }}
                        >
                          <Box sx={{ mr: 2 }}>
                            {step.status === 'Rejected' ? (
                              <CancelIcon
                                sx={{
                                  fontSize: 32,
                                  color: 'error.main'
                                }}
                              />
                            ) : (
                              <CheckCircleIcon
                                sx={{
                                  fontSize: 32,
                                  color: step.status === 'Pending' ? 'grey.400' : 'success.main'
                                }}
                              />
                            )}
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                Level {step.level}: {step.role}
                              </Typography>
                            </Box>
                            <Chip
                              label={step.status}
                              size="small"
                              color={getStatusColor(step.status)}
                              sx={{ fontWeight: 600, height: 20, mb: 0.5 }}
                            />
                            {step.name && step.name !== 'Pending Assignment' && (
                              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mt: 0.5 }}>
                                By: {step.name}
                              </Typography>
                            )}
                            {step.date && (
                              <Typography variant="caption" color="text.secondary" display="block">
                                {step.status === 'Approved' ? 'Approved' : step.status === 'Rejected' ? 'Rejected' : 'Processed'} at: {step.date}
                              </Typography>
                            )}
                            {step.remarks && (
                              <Typography
                                variant="body2"
                                sx={{
                                  mt: 1,
                                  p: 1,
                                  bgcolor: 'grey.50',
                                  borderRadius: 1,
                                  fontStyle: 'italic',
                                  fontSize: '0.813rem'
                                }}
                              >
                                <strong>Remarks:</strong> {step.remarks}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      ))}
                    </Box>

                    {canApprove(selectedTicket) && (
                      <Box sx={{ mt: 3, pt: 3, borderTop: 1, borderColor: 'divider' }}>
                        <Typography variant="body2" sx={{ mb: 2, fontWeight: 600 }}>
                          Optional Remarks:
                        </Typography>
                        <TextField
                          fullWidth
                          multiline
                          rows={3}
                          placeholder="Add remarks (optional for approval, required for rejection)"
                          value={remarks}
                          onChange={(e) => setRemarks(e.target.value)}
                          size="small"
                          sx={{ mb: 2 }}
                        />
                        <Box sx={{ display: 'flex', gap: 2 }}>
                          <Button
                            fullWidth
                            variant="contained"
                            color="success"
                            onClick={() => handleApprove(selectedTicket.id, remarks)}
                            disabled={actionLoading}
                          >
                            {actionLoading ? <CircularProgress size={24} /> : 'Approve'}
                          </Button>
                          <Button
                            fullWidth
                            variant="contained"
                            color="error"
                            onClick={handleOpenRejectDialog}
                            disabled={actionLoading}
                          >
                            Reject
                          </Button>
                        </Box>
                      </Box>
                    )}
                  </Box>
                </Grid>
              </Grid>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={openRejectDialog} onClose={handleCloseRejectDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Confirm Rejection</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Please provide a reason for rejecting this reimbursement request.
          </Alert>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Rejection Remarks (Required)"
            placeholder="Please explain why this reimbursement is being rejected..."
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRejectDialog}>Cancel</Button>
          <Button 
            onClick={() => selectedTicket && handleReject(selectedTicket.id, remarks)} 
            color="error" 
            variant="contained"
            disabled={!remarks || remarks.trim() === '' || actionLoading}
          >
            {actionLoading ? <CircularProgress size={24} /> : 'Confirm Rejection'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}

export default ReimbursementList;