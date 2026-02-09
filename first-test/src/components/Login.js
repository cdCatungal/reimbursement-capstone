//reimbursement-capstone/first-test/src/components/Login.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Typography,
  Button,
  Paper,
  Box,
  CircularProgress,
  useTheme,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  Grid,
  Card,
  CardContent,
  Divider,
  Link,
  useMediaQuery,
} from "@mui/material";
import {
  Login as MicrosoftIcon,
  CheckCircleOutline,
  HelpOutline,
  Close,
} from "@mui/icons-material";
import { useAppContext } from "../App";
import { axiosInstance, axiosInstanceWithAuth } from "../lib/axios.js";
import { baseURL } from "../lib/baseUrl.js";

function Login() {
  const {
    setIsAdmin,
    setIsAuthenticated,
    setUser,
    showNotification,
    setIsSalesDirector,
  } = useAppContext();
  const [checking, setChecking] = useState(true);
  const [aboutModalOpen, setAboutModalOpen] = useState(false);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await axiosInstanceWithAuth.get("/auth/me");
        const data = response.data;
        if (data.user) {
          console.log("✅ User data received:", data.user);

          setUser({
            uid: data.user.id,
            username: data.user.name,
            email: data.user.email,
            role: data.user.role,
            authProvider: data.user.authProvider,
          });
          setIsAuthenticated(true);
          setIsAdmin(
            [
              "Admin",
              "SUL",
              "Account Manager",
              "Invoice Specialist",
              "Finance Officer",
              "Sales Director",
            ].includes(data.user.role)
          );

          setIsSalesDirector(["Sales Director"].includes(data.user.role));
          console.log("User role:", data.user.role);

          // Navigate based on role
          switch (data.user.role) {
            case "Admin":
            case "SUL":
            case "Account Manager":
            case "Invoice Specialist":
            case "Finance Officer":
              navigate("/admin");
              break;
            case "Employee":
              navigate("/user");
              break;
            case "Sales Director":
              navigate("/sales-director");
              break;
            default:
              console.warn("Unknown role:", data.user.role);
              navigate("/user");
              break;
          }

          const firstName = data.user.name.split(" ")[0];
          showNotification(`Welcome back, ${firstName}!`, "success");
        } else {
          setChecking(false);
        }
      } catch (error) {
        console.log("Not authenticated, showing login form");
        setChecking(false);
      }
    };

    checkAuth();
  }, [
    navigate,
    setIsAdmin,
    setIsAuthenticated,
    setUser,
    showNotification,
    setIsSalesDirector,
  ]);

  const handleMicrosoftLogin = () => {
    window.location.href = `${baseURL}/auth/microsoft`;
  };

  const handleAboutModalOpen = () => {
    setAboutModalOpen(true);
  };

  const handleAboutModalClose = () => {
    setAboutModalOpen(false);
  };

  const teamMembers = [
    {
      name: "Carl Daniel Catungal",
      role: "Developer",
      erni_link: "https://erni-connect-now.erninet.ch/home/profile/3443",
      profile_pic: "/carl-daniel-catungal.png",
    },
    {
      name: "Hasanor Dimasimpan",
      role: "Developer",
      erni_link: "https://erni-connect-now.erninet.ch/home/profile/3461",
      profile_pic: "/hasanor-dimasimpan.png",
    },
    {
      name: "Cathlene Ilagan",
      role: "Developer",
      erni_link: "https://erni-connect-now.erninet.ch/home/profile/3449",
      profile_pic: "/cathlene-ilagan.jpg",
    },
    {
      name: "Yolando Son III",
      role: "Business Analyst",
      erni_link: "https://erni-connect-now.erninet.ch/home/profile/3450",
      profile_pic: "/yolando-son-iii.png",
    },
  ];

  if (checking) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background:
          theme.palette.mode === "dark"
            ? "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)"
            : "linear-gradient(135deg, #ffffff 0%, #f0f4f8 100%)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Container 
        maxWidth="xs" 
        sx={{ 
          flex: 1, 
          display: "flex", 
          alignItems: "center",
          justifyContent: "center",
          py: { xs: 2, sm: 4 }
        }}
      >
        <Paper
          sx={{
            p: { xs: 3, sm: 5 },
            borderRadius: 3,
            boxShadow: "0 10px 40px rgba(0, 0, 0, 0.08)",
            border:
              theme.palette.mode === "dark"
                ? "1px solid rgba(255, 255, 255, 0.1)"
                : "1px solid rgba(0, 0, 0, 0.05)",
            width: "100%",
          }}
        >
          {/* Header */}
          <Box sx={{ mb: 3, textAlign: "center" }}>
            <Box sx={{ mb: 3, display: "flex", justifyContent: "center" }}>
              <img
                src={
                  theme.palette.mode === "dark"
                    ? "/erni-logo-darkmode.png"
                    : "/erni-logo.png"
                }
                alt="Logo"
                style={{ height: isMobile ? "50px" : "60px" }}
                onError={(e) => (e.target.style.display = "none")}
              />
            </Box>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                color: theme.palette.mode === "dark" ? "#ffffff" : "#4f5455",
                mb: 0,
                lineHeight: 1.2,
                fontSize: { xs: "1.25rem", sm: "1.5rem" },
              }}
            >
              Reimbursement Tool
            </Typography>
          </Box>

          {/* Features */}
          <Box
            sx={{
              mb: 4,
              display: "flex",
              flexDirection: "column",
              gap: 2,
              pl: 2,
            }}
          >
            <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
              <CheckCircleOutline
                sx={{ color: "#0078D4", fontSize: 20, mt: 0.3, flexShrink: 0 }}
              />
              <Typography
                variant="body2"
                sx={{
                  color: theme.palette.mode === "dark" ? "#ccc" : "#555",
                  fontSize: { xs: "0.85rem", sm: "0.9rem" },
                }}
              >
                Quick submission and tracking
              </Typography>
            </Box>
            <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
              <CheckCircleOutline
                sx={{ color: "#0078D4", fontSize: 20, mt: 0.3, flexShrink: 0 }}
              />
              <Typography
                variant="body2"
                sx={{
                  color: theme.palette.mode === "dark" ? "#ccc" : "#555",
                  fontSize: { xs: "0.85rem", sm: "0.9rem" },
                }}
              >
                Secure document uploads
              </Typography>
            </Box>
            <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
              <CheckCircleOutline
                sx={{ color: "#0078D4", fontSize: 20, mt: 0.3, flexShrink: 0 }}
              />
              <Typography
                variant="body2"
                sx={{
                  color: theme.palette.mode === "dark" ? "#ccc" : "#555",
                  fontSize: { xs: "0.85rem", sm: "0.9rem" },
                }}
              >
                Real-time approval updates
              </Typography>
            </Box>
          </Box>

          {/* Divider */}
          <Box
            sx={{
              borderTop:
                theme.palette.mode === "dark"
                  ? "1px solid rgba(255, 255, 255, 0.1)"
                  : "1px solid #e0e0e0",
              mb: 4,
            }}
          />

          {/* Login Button */}
          <Button
            fullWidth
            variant="contained"
            size="large"
            startIcon={<MicrosoftIcon />}
            onClick={handleMicrosoftLogin}
            sx={{
              py: 1.6,
              textTransform: "none",
              fontWeight: 600,
              fontSize: { xs: "0.9rem", sm: "0.95rem" },
              backgroundColor: "#0078D4",
              color: "white",
              borderRadius: 1.5,
              transition: "all 0.2s ease",
              "&:hover": {
                backgroundColor: "#106EBE",
                boxShadow: "0 6px 20px rgba(0, 120, 212, 0.3)",
                transform: "translateY(-2px)",
                color: "white",
              },
              "&:disabled": {
                backgroundColor: "#a0c4f4",
                color: "white",
              },
            }}
          >
            Sign in with Microsoft
          </Button>

          {/* Footer */}
          <Typography
            variant="caption"
            sx={{
              display: "block",
              textAlign: "center",
              color: theme.palette.mode === "dark" ? "#999" : "#999",
              fontSize: "0.8rem",
              mt: 3,
            }}
          >
            Use your corporate Microsoft account
          </Typography>
        </Paper>
      </Container>

      {/* Footer Section */}
      <Box
        sx={{
          width: "100%",
          py: 1,
          px: 3,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          position: "relative",
          borderTop:
            theme.palette.mode === "dark"
              ? "1px solid rgba(255, 255, 255, 0.1)"
              : "1px solid rgba(0, 0, 0, 0.1)",
        }}
      >
        <Box sx={{ textAlign: "center" }}>
          <Typography
            variant="caption"
            sx={{
              display: "block",
              color: theme.palette.mode === "dark" ? "#999" : "#666",
              fontSize: { xs: "0.7rem", sm: "0.75rem" },
              lineHeight: 1.5,
            }}
          >
            © 2026 ERNI Philippines Inc. All rights reserved.
          </Typography>
          <Typography
            variant="caption"
            sx={{
              display: "block",
              color: theme.palette.mode === "dark" ? "#999" : "#666",
              fontSize: { xs: "0.7rem", sm: "0.75rem" },
              lineHeight: 1.5,
            }}
          >
            Developed by ERNI Philippines Bootcamp Trainees - Team PNT
          </Typography>
        </Box>
        <Tooltip title="About us" arrow>
          <IconButton
            onClick={handleAboutModalOpen}
            size="small"
            sx={{
              position: "absolute",
              right: { xs: 8, sm: 16 },
              color: theme.palette.mode === "dark" ? "#999" : "#666",
              "&:hover": {
                color: theme.palette.mode === "dark" ? "#fff" : "#000",
              },
            }}
          >
            <HelpOutline fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* About Us Modal */}
      <Dialog
        open={aboutModalOpen}
        onClose={handleAboutModalClose}
        maxWidth="lg"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            borderRadius: isMobile ? 0 : 2,
            background:
              theme.palette.mode === "dark"
                ? "#2d2d2d"
                : "#fff",
            m: isMobile ? 0 : 2,
          },
        }}
      >
        <DialogTitle sx={{ pb: 1, px: { xs: 2, sm: 3 }, pt: { xs: 2, sm: 3 } }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="h5" sx={{ fontWeight: 700, fontSize: { xs: "1.25rem", sm: "1.5rem" } }}>
              About ERNIt Back
            </Typography>
            <IconButton
              onClick={handleAboutModalClose}
              size={isMobile ? "small" : "medium"}
              sx={{
                color: theme.palette.mode === "dark" ? "#999" : "#666",
              }}
            >
              <Close fontSize={isMobile ? "small" : "medium"} />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ px: { xs: 2, sm: 3 } }}>
          {/* Project Description */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, fontSize: { xs: "1rem", sm: "1.25rem" } }}>
              Project Overview
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, color: theme.palette.mode === "dark" ? "#ccc" : "#555", fontSize: { xs: "0.85rem", sm: "0.875rem" } }}>
              ERNIt Back is an OCR-powered reimbursement automation and approval monitoring system designed for ERNI Philippines. 
              This comprehensive platform simplifies expense claim submission, approval workflows, and financial notification processing 
              with intelligent receipt processing, multi-level approval workflows, and real-time status tracking.
            </Typography>
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Team Members */}
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, fontSize: { xs: "1rem", sm: "1.25rem" } }}>
              Development Team
            </Typography>
            <Grid container spacing={{ xs: 2, sm: 2, md: 3 }}>
              {teamMembers.map((member, index) => (
                <Grid item xs={12} sm={6} md={3} key={index}>
                  <Card
                    sx={{
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      border:
                        theme.palette.mode === "dark"
                          ? "1px solid rgba(255, 255, 255, 0.1)"
                          : "1px solid rgba(0, 0, 0, 0.1)",
                      boxShadow: "none",
                      "&:hover": {
                        boxShadow: theme.palette.mode === "dark" 
                          ? "0 4px 12px rgba(255, 255, 255, 0.1)"
                          : "0 4px 12px rgba(0, 0, 0, 0.1)",
                      },
                    }}
                  >
                    <CardContent sx={{ textAlign: "center", flex: 1, p: { xs: 2, sm: 2.5 } }}>
                      <Avatar
                        src={member.profile_pic}
                        alt={member.name}
                        sx={{
                          width: { xs: 60, sm: 70, md: 80 },
                          height: { xs: 60, sm: 70, md: 80 },
                          mx: "auto",
                          mb: 2,
                          border: "3px solid #0078D4",
                        }}
                      />
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5, fontSize: { xs: "0.9rem", sm: "0.95rem" } }}>
                        {member.name}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          color: "#0078D4",
                          mb: 2,
                          fontSize: { xs: "0.75rem", sm: "0.8rem" },
                        }}
                      >
                        {member.role}
                      </Typography>
                      <Link
                        href={member.erni_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                          fontSize: { xs: "0.75rem", sm: "0.8rem" },
                          textDecoration: "none",
                          color: theme.palette.mode === "dark" ? "#64b5f6" : "#0078D4",
                          "&:hover": {
                            textDecoration: "underline",
                          },
                        }}
                      >
                        View ERNI Connect Profile
                      </Link>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: { xs: 2, sm: 3 }, py: 2 }}>
          <Button onClick={handleAboutModalClose} variant="contained" sx={{ textTransform: "none", fontSize: { xs: "0.85rem", sm: "0.9rem" } }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Login;