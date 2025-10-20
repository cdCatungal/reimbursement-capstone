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
} from "@mui/icons-material";
import { useAppContext } from "../App";

function StatusTracker() {
  const { user, showNotification } = useAppContext();
  const [reimbursements, setReimbursements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
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
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: "bold", pb: 1 }}>
          Reimbursement Details
        </DialogTitle>
        <DialogContent dividers>
          {selectedItem && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">
                  Category
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, mb: 2 }}>
                  {selectedItem.category || selectedItem.type}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">
                  Amount
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, mb: 2 }}>
                  ₱{parseFloat(selectedItem.total).toFixed(2)}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">
                  Date
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, mb: 2 }}>
                  {selectedItem.date}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">
                  Status
                </Typography>
                <Chip
                  label={selectedItem.status}
                  color={getStatusColor(selectedItem.status)}
                  sx={{ fontWeight: 600, mt: 0.5 }}
                />
              </Grid>
              {selectedItem.approver && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    Approver
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, mb: 2 }}>
                    {selectedItem.approver}
                  </Typography>
                </Grid>
              )}
              {selectedItem.merchant && (
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    Merchant/Vendor
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, mb: 2 }}>
                    {selectedItem.merchant}
                  </Typography>
                </Grid>
              )}
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">
                  Description
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {selectedItem.description}
                </Typography>
              </Grid>
              {selectedItem.items && (
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    Items/Details
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      whiteSpace: "pre-wrap",
                      bgcolor: "action.hover",
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
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mb: 1, display: "block" }}
                  >
                    Receipt Image
                  </Typography>
                  <img
                    src={selectedItem.receipt}
                    alt="Receipt"
                    style={{
                      maxWidth: "100%",
                      maxHeight: "400px",
                      borderRadius: "8px",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
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
    </Card>
  );
}

export default StatusTracker;
