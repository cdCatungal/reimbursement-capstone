import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, List, ListItem, ListItemText,
  Button, Paper, Dialog, DialogTitle, DialogContent,
  CircularProgress, Alert, TextField, InputAdornment, Select,
  MenuItem, Chip, Grid, Avatar, IconButton,
} from '@mui/material';
import {
  Search,
  CheckCircle as CheckCircleIcon,
  Person as PersonIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useAppContext } from '../App';

function ReimbursementList() {
  const { user, showNotification } = useAppContext();
  const [pendings, setPendings] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const hasFetched = useRef(false);

  useEffect(() => {
    const fetchReimbursements = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/reimbursements`, {
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

    if (user && !hasFetched.current) {
      fetchReimbursements();
    }
  }, [user, showNotification]);

  const handleApprove = async (id) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/reimbursements/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ status: 'Approved' }),
      });
      if (!response.ok) {
        throw new Error('Failed to approve reimbursement');
      }
      setPendings(pendings.map(p => p.id === id ? { ...p, status: 'Approved' } : p));
      showNotification('Reimbursement approved successfully', 'success');
    } catch (err) {
      showNotification(err.message || 'Failed to approve reimbursement', 'error');
    }
  };

  const handleReject = async (id) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/reimbursements/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ status: 'Rejected' }),
      });
      if (!response.ok) {
        throw new Error('Failed to reject reimbursement');
      }
      setPendings(pendings.map(p => p.id === id ? { ...p, status: 'Rejected' } : p));
      showNotification('Reimbursement rejected successfully', 'success');
    } catch (err) {
      showNotification(err.message || 'Failed to reject reimbursement', 'error');
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
      case 'Validated':
        return 'success';
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
      r.user?.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.merchant?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.items?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchCategory && matchSearch;
  });

  // Mock approval flow data
  const getApprovalFlow = (ticket) => {
    return [
      {
        role: "Finance Officer",
        status: ticket.status === "Pending" ? "Pending" : "Approved",
        name: "Finance Department",
        date: ticket.status !== "Pending" ? new Date(ticket.submittedAt).toLocaleString() : null,
        message: ticket.status === "Pending" 
          ? "The Finance Officer is currently processing your reimbursement payment. You will be notified once the transaction is completed."
          : "Finance Officer has approved the reimbursement."
      },
      {
        role: "Invoice Specialist",
        status: ticket.status === "Approved" ? "Validated" : "Pending",
        name: "Michelle Mendoza",
        date: ticket.status === "Approved" ? new Date(ticket.approvedAt || ticket.submittedAt).toLocaleString() : null,
        message: "The Invoice Specialist has checked all attached receipts and documents to ensure compliance and completeness. The request is now forwarded to Finance for payment processing."
      },
      {
        role: "Account Manager",
        status: ticket.status === "Approved" ? "Approved" : "Pending",
        name: "Jane Doe",
        date: ticket.status === "Approved" ? new Date(ticket.approvedAt || ticket.submittedAt).toLocaleString() : null,
        message: "The Account Manager has verified and approved your reimbursement request for budget compliance and accuracy."
      },
      {
        role: "Service Unit Leader",
        status: ticket.status === "Approved" ? "Approved" : "Pending",
        name: "Adriel Martiano",
        date: ticket.status === "Approved" ? new Date(ticket.approvedAt || ticket.submittedAt).toLocaleString() : null,
        message: "The Service Unit Leader (SUL) has reviewed your reimbursement request and confirmed its validity."
      },
      {
        role: "Submitted Reimbursement Application",
        status: "Completed",
        name: null,
        date: new Date(ticket.submittedAt).toLocaleString(),
        message: null
      }
    ];
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3, borderRadius: 3 }}>
      <Typography variant="h6" sx={{ fontWeight: 'medium', mb: 3 }}>
        Reimbursement Management
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
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          size="small"
          sx={{ minWidth: 120 }}
        >
          {['All', 'Pending', 'Approved', 'Rejected'].map((status) => (
            <MenuItem key={status} value={status}>
              {status}
            </MenuItem>
          ))}
        </Select>

        <Select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          size="small"
          sx={{ minWidth: 140 }}
        >
          {['All', 'Meals', 'Supplies', 'Transportation', 'Tools'].map((cat) => (
            <MenuItem key={cat} value={cat}>
              {cat}
            </MenuItem>
          ))}
        </Select>

        <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
          {filteredData.length} reimbursement/s found
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
            {searchQuery || statusFilter !== 'All' || categoryFilter !== 'All'
              ? 'No reimbursements match your filters'
              : 'No reimbursements found'}
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
                      User: {item.user?.displayName || item.userId || 'Unknown'}
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
                      Amount: ₱{item.total}
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
                  See Details
                </Button>
                {item.status === 'Pending' && (
                  <>
                    <Button
                      variant="contained"
                      color="success"
                      onClick={() => handleApprove(item.id)}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="contained"
                      color="error"
                      onClick={() => handleReject(item.id)}
                    >
                      Reject
                    </Button>
                  </>
                )}
              </Box>
            </ListItem>
          ))}
        </List>
      )}

      {/* Details Dialog - Similar to StatusTracker */}
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
              <Box sx={{ p: 3, bgcolor: 'grey.50', borderBottom: 1, borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.main' }}>
                    <PersonIcon sx={{ fontSize: 32 }} />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Employee Name: {selectedTicket.user?.displayName || 'N/A'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      SAP Code: PRJ-2025-IT-DEV-001-{(selectedTicket.user?.displayName || 'USER').toUpperCase()}
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
                        {selectedTicket.description || 'No description provided'}
                      </Typography>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                        Description:
                      </Typography>
                      <Typography variant="body2">
                        {selectedTicket.items || selectedTicket.description || 'N/A'}
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
                            showNotification('Failed to load receipt image', 'error');
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
                      Reimbursement Status
                    </Typography>

                    {/* Approval Flow Timeline */}
                    <Box sx={{ position: 'relative' }}>
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
                              bgcolor: step.status === 'Pending' ? 'grey.300' : 'success.main'
                            }
                          }}
                        >
                          <Box sx={{ mr: 2 }}>
                            <CheckCircleIcon
                              sx={{
                                fontSize: 32,
                                color: step.status === 'Pending' ? 'grey.400' : 'success.main'
                              }}
                            />
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                {step.role}:
                              </Typography>
                              <Chip
                                label={step.status}
                                size="small"
                                color={getStatusColor(step.status)}
                                sx={{ fontWeight: 600, height: 20 }}
                              />
                            </Box>
                            {step.name && (
                              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                {step.name}
                              </Typography>
                            )}
                            {step.date && (
                              <Typography variant="caption" color="text.secondary">
                                Approved at: {step.date}
                              </Typography>
                            )}
                            {step.message && (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{
                                  mt: 1,
                                  fontStyle: 'italic',
                                  fontSize: '0.813rem'
                                }}
                              >
                                {step.message}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      ))}
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

export default ReimbursementList;