import React, { useState } from "react";
import {
  Card,
  CardContent,
  Box,
  Typography,
  Button,
  TextField,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Paper,
  Divider,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Code as CodeIcon,
} from "@mui/icons-material";

function ManageSAPCodes() {
  const [sapCodes, setSapCodes] = useState([
    {
      id: 1,
      code: "PRJ-2025-IT-DEV-002",
      name: "ERNI Bootcamp Trainee Program",
      date: "Jan 25, 2025",
    },
    {
      id: 2,
      code: "PRJ-2025-IT-DEV-003",
      name: "Client Project Alpha",
      date: "Feb 10, 2025",
    },
  ]);

  const [searchTerm, setSearchTerm] = useState("");

  const filteredCodes = sapCodes.filter(
    (code) =>
      code.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      code.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card sx={{ mt: 3, boxShadow: 3 }}>
      <CardContent sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
          <CodeIcon sx={{ fontSize: 32, color: "primary.main", mr: 2 }} />
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: "bold" }}>
              Manage SAP Codes
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Create, edit, and manage SAP project codes
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            sx={{ minWidth: 180 }}
          >
            Add New SAP Code
          </Button>
        </Box>

        {/* Search */}
        <TextField
          fullWidth
          placeholder="Search SAP codes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ mb: 3 }}
        />

        {/* SAP Codes List */}
        <Paper sx={{ border: 1, borderColor: "divider" }}>
          <List>
            {filteredCodes.map((code, index) => (
              <React.Fragment key={code.id}>
                <ListItem
                  sx={{
                    py: 2,
                    "&:hover": {
                      bgcolor: "action.hover",
                    },
                  }}
                  secondaryAction={
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <IconButton edge="end" aria-label="edit" color="primary">
                        <EditIcon />
                      </IconButton>
                      <IconButton edge="end" aria-label="delete" color="error">
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  }
                >
                  <ListItemText
                    primary={
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {code.name}
                      </Typography>
                    }
                    secondary={
                      <Box sx={{ mt: 0.5 }}>
                        <Typography
                          variant="body2"
                          color="primary"
                          sx={{ fontWeight: 500 }}
                        >
                          {code.code}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Created: {code.date}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
                {index < filteredCodes.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </Paper>

        {filteredCodes.length === 0 && (
          <Box
            sx={{
              textAlign: "center",
              py: 6,
              color: "text.secondary",
            }}
          >
            <CodeIcon sx={{ fontSize: 64, opacity: 0.3, mb: 2 }} />
            <Typography variant="h6">No SAP codes found</Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Try adjusting your search or add a new SAP code
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

export default ManageSAPCodes;