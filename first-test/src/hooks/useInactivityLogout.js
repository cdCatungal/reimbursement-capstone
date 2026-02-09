// hooks/useInactivityLogout.js
import { useEffect, useRef, useCallback } from "react";

const useInactivityLogout = (isAuthenticated) => {
  const timeoutSeconds = 60 * 60; // 60 minutes
  const timerRef = useRef(null);
  const apiCallRef = useRef(null);
  const countdownRef = useRef(timeoutSeconds);
  const logoutInProgressRef = useRef(false);

  // Function to handle auto-logout (call API then redirect)
  const performAutoLogout = useCallback(async () => {
    // Prevent multiple logout calls
    if (logoutInProgressRef.current) return;

    logoutInProgressRef.current = true;
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/timer`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(); // Simple throw if not ok
      }

      console.log("✅ API call successful - Cookie should be deleted");
    } catch (error) {
      console.error("Error calling /auth/timer:", error);
    } finally {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      window.location.href = "/login";
    }
  }, []);

  // Function to reset the timer
  const resetTimer = useCallback(() => {
    if (!isAuthenticated || logoutInProgressRef.current) return;

    // Clear existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Reset countdown
    countdownRef.current = timeoutSeconds;

    // Set new timer
    timerRef.current = setTimeout(() => {
      console.log("Timer called the Auto logout function");
      performAutoLogout();
    }, timeoutSeconds * 1000);

    // Log the new logout time
    // const logoutTime = new Date(Date.now() + timeoutSeconds * 1000);
    // console.log(
    //   ` Timer reset - Will auto-logout at: ${logoutTime.toLocaleTimeString()}`
    // );
  }, [timeoutSeconds, isAuthenticated, performAutoLogout]);

  // Main effect
  useEffect(() => {
    // Clean up if not authenticated
    if (!isAuthenticated) {
      console.log("⏸️ User not authenticated - cleaning up timers");
      if (timerRef.current) clearTimeout(timerRef.current);
      if (apiCallRef.current) clearTimeout(apiCallRef.current);
      logoutInProgressRef.current = false;
      return;
    }

    console.log(`🎯 AUTO-LOGOUT ENABLED (${timeoutSeconds} seconds)`);
    console.log(`📞 Will call /auth/timer endpoint when timer ends`);
    console.log(`👉 Don't interact for ${timeoutSeconds} seconds to test`);

    // Start the timer
    resetTimer();

    // User activity events
    const activityEvents = [
      "mousedown",
      "mousemove",
      "click",
      "keydown",
      "keypress",
      "keyup",
      "touchstart",
      "touchend",
      "scroll",
      "wheel",
      "input",
      "change",
      "focus",
    ];

    const handleActivity = () => {
      resetTimer();
    };

    // Add event listeners
    activityEvents.forEach((event) => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Tab visibility
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        console.log("👁️ Tab visible - resetting timer");
        resetTimer();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Cleanup
    return () => {
      console.log("🧹 Cleaning up auto-logout hook");

      if (timerRef.current) clearTimeout(timerRef.current);
      if (apiCallRef.current) clearTimeout(apiCallRef.current);

      activityEvents.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });

      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [timeoutSeconds, isAuthenticated, resetTimer]);

  return {};
};

export default useInactivityLogout;
