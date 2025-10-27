import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Box,
  Typography,
  Menu,
  MenuItem,
  IconButton,
  Drawer,
  ListItemButton,
  ListItemIcon,
  List,
  ListItemText,
  Avatar,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import ListAltIcon from "@mui/icons-material/ListAlt";
import AssessmentIcon from "@mui/icons-material/Assessment";
import ReceiptIcon from "@mui/icons-material/Receipt";
import TrackChangesIcon from "@mui/icons-material/TrackChanges";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import ReportExport from "./ReportExport";
import ReceiptUpload from "./ReceiptUpload";
import StatusTracker from "./StatusTracker";
import ReimbursementList from "./ReimbursementList";
import ThemeToggle from "./ThemeToggle";
import { useAppContext } from "../App";
import UserSettings from "./UserSettings";
import { userUserStore } from "../store/userUserStore.js";

function AdminDashboard() {
  const { user, setIsAuthenticated, setIsAdmin, setUser, showNotification } =
    useAppContext();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(true);

  const handleProfileClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileClose = () => {
    setAnchorEl(null);
  };

  const handleLogoutClick = async () => {
    try {
      const response = await fetch("http://localhost:5000/auth/logout", {
        method: "GET",
        credentials: "include",
      });

      if (response.ok) {
        setIsAuthenticated(false);
        setIsAdmin(false);
        setUser(null);
        showNotification("Logged out successfully", "success");
        navigate("/login");
      } else {
        showNotification("Logout failed", "error");
      }
    } catch (error) {
      console.error("Logout error:", error);
      setIsAuthenticated(false);
      setIsAdmin(false);
      setUser(null);
      navigate("/login");
    }
    handleProfileClose();
  };

  const handleTabChange = (newValue) => {
    setTabValue(newValue);
  };

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  const { getUser, user: storeUser } = userUserStore();

  useEffect(() => {
    getUser(); // fetches Microsoft profile info (including profilePicture)
  }, []);

  const tabs = [
    {
      label: "Reimbursement Lists",
      icon: <ListAltIcon />,
    },
    {
      label: "Export Summary Reports",
      icon: <AssessmentIcon />,
    },
    {
      label: "Upload Receipt",
      icon: <ReceiptIcon />,
    },
    {
      label: "Track Status",
      icon: <TrackChangesIcon />,
    },
  ];

  const settingsTab = {
    label: "Settings",
    component: <UserSettings />,
  };

  const firstName = user?.username?.split(" ")[0] || user?.username || "Admin";

  // ✅ Updated to handle -1 for settings
  const renderContent = () => {
    if (tabValue === -1) {
      return settingsTab.component;
    }

    switch (tabValue) {
      case 0:
        return <ReimbursementList />;
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
    <Container
      maxWidth="lg"
      sx={{ py: 0, display: "flex", minHeight: "100vh" }}
    >
      <Drawer
        variant="persistent"
        anchor="left"
        open={true}
        sx={{
          width: drawerOpen ? 10 : 10,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerOpen ? 240 : 64,
            boxSizing: "border-box",
            transition: "width 0.3s ease-in-out",
            overflowX: "hidden",
          },
        }}
      >
        <Box
          sx={{
            p: 2,
            display: "flex",
            justifyContent: drawerOpen ? "flex-end" : "center",
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
                "&.Mui-selected": {
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
          ml: drawerOpen ? "240px" : "64px",
          transition: "margin-left 0.3s ease-in-out",
        }}
      >
        <Box
          sx={{
            p: 2,
            borderBottom: 1,
            borderColor: "divider",
            mb: 3,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <img
              src="/erni-logo.png"
              alt="ERNI Logo"
              style={{ height: "40px" }}
            />
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Typography variant="h6">Welcome, {firstName}</Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <ThemeToggle />
              <IconButton
                onClick={handleProfileClick}
                color="inherit"
                size="large"
              >
                <Avatar
                  src={storeUser?.profilePicture}
                  alt={storeUser?.name || storeUser?.username}
                  sx={{
                    width: 32,
                    height: 32,
                    bgcolor: "primary.main",
                    fontSize: "0.9rem",
                  }}
                >
                  {!storeUser?.profilePicture &&
                    (storeUser?.name?.charAt(0).toUpperCase() ||
                      storeUser?.username?.charAt(0).toUpperCase())}
                </Avatar>
              </IconButton>
            </Box>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleProfileClose}
            >
              {/* ✅ Fixed to use handleTabChange(-1) */}
              <MenuItem
                onClick={() => {
                  handleTabChange(-1);
                  handleProfileClose();
                }}
              >
                User Profile
              </MenuItem>
              <MenuItem onClick={handleLogoutClick}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <span>Logout</span>
                  <ExitToAppIcon />
                </Box>
              </MenuItem>
            </Menu>
          </Box>
        </Box>

        <Box sx={{ p: 2 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 3,
            }}
          >
            <Typography variant="h4" sx={{ fontWeight: "bold" }}>
              Admin Dashboard
            </Typography>
          </Box>

          {/* ✅ Only use renderContent() - removed duplicate */}
          {renderContent()}
        </Box>
      </Box>
    </Container>
  );
}

export default AdminDashboard;
