import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Box, Typography, List, ListItem, ListItemText,
  Button, Paper, Dialog, DialogTitle, DialogContent, DialogActions,
  Menu, MenuItem, IconButton, CircularProgress, Alert, Drawer,
  ListItemButton, ListItemIcon
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ListAltIcon from '@mui/icons-material/ListAlt';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ReceiptIcon from '@mui/icons-material/Receipt';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import ReportExport from './ReportExport';
import ReceiptUpload from './ReceiptUpload';
import StatusTracker from './StatusTracker';
import ThemeToggle from './ThemeToggle';
import { useAppContext } from '../App';

function AdminDashboard() {
  const { user, setIsAuthenticated, setIsAdmin, setUser, showNotification } = useAppContext();
  const navigate = useNavigate();
  const [pendings, setPendings] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(true);
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

    if (user && !hasFetched.current && tabValue === 0) {
      fetchReimbursements();
    }
  }, [user, showNotification, tabValue]);

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

  const handleProfileClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileClose = () => {
    setAnchorEl(null);
  };

  const handleLogoutClick = async () => {
    try {
      const response = await fetch('http://localhost:5000/auth/logout', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        setIsAuthenticated(false);
        setIsAdmin(false);
        setUser(null);
        showNotification('Logged out successfully', 'success');
        navigate('/login');
      } else {
        showNotification('Logout failed', 'error');
      }
    } catch (error) {
      console.error('Logout error:', error);
      setIsAuthenticated(false);
      setIsAdmin(false);
      setUser(null);
      navigate('/login');
    }
    handleProfileClose();
  };

  const handleTabChange = (newValue) => {
    setTabValue(newValue);
  };

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  const tabs = [
    {
      label: 'Reimbursement Lists',
      icon: <ListAltIcon />,
    },
    {
      label: 'Export Summary Reports',
      icon: <AssessmentIcon />,
    },
    {
      label: 'Upload Receipt',
      icon: <ReceiptIcon />,
    },
    {
      label: 'Track Status',
      icon: <TrackChangesIcon />,
    },
  ];

  const firstName = user?.username?.split(' ')[0] || user?.username || 'Admin';

  const renderContent = () => {
    switch (tabValue) {
      case 0:
        return (
          <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 'medium', mb: 2 }}>
              Pending Approvals
            </Typography>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : error ? (
              <Alert severity="error">{error}</Alert>
            ) : pendings.length === 0 ? (
              <Typography>No pending reimbursements</Typography>
            ) : (
              <List>
                {pendings.map((item) => (
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
                          <Typography component="span" variant="body2" sx={{ color: getStatusColor(item.status) }}>
                            Status: {item.status}
                          </Typography>
                          <br />
                          <Typography component="span" variant="body2" color="text.secondary">
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
          </Paper>
        );
      case 1:
        return <ReportExport />;
      case 2:
        return <ReceiptUpload />;
      case 3:
        return <StatusTracker />;
      default:
        return null;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 0, display: 'flex', minHeight: '100vh' }}>
      <Drawer
        variant="persistent"
        anchor="left"
        open={true}
        sx={{
          width: drawerOpen ? 10 : 10,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerOpen ? 240 : 64,
            boxSizing: 'border-box',
            transition: 'width 0.3s ease-in-out',
            overflowX: 'hidden',
          },
        }}
      >
        <Box
          sx={{
            p: 2,
            display: 'flex',
            justifyContent: drawerOpen ? 'flex-end' : 'center',
          }}
        >
          <IconButton onClick={toggleDrawer} color="inherit" size="large">
            <MenuIcon />
          </IconButton>
        </Box>
        <List>
          {tabs.map((tab, index) => (
            <ListItemButton
              key={tab.label}
              selected={tabValue === index}
              onClick={() => handleTabChange(index)}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                '&.Mui-selected': {
                  backgroundColor: (theme) => theme.palette.action.selected,
                  color: (theme) => theme.palette.primary.main,
                },
              }}
            >
              <ListItemIcon>{tab.icon}</ListItemIcon>
              <ListItemText primary={tab.label} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>

      <Box
        sx={{
          flexGrow: 1,
          ml: drawerOpen ? '240px' : '64px',
          transition: 'margin-left 0.3s ease-in-out',
        }}
      >
        <Box
          sx={{
            p: 2,
            borderBottom: 1,
            borderColor: 'divider',
            mb: 3,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <img src="/erni-logo.png" alt="ERNI Logo" style={{ height: '40px' }} />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h6">
              Welcome, {firstName}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <ThemeToggle />
              <IconButton onClick={handleProfileClick} color="inherit" size="large">
                <AccountCircleIcon />
              </IconButton>
            </Box>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleProfileClose}>
              <MenuItem onClick={handleProfileClose}>User Profile</MenuItem>
              <MenuItem onClick={handleLogoutClick}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>Logout</span>
                  <ExitToAppIcon />
                </Box>
              </MenuItem>
            </Menu>
          </Box>
        </Box>

        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              Admin Dashboard
            </Typography>
          </Box>

          {renderContent()}

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
        </Box>
      </Box>
    </Container>
  );
}

export default AdminDashboard;