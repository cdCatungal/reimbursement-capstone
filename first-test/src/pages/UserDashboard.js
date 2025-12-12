import React, { useState, useEffect } from "react";
import { useMediaQuery, useTheme } from "@mui/material";
import { useNavigate } from "react-router-dom";
import MonthlyStats from "../components/MonthlyStats.js";
import {
  Box,
  Typography,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Tooltip,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import ReceiptIcon from "@mui/icons-material/Receipt";
import TrackChangesIcon from "@mui/icons-material/TrackChanges";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import ReceiptUpload from "../components/ReceiptUpload.js";
import StatusTracker from "../components/StatusTracker.js";
import ThemeToggle from "../components/ThemeToggle.js";
import { useAppContext } from "../App.js";
import UserSettings from "../components/UserSettings.js";
import { userUserStore } from "../store/userUserStore.js";

function UserDashboard() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  // const isTablet = useMediaQuery(theme.breakpoints.down("md"));
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));

  const { user, setIsAuthenticated, setIsAdmin, setUser, showNotification } =
    useAppContext();
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(isDesktop);
  const [anchorEl, setAnchorEl] = useState(null);

  // Close drawer on mobile by default, keep open on desktop
  useEffect(() => {
    setDrawerOpen(isDesktop);
  }, [isDesktop]);

  const handleTabChange = (newValue) => {
    setTabValue(newValue);
    // Auto-close drawer on mobile after selecting a tab
    if (isMobile) {
      setDrawerOpen(false);
    }
  };

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

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

  const { getUser, user: storeUser } = userUserStore();

  useEffect(() => {
    getUser();
  }, []);

  const tabs = [
    {
      label: "Upload Receipt",
      component: <ReceiptUpload />,
      icon: <ReceiptIcon />,
    },
    {
      label: "Track Status",
      component: <StatusTracker />,
      icon: <TrackChangesIcon />,
    },
  ];

  const settingsTab = {
    label: "Settings",
    component: <UserSettings />,
  };

  const firstName = user?.username?.split(" ")[0] || user?.username || "User";

  // Determine drawer variant based on screen size
  const drawerVariant = isMobile ? "temporary" : "persistent";
  // const drawerWidth = 240;

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Drawer
        variant={drawerVariant}
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        ModalProps={{
          keepMounted: true, // Better mobile performance
        }}
        sx={{
          width: drawerOpen ? 240 : 64,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerOpen ? 240 : 64,
            height: "100vh",
            boxSizing: "border-box",
            transition: "width 0.3s ease-in-out",
            overflowX: "hidden",
            background: "linear-gradient(180deg, #0c5dcf 0%, #083778 100%)",
            color: "#ffffff",
            borderRight: "none",
            borderRadius: 0,
            backgroundColor: "transparent",
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

        <List sx={{ px: 1 }}>
          {tabs.map((tab, index) => (
            <Tooltip
              key={tab.label}
              title={tab.label}
              placement="right"
              arrow
              PopperProps={{
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
                    flexGrow: 1,
                  }}
                >
                  {tab.label}
                </Box>
              </ListItemButton>
            </Tooltip>
          ))}
        </List>

        {drawerOpen && (
          <Box sx={{ mt: "auto", color: "#000000ff" }}>
            <MonthlyStats />
          </Box>
        )}
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
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
            backgroundColor: "background.paper",
            position: "sticky",
            top: 0,
            zIndex: 1100,
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
          {tabValue === -1 ? settingsTab.component : tabs[tabValue]?.component}
        </Container>
      </Box>
    </Box>
  );
}

export default UserDashboard;
