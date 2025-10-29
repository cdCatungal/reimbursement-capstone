import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  Box,
  IconButton,
  Drawer,
  ListItemButton,
  ListItemIcon,
  List,
  ListItemText,
  Collapse,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import ListAltIcon from "@mui/icons-material/ListAlt";
import AssessmentIcon from "@mui/icons-material/Assessment";
import ReceiptIcon from "@mui/icons-material/Receipt";
import TrackChangesIcon from "@mui/icons-material/TrackChanges";
import PeopleIcon from "@mui/icons-material/People";
import CodeIcon from "@mui/icons-material/Code";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import MonthlyStats from "./MonthlyStats";

const Sidepanel = ({ drawerOpen, onToggleDrawer }) => {
  const [reimbursementOpen, setReimbursementOpen] = useState(true);

  const handleReimbursementClick = () => {
    setReimbursementOpen(!reimbursementOpen);
  };

  const menuItems = [
    {
      type: "dropdown",
      label: "Reimbursement List",
      icon: <ListAltIcon />,
      open: reimbursementOpen,
      onToggle: handleReimbursementClick,
      children: [
        {
          label: "Admin Reimbursement",
          path: "/sales-director",
          icon: <ReceiptIcon />,
        },
        {
          label: "Employee Reimbursement",
          path: "/employee-reimbursement",
          icon: <TrackChangesIcon />,
        },
      ],
    },
    // {
    //   type: "link",
    //   label: "Export Reports",
    //   path: "/export-reports",
    //   icon: <AssessmentIcon />,
    // },
    // {
    //   type: "link",
    //   label: "Manage SAP Codes",
    //   path: "/manage-sap-codes",
    //   icon: <CodeIcon />,
    // },
    // {
    //   type: "link",
    //   label: "Manage Users",
    //   path: "/manage-users",
    //   icon: <PeopleIcon />,
    // },
  ];

  return (
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
        <IconButton onClick={onToggleDrawer} color="inherit" size="large">
          <MenuIcon />
        </IconButton>
      </Box>

      <List>
        {menuItems.map((item, index) => (
          <React.Fragment key={item.label}>
            {item.type === "dropdown" ? (
              <>
                <ListItemButton
                  onClick={item.onToggle}
                  sx={{
                    borderRadius: 2,
                    mb: 0.5,
                  }}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.label} />
                  {item.open ? <ExpandLess /> : <ExpandMore />}
                </ListItemButton>
                <Collapse in={item.open} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {item.children.map((child) => (
                      <ListItemButton
                        key={child.path}
                        component={NavLink}
                        to={child.path}
                        sx={{
                          pl: 4,
                          borderRadius: 2,
                          mb: 0.5,
                          "&.active": {
                            backgroundColor: (theme) =>
                              theme.palette.action.selected,
                            color: (theme) => theme.palette.primary.main,
                          },
                        }}
                      >
                        <ListItemIcon>{child.icon}</ListItemIcon>
                        <ListItemText primary={child.label} />
                      </ListItemButton>
                    ))}
                  </List>
                </Collapse>
              </>
            ) : (
              <ListItemButton
                component={NavLink}
                to={item.path}
                sx={{
                  borderRadius: 2,
                  mb: 0.5,
                  "&.active": {
                    backgroundColor: (theme) => theme.palette.action.selected,
                    color: (theme) => theme.palette.primary.main,
                  },
                }}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            )}
          </React.Fragment>
        ))}
      </List>

      {drawerOpen && (
        <Box sx={{ mt: "auto" }}>
          <MonthlyStats />
        </Box>
      )}
    </Drawer>
  );
};

export default Sidepanel;
