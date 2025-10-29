import React from "react";
import { useTheme } from "@mui/material/styles";
import {
  Box,
  Typography,
  Menu,
  MenuItem,
  IconButton,
  Avatar,
} from "@mui/material";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import ThemeToggle from "./ThemeToggle";

const Header = ({
  drawerOpen,
  firstName,
  anchorEl,
  handleProfileClick,
  handleProfileClose,
  handleTabChange,
  handleLogoutClick,
  storeUser,
}) => {
  const theme = useTheme();

  return (
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
          //   mb: 3,
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

      {/* <Box sx={{ p: 2 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}
        ></Box>
      </Box> */}
    </Box>
  );
};

export default Header;
