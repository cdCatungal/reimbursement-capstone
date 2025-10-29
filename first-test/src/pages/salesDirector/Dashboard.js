import React, { useEffect, useState } from "react";
import { Box, Paper } from "@mui/material";
import Header from "../../components/Header.js";
import Sidepanel from "../../components/Sidepanel.js";
import { Outlet } from "react-router-dom";
import { userUserStore } from "../../store/userUserStore.js";
import { useAppContext } from "../../App.js";

const Dashboard = () => {
  const { user } = useAppContext();
  const { getUser, user: storeUser } = userUserStore();
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [anchorEl, setAnchorEl] = useState(null);

  useEffect(() => {
    getUser();
  }, []);

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleProfileClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileClose = () => {
    setAnchorEl(null);
  };

  const handleTabChange = (newValue) => {
    setTabValue(newValue);
  };

  const [tabValue, setTabValue] = useState(0);

  const firstName = user?.username?.split(" ")[0] || user?.username || "Admin";

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Sidepanel drawerOpen={drawerOpen} onToggleDrawer={toggleDrawer} />

      <Box sx={{ flexGrow: 1 }}>
        {/* display: "flex", flexDirection: "column"  */}
        <Header
          drawerOpen={drawerOpen}
          handleProfileClick={handleProfileClick}
          handleProfileClose={handleProfileClose}
          handleTabChange={handleTabChange}
          anchorEl={anchorEl}
          storeUser={storeUser}
          firstName={firstName}
        />

        {/* Main Content Area for Routes */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            ml: drawerOpen ? "240px" : "64px",
            transition: "margin-left 0.3s ease-in-out",
          }}
        >
          {/* <Paper
            elevation={3}
            sx={{
              p: 3,
              borderRadius: 3,
              minHeight: "calc(100vh - 200px)",
            }}
          > */}
          <Outlet />
          {/* </Paper> */}
        </Box>
      </Box>
    </Box>
  );
};

export default Dashboard;
