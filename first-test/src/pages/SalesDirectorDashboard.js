import React, { useState, useEffect } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import UserSettings from "../components/UserSettings.js";
import SalesDirectorReportExport from "../components/SalesDirectorReportExport.js";
import ManageSAPCodes from "../components/ManageSAPCodes.js";
import ManageUsers from "../components/ManageUsers.js";
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
  Avatar,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import ListAltIcon from "@mui/icons-material/ListAlt";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import AssessmentIcon from "@mui/icons-material/Assessment";
import CodeIcon from "@mui/icons-material/Code";
import PeopleIcon from "@mui/icons-material/People";
import ThemeToggle from "../components/ThemeToggle.js";
import { useAppContext } from "../App.js";
import { userUserStore } from "../store/userUserStore.js";
import SalesDirectorReimbursementList from "../components/SalesDirectorReimbursementList.js";

function SalesDirectorDashboard() {
  const theme = useTheme();
  const { user, setIsAuthenticated, setIsAdmin, setUser, showNotification } =
    useAppContext();
  const navigate = useNavigate();
  const { getUser, user: storeUser } = userUserStore();

  const [anchorEl, setAnchorEl] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  useEffect(() => {
    getUser();
  }, []);

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

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleTabChange = (newValue) => {
    setTabValue(newValue);
  };

  const handleUserProfileClick = () => {
    handleTabChange(-1);
    handleProfileClose();
  };

  const firstName = user?.username?.split(" ")[0] || user?.username || "Admin";

  const allTabs = [
    {
      label: "Manage Requests",
      icon: <ListAltIcon />,
      component: <SalesDirectorReimbursementList />,
    },
    {
      label: "Export Reports",
      icon: <AssessmentIcon />,
      component: <SalesDirectorReportExport />,
    },
    {
      label: "Manage SAP Codes",
      icon: <CodeIcon />,
      component: <ManageSAPCodes />,
    },
    {
      label: "Manage Users",
      icon: <PeopleIcon />,
      component: <ManageUsers />,
    },
  ];

  const renderContent = () => {
    if (tabValue === -1) {
      return <UserSettings />;
    }
    if (tabValue >= 0 && tabValue < allTabs.length) {
      return allTabs[tabValue].component;
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
            height: "100%", // Changed from "100vh" to "100%"
            position: "fixed", // Add fixed positioning
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
        <List>
          {allTabs.map((tab, index) => (
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
              <MenuItem onClick={handleUserProfileClick}>User Profile</MenuItem>
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

export default SalesDirectorDashboard;
