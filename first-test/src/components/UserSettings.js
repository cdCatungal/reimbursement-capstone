import { useEffect, useState } from "react";
import { Box, Paper, Typography, useTheme, Card } from "@mui/material";
import { Mail, User } from "lucide-react";
import { userUserStore } from "../store/userUserStore.js";

const UserSettings = () => {
  const { getUser, user } = userUserStore();
  const theme = useTheme();

  useEffect(() => {
    getUser();
  }, []);

  return (
    // <Box
    //   sx={{
    //     bgcolor: "background.default",
    //     minHeight: "100vh",
    //     py: 4,
    //     marginTop: -10,
    //   }}
    // >
    //   <Box sx={{ maxWidth: "md", mx: "auto", p: 2, py: 4 }}>
    //     <Paper
    //       elevation={1}
    //       sx={{
    //         p: 4,
    //         borderRadius: 2,
    //         bgcolor: "background.paper",
    //       }}
    //     >
    //       <Box sx={{ textAlign: "center", mb: 4 }}>
    //         <Typography
    //           variant="h4"
    //           sx={{
    //             fontWeight: "bold",
    //             color: "text.primary",
    //             mb: 1,
    //           }}
    //         >
    //           Profile
    //         </Typography>
    //         <Typography variant="body1" sx={{ color: "text.secondary" }}>
    //           Your profile information
    //         </Typography>
    //       </Box>

    //       {/* Profile Information Section */}
    //       <Box sx={{ spaceY: 4 }}>
    //         <Box sx={{ mb: 3 }}>
    //           <Box
    //             sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}
    //           >
    //             <User sx={{ width: 20, height: 20, color: "text.secondary" }} />
    //             <Typography variant="body2" sx={{ color: "text.secondary" }}>
    //               Full Name
    //             </Typography>
    //           </Box>
    //           <Box
    //             sx={{
    //               px: 2,
    //               py: 1.5,
    //               bgcolor: "action.hover",
    //               borderRadius: 1,
    //               border: 1,
    //               borderColor: "divider",
    //             }}
    //           >
    //             <Typography sx={{ color: "text.primary" }}>
    //               {user?.name}
    //             </Typography>
    //           </Box>
    //         </Box>

    //         <Box sx={{ mb: 3 }}>
    //           <Box
    //             sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}
    //           >
    //             <Mail sx={{ width: 20, height: 20, color: "text.secondary" }} />
    //             <Typography variant="body2" sx={{ color: "text.secondary" }}>
    //               Email Address
    //             </Typography>
    //           </Box>
    //           <Box
    //             sx={{
    //               px: 2,
    //               py: 1.5,
    //               bgcolor: "action.hover",
    //               borderRadius: 1,
    //               border: 1,
    //               borderColor: "divider",
    //             }}
    //           >
    //             <Typography sx={{ color: "text.primary" }}>
    //               {user?.email}
    //             </Typography>
    //           </Box>
    //         </Box>
    //       </Box>

    //       {/* Account Information Section */}
    //       <Paper
    //         variant="outlined"
    //         sx={{
    //           mt: 4,
    //           p: 4,
    //           bgcolor: "background.default",
    //         }}
    //       >
    //         <Typography
    //           variant="h6"
    //           sx={{
    //             fontWeight: "medium",
    //             color: "text.primary",
    //             mb: 2,
    //           }}
    //         >
    //           Account Information
    //         </Typography>
    //         <Box sx={{ spaceY: 2 }}>
    //           <Box
    //             sx={{
    //               display: "flex",
    //               alignItems: "center",
    //               justifyContent: "space-between",
    //               py: 1.5,
    //               borderBottom: 1,
    //               borderColor: "divider",
    //             }}
    //           >
    //             <Typography sx={{ color: "text.secondary" }}>
    //               Member Since
    //             </Typography>
    //             <Typography
    //               sx={{ color: "text.primary", fontWeight: "medium" }}
    //             >
    //               {user?.createdAt?.split("T")[0]}
    //             </Typography>
    //           </Box>
    //           <Box
    //             sx={{
    //               display: "flex",
    //               alignItems: "center",
    //               justifyContent: "space-between",
    //               py: 1.5,
    //               borderBottom: 1,
    //               borderColor: "divider",
    //             }}
    //           >
    //             <Typography sx={{ color: "text.secondary" }}>
    //               Employee ID
    //             </Typography>
    //             <Typography
    //               sx={{ color: "success.main", fontWeight: "medium" }}
    //             >
    //               100-1000-00
    //             </Typography>
    //           </Box>
    //           <Box
    //             sx={{
    //               display: "flex",
    //               alignItems: "center",
    //               justifyContent: "space-between",
    //               py: 1.5,
    //             }}
    //           >
    //             <Typography sx={{ color: "text.secondary" }}>
    //               Account Status
    //             </Typography>
    //             <Typography
    //               sx={{ color: "success.main", fontWeight: "medium" }}
    //             >
    //               Active
    //             </Typography>
    //           </Box>
    //         </Box>
    //       </Paper>
    //     </Paper>
    //   </Box>
    // </Box>

    <Card>
      <Paper
        elevation={1}
        sx={{
          p: 4,
          borderRadius: 2,
          bgcolor: "background.paper",
        }}
      >
        <Box sx={{ textAlign: "center", mb: 4 }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: "bold",
              color: "text.primary",
              mb: 1,
            }}
          >
            Profile
          </Typography>
          <Typography variant="body1" sx={{ color: "text.secondary" }}>
            Your profile information
          </Typography>
        </Box>

        {/* Profile Information Section */}
        <Box sx={{ spaceY: 4 }}>
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <User sx={{ width: 20, height: 20, color: "text.secondary" }} />
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Full Name
              </Typography>
            </Box>
            <Box
              sx={{
                px: 2,
                py: 1.5,
                bgcolor: "action.hover",
                borderRadius: 1,
                border: 1,
                borderColor: "divider",
              }}
            >
              <Typography sx={{ color: "text.primary" }}>
                {user?.name}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <Mail sx={{ width: 20, height: 20, color: "text.secondary" }} />
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Email Address
              </Typography>
            </Box>
            <Box
              sx={{
                px: 2,
                py: 1.5,
                bgcolor: "action.hover",
                borderRadius: 1,
                border: 1,
                borderColor: "divider",
              }}
            >
              <Typography sx={{ color: "text.primary" }}>
                {user?.email}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Account Information Section */}
        <Paper
          variant="outlined"
          sx={{
            mt: 4,
            p: 4,
            bgcolor: "background.default",
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontWeight: "medium",
              color: "text.primary",
              mb: 2,
            }}
          >
            Account Information
          </Typography>
          <Box sx={{ spaceY: 2 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                py: 1.5,
                borderBottom: 1,
                borderColor: "divider",
              }}
            >
              <Typography sx={{ color: "text.secondary" }}>
                Member Since
              </Typography>
              <Typography sx={{ color: "text.primary", fontWeight: "medium" }}>
                {user?.createdAt?.split("T")[0]}
              </Typography>
            </Box>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                py: 1.5,
                borderBottom: 1,
                borderColor: "divider",
              }}
            >
              <Typography sx={{ color: "text.secondary" }}>
                Employee ID
              </Typography>
              <Typography sx={{ color: "success.main", fontWeight: "medium" }}>
                100-1000-00
              </Typography>
            </Box>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                py: 1.5,
              }}
            >
              <Typography sx={{ color: "text.secondary" }}>
                Account Status
              </Typography>
              <Typography sx={{ color: "success.main", fontWeight: "medium" }}>
                Active
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Paper>
    </Card>
  );
};

export default UserSettings;
