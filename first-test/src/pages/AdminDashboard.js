import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import MonthlyStats from "../components/MonthlyStats.js";
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
  Tooltip,
  ListItemText,
  Avatar,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import ListAltIcon from "@mui/icons-material/ListAlt";
import AssessmentIcon from "@mui/icons-material/Assessment";
import ReceiptIcon from "@mui/icons-material/Receipt";
import TrackChangesIcon from "@mui/icons-material/TrackChanges";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import ReportExport from "../components/ReportExport.js";
import ReceiptUpload from "../components/ReceiptUpload.js";
import StatusTracker from "../components/StatusTracker.js";
import UserSettings from "../components/UserSettings.js";
import ReimbursementList from "../components/ReimbursementList.js";
import ThemeToggle from "../components/ThemeToggle.js";
import { useAppContext } from "../App.js";
import { userUserStore } from "../store/userUserStore.js";

function AdminDashboard() {
  const theme = useTheme();
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
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/auth/logout`,
        {
          method: "GET",
          credentials: "include",
        }
      );

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
    getUser();
  }, []);

  const isFinanceOfficer = user?.role === "Finance Officer";

  const allTabs = [
    {
      label: "Reimbursement Lists",
      icon: <ListAltIcon />,
      component: <ReimbursementList />,
      visible: true,
    },
    {
      label: "Export Reports",
      icon: <AssessmentIcon />,
      component: <ReportExport />,
      visible: true,
    },
    {
      label: "Upload Receipt",
      icon: <ReceiptIcon />,
      component: <ReceiptUpload />,
      visible: !isFinanceOfficer,
    },
    {
      label: "Track Status",
      icon: <TrackChangesIcon />,
      component: <StatusTracker />,
      visible: !isFinanceOfficer,
    },
  ];

  const visibleTabs = allTabs.filter((tab) => tab.visible);

  const settingsTab = { label: "Settings", component: <UserSettings /> };

  const firstName = user?.username?.split(" ")[0] || user?.username || "Admin";

  const renderContent = () => {
    if (tabValue === -1) {
      return settingsTab.component;
    }
    if (tabValue >= 0 && tabValue < visibleTabs.length) {
      return visibleTabs[tabValue].component;
    }
    return null;
  };

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Drawer
        variant="persistent"
        anchor="left"
        open={true}
        sx={{
          width: drawerOpen ? 240 : 64,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerOpen ? 240 : 64,
            height: "100vh", // ensure full height — no white corners
            boxSizing: "border-box",
            transition: "width 0.3s ease-in-out",
            overflowX: "hidden",
            background: "linear-gradient(180deg, #0c5dcf 0%, #083778 100%)",
            color: "#ffffff",
            borderRight: "none",
            borderRadius: 0, // remove default rounded corners
            backgroundColor: "transparent", // avoid white background bleed-through
          },
        }}
      >
        <Box
          sx={{
            p: 2,
            display: "flex",
            justifyContent: "flex-start",
          }}
        >
          <IconButton
            onClick={toggleDrawer}
            size="large"
            sx={{ color: "#ffffff", ml: drawerOpen ? 0 : "-6px" }}
          >
            <MenuIcon />
          </IconButton>
        </Box>
        <List>
          {visibleTabs.map((tab, index) => (
            <Tooltip
              key={tab.label}
              title={tab.label}
              placement="right"
              arrow
              PopperProps={{
                // Only show tooltip if text is truncated OR drawer is closed
                modifiers: [
                  {
                    name: "preventOverflow",
                    enabled: true,
                    options: { boundariesElement: "window" },
                  },
                ],
              }}
            >
              <ListItemButton
                selected={tabValue === index}
                onClick={() => handleTabChange(index)}
                sx={{
                  borderRadius: 2,
                  mb: 0.5,
                  mx: 1,
                  color: "#ffffff",
                  justifyContent: drawerOpen ? "flex-start" : "center",
                  px: drawerOpen ? 2 : 0.5,
                  transition: "all 0.3s ease",
                  "&.Mui-selected": {
                    backgroundColor: "rgba(255, 255, 255, 0.15)",
                    "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.2)" },
                  },
                  "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.1)" },
                }}
              >
                <ListItemIcon
                  sx={{
                    color: "#ffffff",
                    minWidth: 0,
                    mr: drawerOpen ? 2 : "auto",
                    ml: drawerOpen ? 0 : 1,
                    justifyContent: "center",
                    transition: "all 0.3s ease",
                  }}
                >
                  {tab.icon}
                </ListItemIcon>

                <Box
                  component="span"
                  sx={{
                    opacity: drawerOpen ? 1 : 0,
                    width: drawerOpen ? "auto" : 0,
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                    textOverflow: "ellipsis",
                    minWidth: 0,
                    transition: "all 0.3s ease",
                    // This line makes tooltip work even when drawer is open but text is cut off
                    // (optional but recommended)
                    flexGrow: 1,
                  }}
                >
                  {tab.label}
                </Box>
              </ListItemButton>
            </Tooltip>
          ))}
        </List>

        {drawerOpen && !isFinanceOfficer && (
          <Box sx={{ mt: "auto", color: "#000000ff" }}>
            <MonthlyStats />
          </Box>
        )}
      </Drawer>

      <Box
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box
          sx={{
            p: 2,
            borderBottom: `2px solid ${
              theme.palette.mode === "dark"
                ? "rgba(255, 255, 255, 0.33)"
                : "rgba(0, 0, 0, 0.51)"
            }`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <img
              src={
                theme.palette.mode === "dark"
                  ? "/erni-logo-darkmode.png"
                  : "/erni-logo.png"
              }
              alt="ERNI Logo"
              style={{ height: "40px", cursor: "pointer" }}
              onClick={() => handleTabChange(0)}
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

        <Container maxWidth="lg" sx={{ py: 3, flexGrow: 1 }}>
          {renderContent()}
        </Container>
      </Box>
    </Box>
  );
}

export default AdminDashboard;
