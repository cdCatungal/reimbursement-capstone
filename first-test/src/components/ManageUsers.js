import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  Box,
  Typography,
  Button,
  TextField,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Avatar,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  People as PeopleIcon,
  Search as SearchIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import { useManageUsersStore } from "../store/manageUsersStore.js";

function ManageUsers() {
  const { users, loading, fetchUsers, updateUser, deleteUser } = useManageUsersStore();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    role: "",
    sap_code_1: "",
    sap_code_2: "",
  });
  const [formErrors, setFormErrors] = useState({});

  // Fetch users on mount
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Filter users
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "All" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Roles configuration
  const roles = [
    "Employee",
    "SUL",
    "Account Manager",
    "Invoice Specialist",
    "Finance Officer",
    "Sales Director",
    "Admin",
  ];

  const rolesWithoutSapCodes = ['Admin', 'Invoice Specialist', 'Sales Director', 'Finance Officer'];

  const getRoleColor = (role) => {
    const colors = {
      Employee: "default",
      SUL: "primary",
      "Invoice Specialist": "secondary",
      "Account Manager": "success",
      "Finance Officer": "warning",
      "Sales Director": "info",
      Admin: "error",
    };
    return colors[role] || "default";
  };

  // Handle edit dialog
  const handleEditClick = (user) => {
    setSelectedUser(user);
    setFormData({
      role: user.role,
      sap_code_1: user.sap_code_1 || "",
      sap_code_2: user.sap_code_2 || "",
    });
    setFormErrors({});
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setSelectedUser(null);
    setFormData({ role: "", sap_code_1: "", sap_code_2: "" });
    setFormErrors({});
  };

  // Validate SAP code format
  const validateSapCode = (code) => {
    if (!code) return true; // Empty is valid
    const sapCodeRegex = /^E-\d{5}-\d{4}$/i;
    return sapCodeRegex.test(code);
  };

  // Handle form submission
  const handleSubmitEdit = async () => {
    // Validate SAP codes
    const errors = {};
    
    if (!rolesWithoutSapCodes.includes(formData.role)) {
      if (formData.sap_code_1 && !validateSapCode(formData.sap_code_1)) {
        errors.sap_code_1 = "Invalid format. Use: E-00000-0000";
      }
      
      if (formData.role === "Employee" && formData.sap_code_2 && !validateSapCode(formData.sap_code_2)) {
        errors.sap_code_2 = "Invalid format. Use: E-00000-0000";
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const result = await updateUser(selectedUser.id, formData);
    if (result.success) {
      handleCloseEditDialog();
    }
  };

  // Handle delete dialog
  const handleDeleteClick = (user) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSelectedUser(null);
  };

  const handleConfirmDelete = async () => {
    const result = await deleteUser(selectedUser.id);
    if (result.success) {
      handleCloseDeleteDialog();
    }
  };

  // Check if role requires SAP codes
  const roleRequiresSapCode = !rolesWithoutSapCodes.includes(formData.role);
  const roleAllowsSecondSapCode = formData.role === "Employee";

  return (
    <Card sx={{ mt: 3, boxShadow: 3 }}>
      <CardContent sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
          <PeopleIcon sx={{ fontSize: 32, color: "primary.main", mr: 2 }} />
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: "bold" }}>
              Manage Users
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              View and manage user accounts and permissions
            </Typography>
          </Box>
        </Box>

        {/* Filters */}
        <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
          <TextField
            fullWidth
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: "action.active" }} />,
            }}
          />
          <TextField
            select
            label="Filter by Role"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="All">All Roles</MenuItem>
            {roles.map((role) => (
              <MenuItem key={role} value={role}>
                {role}
              </MenuItem>
            ))}
          </TextField>
        </Box>

        {/* Loading State */}
        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {/* Users Table */}
        {!loading && filteredUsers.length > 0 && (
          <TableContainer component={Paper} sx={{ border: 1, borderColor: "divider" }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: "action.hover" }}>
                  <TableCell sx={{ fontWeight: "bold" }}>User</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Role</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>SAP Code(s)</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }} align="right">
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredUsers.map((user) => {
                  const sapCodes = [];
                  if (user.sap_code_1) sapCodes.push(user.sap_code_1);
                  if (user.sap_code_2) sapCodes.push(user.sap_code_2);

                  return (
                    <TableRow
                      key={user.id}
                      hover
                      sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                    >
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                          <Avatar
                            src={user.profilePicture}
                            sx={{
                              bgcolor: "primary.main",
                              width: 40,
                              height: 40,
                            }}
                          >
                            {user.name.charAt(0)}
                          </Avatar>
                          <Typography sx={{ fontWeight: 500 }}>{user.name}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {user.email}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={user.role}
                          size="small"
                          color={getRoleColor(user.role)}
                          sx={{ fontWeight: 500 }}
                        />
                      </TableCell>
                      <TableCell>
                        {sapCodes.length > 0 ? (
                          <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                            {sapCodes.map((code, index) => (
                              <Chip
                                key={index}
                                label={code}
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: "0.75rem" }}
                              />
                            ))}
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            {rolesWithoutSapCodes.includes(user.role) ? "N/A" : "Not assigned"}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
                          <IconButton
                            size="small"
                            color="primary"
                            aria-label="edit"
                            onClick={() => handleEditClick(user)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            aria-label="delete"
                            onClick={() => handleDeleteClick(user)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Empty State */}
        {!loading && filteredUsers.length === 0 && (
          <Box
            sx={{
              textAlign: "center",
              py: 6,
              color: "text.secondary",
            }}
          >
            <PeopleIcon sx={{ fontSize: 64, opacity: 0.3, mb: 2 }} />
            <Typography variant="h6">No users found</Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Try adjusting your search filters
            </Typography>
          </Box>
        )}

        {/* Summary */}
        {!loading && (
          <Box
            sx={{
              mt: 3,
              p: 2,
              bgcolor: "action.hover",
              borderRadius: 1,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Total Users: <strong>{users.length}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Showing: <strong>{filteredUsers.length}</strong> users
            </Typography>
          </Box>
        )}

        {/* Edit Dialog */}
        <Dialog
          open={editDialogOpen}
          onClose={handleCloseEditDialog}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="h6">Edit User</Typography>
            <IconButton onClick={handleCloseEditDialog} size="small">
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers>
            {selectedUser && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 3, pt: 2 }}>
                {/* User Info */}
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    User Details
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {selectedUser.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedUser.email}
                  </Typography>
                </Box>

                {/* Role Selection */}
                <TextField
                  select
                  label="Role"
                  value={formData.role}
                  onChange={(e) => {
                    const newRole = e.target.value;
                    setFormData({
                      ...formData,
                      role: newRole,
                      // Clear SAP codes if role doesn't need them
                      sap_code_1: rolesWithoutSapCodes.includes(newRole) ? "" : formData.sap_code_1,
                      sap_code_2: rolesWithoutSapCodes.includes(newRole) || newRole !== "Employee" 
                        ? "" 
                        : formData.sap_code_2,
                    });
                    setFormErrors({});
                  }}
                  fullWidth
                  required
                >
                  {roles.map((role) => (
                    <MenuItem key={role} value={role}>
                      {role}
                    </MenuItem>
                  ))}
                </TextField>

                {/* SAP Code Fields (only if role requires them) */}
                {roleRequiresSapCode && (
                  <>
                    <TextField
                      label="SAP Code 1"
                      value={formData.sap_code_1}
                      onChange={(e) => {
                        setFormData({ ...formData, sap_code_1: e.target.value });
                        setFormErrors({ ...formErrors, sap_code_1: "" });
                      }}
                      fullWidth
                      placeholder="E-00000-0000"
                      error={!!formErrors.sap_code_1}
                      helperText={formErrors.sap_code_1 || "Format: E-00000-0000"}
                    />

                    {roleAllowsSecondSapCode && (
                      <TextField
                        label="SAP Code 2 (Optional)"
                        value={formData.sap_code_2}
                        onChange={(e) => {
                          setFormData({ ...formData, sap_code_2: e.target.value });
                          setFormErrors({ ...formErrors, sap_code_2: "" });
                        }}
                        fullWidth
                        placeholder="E-00000-0000"
                        error={!!formErrors.sap_code_2}
                        helperText={formErrors.sap_code_2 || "Format: E-00000-0000 (Only for Employees)"}
                      />
                    )}
                  </>
                )}

                {/* Info message for roles without SAP codes */}
                {!roleRequiresSapCode && (
                  <Box
                    sx={{
                      p: 2,
                      bgcolor: "info.lighter",
                      borderRadius: 1,
                      border: 1,
                      borderColor: "info.light",
                    }}
                  >
                    <Typography variant="body2" color="info.main">
                      This role does not require SAP codes
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={handleCloseEditDialog} color="inherit">
              Cancel
            </Button>
            <Button
              onClick={handleSubmitEdit}
              variant="contained"
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : "Save Changes"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={handleCloseDeleteDialog}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            {selectedUser && (
              <Typography>
                Are you sure you want to delete <strong>{selectedUser.name}</strong>? 
                This action cannot be undone.
              </Typography>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={handleCloseDeleteDialog} color="inherit">
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              variant="contained"
              color="error"
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : "Delete"}
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
}

export default ManageUsers;