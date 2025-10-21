export const userSettings = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    // Remove sensitive data
    const userWithoutPassword = { ...user.toJSON() };
    delete userWithoutPassword.password;
    delete userWithoutPassword.id;

    res.status(200).json({
      data: userWithoutPassword,
    });
  } catch (error) {
    console.error("Error in user settings:", error);
    return res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};
