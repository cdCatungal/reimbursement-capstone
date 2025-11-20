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
  Pagination,
  Switch,
  FormControlLabel,
  Tooltip,
  Autocomplete,
  Alert,
  Divider,
  Collapse,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  People as PeopleIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  Block as BlockIcon,
  CheckCircle as CheckCircleIcon,
  AccountBalance as AccountBalanceIcon,
  Assignment as AssignmentIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  PersonOutline as PersonOutlineIcon,
} from "@mui/icons-material";
import { useManageUsersStore } from "../store/manageUsersStore.js";
import { useManageSapCodesStore } from "../store/manageSapCodesStore.js";

function ManageUsers() {
  const { users, loading, fetchUsers, updateUser, deleteUser } =
    useManageUsersStore();

  const { sapCodes, fetchActiveSapCodes } = useManageSapCodesStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    role: "",
    sap_code_ids: [],
    assigned_sul_id: null,
    isActive: true,
  });
  const [formErrors, setFormErrors] = useState({});

  // ✅ NEW: State for showing subordinates
  const [showSubordinates, setShowSubordinates] = useState(false);

  // Pagination state - 10 items per page for users
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchUsers();
    fetchActiveSapCodes();
  }, [fetchUsers, fetchActiveSapCodes]);

  // Filter users
  const filteredUsers = users
    .filter((user) => {
      const matchesSearch =
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter === "All" || user.role === roleFilter;
      const matchesStatus =
        statusFilter === "All" ||
        (statusFilter === "Active" && user.isActive) ||
        (statusFilter === "Inactive" && !user.isActive);
      return matchesSearch && matchesRole && matchesStatus;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [searchTerm, roleFilter, statusFilter]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  const handlePageChange = (event, value) => {
    setPage(value);
  };

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

  const rolesWithoutSapCodes = [
    "Admin",
    "Invoice Specialist",
    "Sales Director",
    "Finance Officer",
  ];

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

  // Get SUL users for the dropdown
  const sulUsers = users.filter((u) => u.role === "SUL");

  // ✅ Get SAP codes MANAGED by this Account Manager (for approval)
  const getManagedSapCodes = (userId) => {
    return sapCodes.filter((sc) => sc.account_manager_id === userId);
  };

  // ✅ NEW: Get subordinates (employees assigned to this SUL)
  const getSubordinates = (sulId) => {
    return users.filter(
      (user) => user.assigned_sul_id === sulId && user.role === "Employee"
    );
  };

  const handleEditClick = (user) => {
    setSelectedUser(user);

    // Extract SAP code IDs from the user's sapCodes array
    const sapCodeIds = user.sapCodes ? user.sapCodes.map((sc) => sc.id) : [];

    setFormData({
      role: user.role,
      sap_code_ids: sapCodeIds,
      assigned_sul_id: user.assigned_sul_id || null,
      isActive: user.isActive !== undefined ? user.isActive : true,
    });
    setFormErrors({});
    setShowSubordinates(false); // Reset subordinates view when opening modal
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setSelectedUser(null);
    setFormData({
      role: "",
      sap_code_ids: [],
      assigned_sul_id: null,
      isActive: true,
    });
    setFormErrors({});
    setShowSubordinates(false);
  };

  const handleSubmitEdit = async () => {
    const errors = {};

    // ✅ UPDATED: Employee, Account Manager, AND SUL require SAP codes
    if (
      formData.role === "Employee" ||
      formData.role === "Account Manager" ||
      formData.role === "SUL"
    ) {
      if (!formData.sap_code_ids || formData.sap_code_ids.length === 0) {
        errors.sap_code_ids = `At least one SAP code is required for ${formData.role}s`;
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const result = await updateUser(selectedUser.id, formData);
    if (result.success) handleCloseEditDialog();
  };

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
    if (result.success) handleCloseDeleteDialog();
  };

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
        <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
          <TextField
            fullWidth
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <SearchIcon sx={{ mr: 1, color: "action.active" }} />
              ),
            }}
            sx={{ flexBasis: { xs: "100%", sm: "auto" }, flexGrow: 1 }}
          />
          <TextField
            select
            label="Filter by Role"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="All">All Roles</MenuItem>
            {roles.map((role) => (
              <MenuItem key={role} value={role}>
                {role}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Filter by Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="All">All Status</MenuItem>
            <MenuItem value="Active">Active</MenuItem>
            <MenuItem value="Inactive">Inactive</MenuItem>
          </TextField>
        </Box>

        {/* Loading */}
        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {/* Users Table */}
        {!loading && filteredUsers.length > 0 && (
          <>
            <TableContainer
              component={Paper}
              sx={{ border: 1, borderColor: "divider" }}
            >
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: "action.hover" }}>
                    <TableCell sx={{ fontWeight: "bold" }}>User</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Role</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>
                      SAP Code(s)
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>
                      Assigned SUL
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold" }} align="right">
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedUsers.map((user) => {
                    const isActive =
                      user.isActive !== undefined ? user.isActive : true;
                    const managedSapCodes =
                      user.role === "Account Manager"
                        ? getManagedSapCodes(user.id)
                        : [];
                    const assignedSapCodes = user.sapCodes || [];

                    return (
                      <TableRow
                        key={user.id}
                        hover
                        sx={{
                          opacity: isActive ? 1 : 0.6,
                          bgcolor: isActive ? "inherit" : "action.hover",
                        }}
                      >
                        <TableCell>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 2,
                            }}
                          >
                            <Avatar
                              src={user.profilePicture}
                              sx={{
                                bgcolor: isActive ? "primary.main" : "grey.500",
                                width: 40,
                                height: 40,
                              }}
                            >
                              {user.name.charAt(0)}
                            </Avatar>
                            <Typography sx={{ fontWeight: 500 }}>
                              {user.name}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={user.role}
                            size="small"
                            color={getRoleColor(user.role)}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={
                              isActive ? <CheckCircleIcon /> : <BlockIcon />
                            }
                            label={isActive ? "Active" : "Inactive"}
                            size="small"
                            color={isActive ? "success" : "default"}
                            variant={isActive ? "filled" : "outlined"}
                          />
                        </TableCell>
                        <TableCell>
                          {user.role === "Account Manager" ? (
                            <Box
                              sx={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 1,
                              }}
                            >
                              {managedSapCodes.length > 0 && (
                                <Box>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ display: "block", mb: 0.5 }}
                                  >
                                    <AccountBalanceIcon
                                      sx={{
                                        fontSize: 12,
                                        mr: 0.5,
                                        verticalAlign: "middle",
                                      }}
                                    />
                                    Manages (Approval):
                                  </Typography>
                                  <Box
                                    sx={{
                                      display: "flex",
                                      gap: 0.5,
                                      flexWrap: "wrap",
                                    }}
                                  >
                                    {managedSapCodes.map((sapCode) => (
                                      <Chip
                                        key={`managed-${sapCode.id}`}
                                        label={sapCode.code}
                                        size="small"
                                        variant="filled"
                                        color="success"
                                      />
                                    ))}
                                  </Box>
                                </Box>
                              )}

                              {assignedSapCodes.length > 0 && (
                                <Box>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ display: "block", mb: 0.5 }}
                                  >
                                    <AssignmentIcon
                                      sx={{
                                        fontSize: 12,
                                        mr: 0.5,
                                        verticalAlign: "middle",
                                      }}
                                    />
                                    Assigned (Submission):
                                  </Typography>
                                  <Box
                                    sx={{
                                      display: "flex",
                                      gap: 0.5,
                                      flexWrap: "wrap",
                                    }}
                                  >
                                    {assignedSapCodes.map((sapCode) => (
                                      <Chip
                                        key={`assigned-${sapCode.id}`}
                                        label={sapCode.code}
                                        size="small"
                                        variant="outlined"
                                        color="success"
                                      />
                                    ))}
                                  </Box>
                                </Box>
                              )}

                              {managedSapCodes.length === 0 &&
                                assignedSapCodes.length === 0 && (
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                  >
                                    No SAP codes
                                  </Typography>
                                )}
                            </Box>
                          ) : assignedSapCodes.length > 0 ? (
                            <Box
                              sx={{
                                display: "flex",
                                gap: 0.5,
                                flexWrap: "wrap",
                              }}
                            >
                              {assignedSapCodes.map((sapCode) => (
                                <Chip
                                  key={sapCode.id}
                                  label={sapCode.code}
                                  size="small"
                                  variant="outlined"
                                />
                              ))}
                            </Box>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              {rolesWithoutSapCodes.includes(user.role)
                                ? "N/A"
                                : "Not assigned"}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {user.assignedSUL ? (
                            <Chip
                              label={user.assignedSUL.name}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              {user.role === "Employee"
                                ? "Not assigned"
                                : "N/A"}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <Box
                            sx={{
                              display: "flex",
                              gap: 1,
                              justifyContent: "flex-end",
                            }}
                          >
                            <Tooltip title="Edit user">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => handleEditClick(user)}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete user">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeleteClick(user)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Pagination */}
            {totalPages > 1 && (
              <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={handlePageChange}
                  color="primary"
                  showFirstButton
                  showLastButton
                />
              </Box>
            )}
          </>
        )}

        {/* Empty State */}
        {!loading && filteredUsers.length === 0 && (
          <Box textAlign="center" py={6} color="text.secondary">
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
              flexWrap: "wrap",
              gap: 2,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Total Users: <strong>{users.length}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Active:{" "}
              <strong>
                {users.filter((u) => u.isActive !== false).length}
              </strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Inactive:{" "}
              <strong>
                {users.filter((u) => u.isActive === false).length}
              </strong>
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
          <DialogTitle
            sx={{ display: "flex", justifyContent: "space-between" }}
          >
            <Typography variant="h6">Edit User</Typography>
            <IconButton onClick={handleCloseEditDialog} size="small">
              <CloseIcon />
            </IconButton>
          </DialogTitle>

          <DialogContent dividers>
            {selectedUser && (
              <Box
                sx={{ display: "flex", flexDirection: "column", gap: 3, pt: 2 }}
              >
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    User Details
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {selectedUser.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedUser.email}
                  </Typography>
                </Box>

                {/* Account Status Toggle */}
                <Box
                  sx={{
                    p: 2,
                    bgcolor: formData.isActive
                      ? "success.lighter"
                      : "error.lighter",
                    borderRadius: 1,
                    border: 1,
                    borderColor: formData.isActive
                      ? "success.main"
                      : "error.main",
                  }}
                >
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.isActive}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            isActive: e.target.checked,
                          })
                        }
                        color={formData.isActive ? "success" : "default"}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          Account Status:{" "}
                          {formData.isActive ? "Active" : "Inactive"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formData.isActive
                            ? "User can log in and access the system"
                            : "User cannot log in (for resigned employees)"}
                        </Typography>
                      </Box>
                    }
                  />
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
                      sap_code_ids:
                        newRole === "Employee" || newRole === "Account Manager"
                          ? formData.sap_code_ids
                          : [],
                      assigned_sul_id:
                        newRole === "Employee"
                          ? formData.assigned_sul_id
                          : null,
                    });
                    setFormErrors({});
                    setShowSubordinates(false); // Reset subordinates view when role changes
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

                {/* Employee and Account Manager: SAP Code Assignment */}
                {(formData.role === "Employee" ||
                  formData.role === "Account Manager" ||
                  formData.role === "SUL") && (
                  <>
                    <Autocomplete
                      multiple
                      options={sapCodes}
                      getOptionLabel={(option) =>
                        `${option.code} - ${option.name}`
                      }
                      value={sapCodes.filter((sc) =>
                        formData.sap_code_ids?.includes(sc.id)
                      )}
                      onChange={(event, newValue) => {
                        setFormData({
                          ...formData,
                          sap_code_ids: newValue.map((v) => v.id),
                        });
                        setFormErrors({});
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label={
                            formData.role === "Account Manager"
                              ? "Assigned SAP Codes (for Submission)"
                              : formData.role === "SUL"
                              ? "Assigned SAP Codes (for Submission)"
                              : "SAP Codes"
                          }
                          placeholder="Select SAP codes"
                          error={!!formErrors.sap_code_ids}
                          helperText={
                            formErrors.sap_code_ids ||
                            (formData.role === "Account Manager"
                              ? "SAP codes this Account Manager can use for their own reimbursement submissions"
                              : formData.role === "SUL"
                              ? "SAP codes this SUL can use for their own reimbursement submissions"
                              : "Select one or more SAP codes for this employee")
                          }
                          required
                        />
                      )}
                      renderTags={(value, getTagProps) =>
                        value.map((option, index) => (
                          <Chip
                            key={option.id}
                            label={option.code}
                            {...getTagProps({ index })}
                            size="small"
                            color={
                              formData.role === "Account Manager" ||
                              formData.role === "SUL"
                                ? "success"
                                : "default"
                            }
                          />
                        ))
                      }
                    />

                    {/* Account Manager: Show managed SAP codes info */}
                    {formData.role === "Account Manager" && (
                      <Box
                        sx={{
                          p: 2,
                          bgcolor: "info.lighter",
                          borderRadius: 1,
                          border: 1,
                          borderColor: "info.main",
                        }}
                      >
                        <Typography
                          variant="body2"
                          fontWeight="bold"
                          color="info.dark"
                          sx={{ mb: 1 }}
                        >
                          <AccountBalanceIcon
                            sx={{
                              fontSize: 16,
                              mr: 0.5,
                              verticalAlign: "middle",
                            }}
                          />
                          Account Manager Approval Responsibilities
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mb: 2 }}
                        >
                          To assign SAP codes that this Account Manager will{" "}
                          <strong>approve</strong>, go to{" "}
                          <strong>"Manage SAP Codes"</strong> and set them as
                          the Account Manager for specific codes.
                        </Typography>

                        {getManagedSapCodes(selectedUser.id).length > 0 ? (
                          <>
                            <Divider sx={{ my: 1.5 }} />
                            <Typography
                              variant="body2"
                              fontWeight="bold"
                              color="text.secondary"
                              sx={{ mb: 1 }}
                            >
                              Currently Managing (for Approval):
                            </Typography>
                            <Box
                              sx={{
                                display: "flex",
                                gap: 0.5,
                                flexWrap: "wrap",
                              }}
                            >
                              {getManagedSapCodes(selectedUser.id).map((sc) => (
                                <Chip
                                  key={sc.id}
                                  label={`${sc.code} - ${sc.name}`}
                                  size="small"
                                  color="success"
                                  variant="filled"
                                />
                              ))}
                            </Box>
                          </>
                        ) : (
                          <>
                            <Divider sx={{ my: 1.5 }} />
                            <Alert severity="warning" sx={{ mt: 1 }}>
                              This Account Manager is not managing any SAP codes
                              yet. Assign them in "Manage SAP Codes" to enable
                              approval routing.
                            </Alert>
                          </>
                        )}
                      </Box>
                    )}

                    {/* ✅ NEW: SUL Info Box */}
                    {formData.role === "SUL" && (
                      <Box
                        sx={{
                          p: 2,
                          bgcolor: "info.lighter",
                          borderRadius: 1,
                          border: 1,
                          borderColor: "info.main",
                        }}
                      >
                        <Typography
                          variant="body2"
                          fontWeight="bold"
                          color="info.dark"
                          sx={{ mb: 1 }}
                        >
                          <PeopleIcon
                            sx={{
                              fontSize: 16,
                              mr: 0.5,
                              verticalAlign: "middle",
                            }}
                          />
                          SUL SAP Code Assignment
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          These SAP codes are for the SUL's{" "}
                          <strong>own reimbursement submissions</strong>. SULs
                          can approve reimbursements from their assigned
                          employees regardless of these assignments.
                        </Typography>
                      </Box>
                    )}
                  </>
                )}

                {/* Employee: SUL Assignment */}
                {formData.role === "Employee" && (
                  <TextField
                    select
                    label="Assigned SUL"
                    value={formData.assigned_sul_id || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        assigned_sul_id: e.target.value || null,
                      })
                    }
                    fullWidth
                    helperText="Assign a SUL to manage this employee (optional)"
                  >
                    <MenuItem value="">
                      <em>None (No SUL assigned)</em>
                    </MenuItem>
                    {sulUsers.map((sul) => (
                      <MenuItem key={sul.id} value={sul.id}>
                        {sul.name}
                      </MenuItem>
                    ))}
                  </TextField>
                )}

                {/* ✅ NEW: Show Subordinates Toggle for SUL users */}
                {formData.role === "SUL" && (
                  <Box
                    sx={{
                      p: 2,
                      bgcolor: "primary.lighter",
                      borderRadius: 1,
                      border: 1,
                      borderColor: "primary.main",
                    }}
                  >
                    <Button
                      fullWidth
                      variant="outlined"
                      color="primary"
                      startIcon={
                        showSubordinates ? (
                          <ExpandLessIcon />
                        ) : (
                          <ExpandMoreIcon />
                        )
                      }
                      onClick={() => setShowSubordinates(!showSubordinates)}
                      sx={{ mb: showSubordinates ? 2 : 0 }}
                    >
                      {showSubordinates
                        ? "Hide Subordinates"
                        : "Show Subordinates"}
                    </Button>

                    <Collapse in={showSubordinates}>
                      {(() => {
                        const subordinates = getSubordinates(selectedUser.id);

                        if (subordinates.length === 0) {
                          return (
                            <Alert severity="info">
                              This SUL has no employees assigned yet.
                            </Alert>
                          );
                        }

                        return (
                          <>
                            <Typography
                              variant="body2"
                              fontWeight="bold"
                              color="primary.dark"
                              sx={{ mb: 1 }}
                            >
                              <PeopleIcon
                                sx={{
                                  fontSize: 16,
                                  mr: 0.5,
                                  verticalAlign: "middle",
                                }}
                              />
                              Assigned Employees ({subordinates.length})
                            </Typography>
                            <Divider sx={{ mb: 2 }} />
                            <List
                              sx={{
                                bgcolor: "background.paper",
                                borderRadius: 1,
                                maxHeight: 300,
                                overflow: "auto",
                              }}
                            >
                              {subordinates.map((employee, index) => (
                                <React.Fragment key={employee.id}>
                                  {index > 0 && (
                                    <Divider variant="inset" component="li" />
                                  )}
                                  <ListItem>
                                    <ListItemAvatar>
                                      <Avatar
                                        src={employee.profilePicture}
                                        sx={{ bgcolor: "primary.main" }}
                                      >
                                        {employee.name.charAt(0)}
                                      </Avatar>
                                    </ListItemAvatar>
                                    <ListItemText
                                      primary={
                                        <Box
                                          sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 1,
                                          }}
                                        >
                                          <Typography
                                            variant="body2"
                                            fontWeight="medium"
                                          >
                                            {employee.name}
                                          </Typography>
                                          {!employee.isActive && (
                                            <Chip
                                              label="Inactive"
                                              size="small"
                                              color="default"
                                              variant="outlined"
                                            />
                                          )}
                                        </Box>
                                      }
                                      secondary={
                                        <Box sx={{ mt: 0.5 }}>
                                          <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            display="block"
                                          >
                                            {employee.email}
                                          </Typography>
                                          {employee.sapCodes &&
                                            employee.sapCodes.length > 0 && (
                                              <Box
                                                sx={{
                                                  display: "flex",
                                                  gap: 0.5,
                                                  flexWrap: "wrap",
                                                  mt: 0.5,
                                                }}
                                              >
                                                {employee.sapCodes.map((sc) => (
                                                  <Chip
                                                    key={sc.id}
                                                    label={sc.code}
                                                    size="small"
                                                    variant="outlined"
                                                    sx={{
                                                      height: 20,
                                                      fontSize: "0.7rem",
                                                    }}
                                                  />
                                                ))}
                                              </Box>
                                            )}
                                        </Box>
                                      }
                                    />
                                  </ListItem>
                                </React.Fragment>
                              ))}
                            </List>
                          </>
                        );
                      })()}
                    </Collapse>
                  </Box>
                )}

                {/* Other Roles Info */}
                {rolesWithoutSapCodes.includes(formData.role) && (
                  <Box sx={{ p: 2, bgcolor: "grey.100", borderRadius: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      This role does not require SAP code assignments.
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

        {/* Delete Dialog */}
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
                Are you sure you want to delete{" "}
                <strong>{selectedUser.name}</strong>? This action cannot be
                undone.
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
