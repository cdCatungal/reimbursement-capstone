import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  CircularProgress,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Card,
  Divider,
  Avatar,
} from "@mui/material";
import {
  Menu as MenuIcon,
  HourglassEmpty as HourglassEmptyIcon,
  Autorenew as AutorenewIcon,
  Cancel as CancelIcon,
  CheckCircle as CheckCircleIcon,
  Search,
  Visibility,
  Assignment as AssignmentIcon,
  Close as CloseIcon,
  Person as PersonIcon,
} from "@mui/icons-material";
import { useAppContext } from "../App";

function StatusTracker() {
  const { user, showNotification } = useAppContext();
  const [reimbursements, setReimbursements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTicket, setSelectedItem] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    const fetchData = async () => {
      try {
        const res = await fetch(
          `http://localhost:5000/api/reimbursements?userId=${user.uid}`,
          { credentials: "include" }
        );
        const data = await res.json();
        setReimbursements(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error fetching reimbursements:", err);
        showNotification?.("Failed to load reimbursements", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?.uid, showNotification]);

  const getStatusColor = (status) => {
    switch (status) {
      case "Approved":
        return "success";
      case "Pending":
        return "warning";
      case "Rejected":
        return "error";
      case "Validated":
        return "success";
      default:
        return "default";
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

  const filteredData = reimbursements.filter((r) => {
    const matchStatus = statusFilter === "All" || r.status === statusFilter;
    const matchCategory =
      categoryFilter === "All" || r.category === categoryFilter;
    const matchSearch =
      searchQuery === "" ||
      r.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.type?.toLowerCase().includes(searchQuery.toLowerCase());
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
    <Card elevation={3} sx={{ borderRadius: 3, p: 3 }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
        <AssignmentIcon sx={{ fontSize: 36, color: "primary.main", mr: 1 }} />
        <Box>
          <Typography variant="h5" sx={{ fontWeight: "bold" }}>
            My Requests
          </Typography>
          <Typography color="text.secondary">
            Track all your submitted reimbursement requests
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          {
            label: "Total",
            value: reimbursements.length,
            color: "#424242",
            icon: <MenuIcon sx={{ fontSize: 32, color: "#424242" }} />,
          },
          {
            label: "Pending",
            value: reimbursements.filter((r) => r.status === "Pending").length,
            color: "#fbc02d",
            icon: <HourglassEmptyIcon sx={{ fontSize: 32, color: "#fbc02d" }} />,
          },
          {
            label: "In Progress",
            value: reimbursements.filter((r) => r.status === "In Progress").length,
            color: "#1976d2",
            icon: <AutorenewIcon sx={{ fontSize: 32, color: "#1976d2" }} />,
          },
          {
            label: "Rejected",
            value: reimbursements.filter((r) => r.status === "Rejected").length,
            color: "#d32f2f",
            icon: <CancelIcon sx={{ fontSize: 32, color: "#d32f2f" }} />,
          },
          {
            label: "Done",
            value: reimbursements.filter((r) => r.status === "Approved").length,
            color: "#2e7d32",
            icon: <CheckCircleIcon sx={{ fontSize: 32, color: "#2e7d32" }} />,
          },
        ].map((card) => (
          <Grid item xs={12} sm={6} md={2.4} key={card.label}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                textAlign: "center",
                borderRadius: 2,
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 0.5,
                border: `2px solid ${card.color}`,
              }}
            >
              {card.icon}
              <Typography
                sx={{
                  fontSize: 26,
                  fontWeight: 700,
                  color: card.color,
                  lineHeight: 1.2,
                }}
              >
                {card.value}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontWeight: 500 }}
              >
                {card.label}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Filters */}
      <Box
        sx={{
          display: "flex",
          gap: 2,
          alignItems: "center",
          mb: 2,
          flexWrap: "wrap",
        }}
      >
        <TextField
          placeholder="Search requests..."
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
        >
          {["All", "Approved", "Pending", "Rejected"].map((status) => (
            <MenuItem key={status} value={status}>
              {status}
            </MenuItem>
          ))}
        </Select>

        <Select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          size="small"
        >
          {["All", "Meals", "Supplies", "Transportation", "Tools"].map((cat) => (
            <MenuItem key={cat} value={cat}>
              {cat}
            </MenuItem>
          ))}
        </Select>

        <Typography variant="body2" color="text.secondary" sx={{ ml: "auto" }}>
          {filteredData.length} request/s found
        </Typography>
      </Box>

      {/* Table */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.50" }}>
                <TableCell sx={{ fontWeight: 600 }}>Request</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Amount</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Dates</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Approver</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      No requests found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((item) => (
                  <TableRow
                    key={item._id || item.id}
                    hover
                    sx={{
                      "&:hover": { bgcolor: "action.hover" },
                    }}
                  >
                    <TableCell>
                      <Typography sx={{ fontWeight: 600 }}>
                        {item.title || item.type}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {item.description}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontWeight: 600 }}>
                        ₱{parseFloat(item.total).toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(item.submittedAt || item.date).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={item.status}
                        color={getStatusColor(item.status)}
                        size="small"
                        sx={{ fontWeight: 600, textTransform: "capitalize" }}
                      />
                    </TableCell>
                    <TableCell>{item.approver || "—"}</TableCell>
                    <TableCell>
                      <Tooltip title="View">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleOpenDetails(item)}
                        >
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
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
                      Employee Name: {selectedTicket.user?.displayName || user?.displayName || 'N/A'}
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
                      {selectedTicket.category || selectedTicket.type}
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
                      {selectedTicket.description}
                    </Typography>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                      Description:
                    </Typography>
                    <Typography variant="body2">
                      {selectedTicket.items || selectedTicket.description}
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

                  {selectedTicket.receipt && (
                    <Box sx={{ mt: 3 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, mb: 1 }}>
                        Receipt:
                      </Typography>
                      <Box
                        component="img"
                        src={`http://localhost:5000${selectedTicket.receipt}`}
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
                          showNotification?.('Failed to load receipt image', 'error');
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
    </Card>
  );
}

export default StatusTracker;