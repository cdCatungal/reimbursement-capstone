import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, List, ListItem, ListItemText,
  Button, Paper, Dialog, DialogTitle, DialogContent,
  CircularProgress, Alert, TextField, InputAdornment, Select,
  MenuItem, Chip, Grid, Avatar, IconButton, DialogActions,
} from '@mui/material';
import {
  Search,
  CheckCircle as CheckCircleIcon,
  Person as PersonIcon,
  Close as CloseIcon,
  Cancel as CancelIcon,
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
  const hasFetched = useRef(false);

  useEffect(() => {
    fetchReimbursements();
  }, [user]);

  const fetchReimbursements = async () => {
    if (!user || hasFetched.current) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Fetch pending approvals for current user's role
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
      
      // Remove from pending list
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
      
      // Remove from pending list
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
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedTicket(null);
    setRemarks('');
  };

  const handleOpenRejectDialog = () => {
    setOpenRejectDialog(true);
  };

  const handleCloseRejectDialog = () => {
    setOpenRejectDialog(false);
    setRemarks('');
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

  // Filter reimbursements based on search and filters
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
      name: approval.approver?.name || 'Pending Assignment',
      date: approval.approved_at ? new Date(approval.approved_at).toLocaleString() : null,
      remarks: approval.remarks,
      level: approval.approval_level
    }));
  };

  // Check if current user can approve this ticket
  const canApprove = (ticket) => {
    if (!ticket.approvals || !user) return false;
    
    const sortedApprovals = [...ticket.approvals].sort((a, b) => a.approval_level - b.approval_level);
    const nextPending = sortedApprovals.find(a => a.status === 'Pending');
    
    return nextPending && nextPending.approver_role === user.role;
  };

  const theme = useTheme();
  const { darkMode } = useAppContext();

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3, borderRadius: 3 }}>
      <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3 }}>
        Pending Approvals - {user?.role}
      </Typography>

      {/* Filters */}
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          alignItems: 'center',
          mb: 3,
          flexWrap: 'wrap',
        }}
      >
        <TextField
          placeholder="Search by user, category, description..."
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search color="action" />
              </InputAdornment>
            ),
          }}
          sx={{ flex: 1, minWidth: 220 }}
        />

        <Select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          size="small"
          sx={{ minWidth: 140 }}
        >
          {['All', 'Transportation (Commute)', 'Transportation (Drive)', 'Meal with Client', 'Overtime Meal', 'Accomodation'].map((cat) => (
            <MenuItem key={cat} value={cat}>
              {cat}
            </MenuItem>
          ))}
        </Select>

        <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
          {filteredData.length} pending approval/s
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : filteredData.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography color="text.secondary">
            {searchQuery || categoryFilter !== 'All'
              ? 'No reimbursements match your filters'
              : 'No pending approvals at this time'}
          </Typography>
        </Box>
      ) : (
        <List>
          {filteredData.map((item) => (
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
                      Submitted by: {item.user?.name || item.userId || 'Unknown'}
                    </Typography>
                    <br />
                    <Typography component="span" variant="body2" color="text.secondary">
                      Role: {item.user?.role || 'Unknown'}
                    </Typography>
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
                  View Details
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
            REIMBURSEMENT DETAILS
          </Typography>
          <IconButton onClick={handleCloseDialog} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ p: 0 }}>
          {selectedTicket && (
            <>
              {/* Employee Info Header */}
              <Box sx={{ p: 3, 
                bgcolor: darkMode 
                  ? theme.palette.background.paper  // darker surface in dark mode
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
                        Date:
                      </Typography>
                      <Typography variant="body2">
                        {new Date(selectedTicket.date || selectedTicket.submittedAt).toLocaleDateString()}
                      </Typography>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                        Submitted At:
                      </Typography>
                      <Typography variant="body2">
                        {new Date(selectedTicket.submittedAt).toLocaleString()}
                      </Typography>
                    </Box>

                    {selectedTicket.merchant && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                          Expense Source:
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

                {/* Right Column - Approval Status */}
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

                    {/* Approval Flow Timeline */}
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

                    {/* Action Buttons - Only show if user can approve */}
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

      {/* Reject Confirmation Dialog */}
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