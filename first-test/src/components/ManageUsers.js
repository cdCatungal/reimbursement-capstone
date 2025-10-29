import React, { useState } from "react";
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
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  People as PeopleIcon,
  Search as SearchIcon,
} from "@mui/icons-material";

function ManageUsers() {
  const [users, setUsers] = useState([
    {
      id: 1,
      name: "John Doe",
      email: "john.doe@erni.com",
      role: "Employee",
      status: "Active",
      avatar: "",
    },
    {
      id: 2,
      name: "Jane Smith",
      email: "jane.smith@erni.com",
      role: "SUL",
      status: "Active",
      avatar: "",
    },
    {
      id: 3,
      name: "Mike Johnson",
      email: "mike.johnson@erni.com",
      role: "Invoice Specialist",
      status: "Active",
      avatar: "",
    },
    {
      id: 4,
      name: "Sarah Williams",
      email: "sarah.williams@erni.com",
      role: "Account Manager",
      status: "Inactive",
      avatar: "",
    },
  ]);

  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "All" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleColor = (role) => {
    const colors = {
      Employee: "default",
      SUL: "primary",
      "Invoice Specialist": "secondary",
      "Account Manager": "success",
    };
    return colors[role] || "default";
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
              Create, edit, and manage user accounts
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            sx={{ minWidth: 150 }}
          >
            Add User
          </Button>
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
            <MenuItem value="Employee">Employee</MenuItem>
            <MenuItem value="SUL">SUL</MenuItem>
            <MenuItem value="Invoice Specialist">Invoice Specialist</MenuItem>
            <MenuItem value="Account Manager">Account Manager</MenuItem>
          </TextField>
        </Box>

        {/* Users Table */}
        <TableContainer component={Paper} sx={{ border: 1, borderColor: "divider" }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: "action.hover" }}>
                <TableCell sx={{ fontWeight: "bold" }}>User</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Email</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Role</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Status</TableCell>
                <TableCell sx={{ fontWeight: "bold" }} align="right">
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow
                  key={user.id}
                  hover
                  sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                >
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Avatar
                        src={user.avatar}
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
                    <Chip
                      label={user.status}
                      size="small"
                      color={user.status === "Active" ? "success" : "default"}
                      variant={user.status === "Active" ? "filled" : "outlined"}
                      sx={{ fontWeight: 500 }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
                      <IconButton size="small" color="primary" aria-label="edit">
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" aria-label="delete">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {filteredUsers.length === 0 && (
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
              Try adjusting your search filters or add a new user
            </Typography>
          </Box>
        )}

        {/* Summary */}
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
      </CardContent>
    </Card>
  );
}

export default ManageUsers;