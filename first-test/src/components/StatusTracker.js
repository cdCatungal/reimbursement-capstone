import React, { useState, useEffect } from 'react';
import { useAppContext } from '../App';
import {
  Typography,
  Card,
  CardContent,
  Box,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Tabs,
  Tab,
  Grid,
  Paper,
  Avatar,
  CircularProgress,
} from '@mui/material';
import {
  CheckCircle,
  HourglassEmpty,
  Cancel,
  Visibility,
  Timeline,
  FilterList,
} from '@mui/icons-material';

function StatusTracker() {
  const { user, showNotification } = useAppContext();
  const [reimbursements, setReimbursements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // 🟩 Fetch reimbursements from backend
  useEffect(() => {
    if (!user?.uid) return;
    const fetchReimbursements = async () => {
      setLoading(true);
      try {
        const res = await fetch(`http://localhost:5000/api/reimbursements?userId=${user.uid}`, {
          credentials: 'include',
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setReimbursements(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error fetching reimbursements:', err);
        showNotification?.('Failed to load reimbursements', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchReimbursements();
  }, [user?.uid, showNotification]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending': return 'warning.main';
      case 'Approved': return 'success.main';
      case 'Rejected': return 'error.main';
      default: return 'text.secondary';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Pending': return <HourglassEmpty />;
      case 'Approved': return <CheckCircle />;
      case 'Rejected': return <Cancel />;
      default: return <HourglassEmpty />;
    }
  };

  const handleOpenDetails = (item) => {
    setSelectedItem(item);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedItem(null);
  };

  const filterOptions = ['All', 'Pending', 'Approved', 'Rejected'];

  const filteredReimbursements = reimbursements.filter((item) => {
    const matchesFilter = selectedFilter === 'All' || item.status === selectedFilter;
    const matchesSearch =
      searchQuery === '' ||
      item.type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const stats = {
    total: reimbursements.length,
    pending: reimbursements.filter(r => r.status === 'Pending').length,
    approved: reimbursements.filter(r => r.status === 'Approved').length,
    rejected: reimbursements.filter(r => r.status === 'Rejected').length,
  };

  const StatCard = ({ label, count, color, icon }) => (
    <Paper 
      sx={{ 
        p: 2, 
        textAlign: 'center', 
        bgcolor: 'background.paper',
        border: 2,
        borderColor: color,
        borderRadius: 2,
      }}
    >
      <Box sx={{ color, mb: 1 }}>{icon}</Box>
      <Typography variant="h4" sx={{ fontWeight: 'bold', color }}>
        {count}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
    </Paper>
  );

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Timeline sx={{ fontSize: 32, color: 'primary.main', mr: 2 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                Reimbursement Status Tracker
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Track all your submitted requests
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Loading state */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Statistics */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6} md={3}>
                <StatCard label="Total" count={stats.total} color="primary.main" icon={<FilterList />} />
              </Grid>
              <Grid item xs={6} md={3}>
                <StatCard label="Pending" count={stats.pending} color="warning.main" icon={<HourglassEmpty />} />
              </Grid>
              <Grid item xs={6} md={3}>
                <StatCard label="Approved" count={stats.approved} color="success.main" icon={<CheckCircle />} />
              </Grid>
              <Grid item xs={6} md={3}>
                <StatCard label="Rejected" count={stats.rejected} color="error.main" icon={<Cancel />} />
              </Grid>
            </Grid>

            {/* Filters */}
            <Box sx={{ mb: 3 }}>
              <TextField
                placeholder="Search by type, category, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                fullWidth
                size="small"
                sx={{ mb: 2 }}
              />
              <Tabs
                value={selectedFilter}
                onChange={(e, newValue) => setSelectedFilter(newValue)}
                variant="scrollable"
                scrollButtons="auto"
              >
                {filterOptions.map((filter) => (
                  <Tab
                    key={filter}
                    label={filter}
                    value={filter}
                    sx={{ fontWeight: 600 }}
                  />
                ))}
              </Tabs>
            </Box>

            {/* Reimbursement List */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {filteredReimbursements.length === 0 ? (
                <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'action.hover' }}>
                  <Typography variant="body1" color="text.secondary">
                    No reimbursements found
                  </Typography>
                </Paper>
              ) : (
                filteredReimbursements.map((item) => (
                  <Paper
                    key={item._id || item.id}
                    sx={{
                      p: 2.5,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'all 0.2s',
                      '&:hover': {
                        boxShadow: 4,
                        transform: 'translateY(-2px)',
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                      <Avatar sx={{ bgcolor: getStatusColor(item.status), width: 48, height: 48 }}>
                        {getStatusIcon(item.status)}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                          {item.category || item.type} - ₱{parseFloat(item.total).toFixed(2)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          {item.description?.substring(0, 80)}
                          {item.description?.length > 80 ? '...' : ''}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                          <Typography variant="caption" color="text.disabled">
                            {new Date(item.submittedAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </Typography>
                          {item.approvedAt && (
                            <Typography variant="caption" color="text.disabled">
                              • Processed: {new Date(item.approvedAt).toLocaleDateString()}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Chip
                        label={item.status}
                        color={
                          item.status === 'Approved'
                            ? 'success'
                            : item.status === 'Pending'
                            ? 'warning'
                            : 'error'
                        }
                        sx={{ fontWeight: 600, minWidth: 90 }}
                      />
                      <IconButton
                        onClick={() => handleOpenDetails(item)}
                        color="primary"
                        sx={{
                          bgcolor: 'action.selected',
                          '&:hover': { bgcolor: 'action.hover' },
                        }}
                      >
                        <Visibility />
                      </IconButton>
                    </Box>
                  </Paper>
                ))
              )}
            </Box>
          </>
        )}

        {/* Details Dialog */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <DialogTitle sx={{ fontWeight: 'bold', pb: 1 }}>
            Reimbursement Details
          </DialogTitle>
          <DialogContent dividers>
            {selectedItem && (
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">Category</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, mb: 2 }}>
                    {selectedItem.category || selectedItem.type}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">Amount</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, mb: 2 }}>
                    ₱{parseFloat(selectedItem.total).toFixed(2)}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">Date</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, mb: 2 }}>
                    {selectedItem.date}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">Status</Typography>
                  <Chip
                    label={selectedItem.status}
                    color={
                      selectedItem.status === 'Approved'
                        ? 'success'
                        : selectedItem.status === 'Pending'
                        ? 'warning'
                        : 'error'
                    }
                    sx={{ fontWeight: 600, mt: 0.5 }}
                  />
                </Grid>
                {selectedItem.merchant && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">Merchant/Vendor</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600, mb: 2 }}>
                      {selectedItem.merchant}
                    </Typography>
                  </Grid>
                )}
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">Description</Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {selectedItem.description}
                  </Typography>
                </Grid>
                {selectedItem.items && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">Items/Details</Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        whiteSpace: 'pre-wrap',
                        bgcolor: 'action.hover',
                        p: 1.5,
                        borderRadius: 1,
                        mt: 0.5,
                      }}
                    >
                      {selectedItem.items}
                    </Typography>
                  </Grid>
                )}
                {selectedItem.receipt && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                      Receipt Image
                    </Typography>
                    <img
                      src={selectedItem.receipt}
                      alt="Receipt"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '400px',
                        borderRadius: '8px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      }}
                    />
                  </Grid>
                )}
              </Grid>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog} color="primary">
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
}

export default StatusTracker;
