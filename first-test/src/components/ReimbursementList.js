import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, List, ListItem, ListItemText,
  Button, Paper, Dialog, DialogTitle, DialogContent, DialogActions,
  CircularProgress, Alert, TextField, InputAdornment, Select,
  MenuItem, Chip
} from '@mui/material';
import {
  Search,
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
        return 'warning.main';
      case 'Approved':
        return 'success.main';
      case 'Rejected':
        return 'error.main';
      default:
        return 'text.secondary';
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
                      sx={{
                        mt: 0.5,
                        bgcolor: getStatusColor(item.status),
                        color: 'white',
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

      {/* Details Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>
          {selectedTicket ? `${selectedTicket.category} Reimbursement Details` : 'Details'}
        </DialogTitle>
        <DialogContent>
          {selectedTicket ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography><strong>User:</strong> {selectedTicket.user?.displayName || selectedTicket.userId || 'Unknown'}</Typography>
              <Typography><strong>Amount:</strong> ₱{selectedTicket.total}</Typography>
              <Typography sx={{ color: getStatusColor(selectedTicket.status) }}>
                <strong>Status:</strong> {selectedTicket.status}
              </Typography>
              <Typography><strong>Description:</strong> {selectedTicket.description || 'No description provided'}</Typography>
              <Typography><strong>Merchant:</strong> {selectedTicket.merchant || 'N/A'}</Typography>
              <Typography><strong>Items:</strong> {selectedTicket.items || 'N/A'}</Typography>
              <Typography><strong>Date:</strong> {new Date(selectedTicket.date).toLocaleDateString() || 'N/A'}</Typography>
              <Typography><strong>Submitted At:</strong> {new Date(selectedTicket.submittedAt).toLocaleString() || 'N/A'}</Typography>
              {selectedTicket.extractedText && (
                <Typography><strong>Extracted Text:</strong> <pre>{selectedTicket.extractedText}</pre></Typography>
              )}
              {selectedTicket.receipt ? (
                <Box>
                  <Typography><strong>Receipt:</strong></Typography>
                  <img
                    src={`${process.env.REACT_APP_API_URL}${selectedTicket.receipt}`}
                    alt="Receipt"
                    style={{ maxWidth: '100%', height: 'auto', marginTop: '8px' }}
                    onError={() => showNotification('Failed to load receipt image', 'error')}
                  />
                </Box>
              ) : (
                <Typography><strong>Receipt:</strong> No receipt uploaded</Typography>
              )}
            </Box>
          ) : (
            <Typography>No ticket selected</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}

export default ReimbursementList;