import express from "express";
import passport from "passport";

const router = express.Router();

router.get("/", (req, res) => {
  const cookieValue = req.cookies?.["connect.sid"];

  if (cookieValue) {
    console.log(`Cookie found: ${cookieValue.substring(0, 30)}...`);
    res.clearCookie("connect.sid", { path: "/" });
    // const expirationDate = new Date(Date.now() + 0); // Expires now

    // res.cookie("connect.sid", cookieValue, {
    //   expires: expirationDate, // Will auto-expire immediately
    //   path: "/",
    //   httpOnly: true,
    //   secure: process.env.NODE_ENV === "production",
    // });

    console.log("Cookie cleared");
    return res
      .status(200)
      .json({ success: true, message: "Cookie cleared successfully" });
  } else {
    console.log("No cookie found");
    return res.status(400).json({
      success: false,
      message: "No session cookie found",
    });
  }
});

export default router;
