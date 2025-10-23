import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";

export const useAdminStore = create((set, get) => ({
  reportData: null,

  getReport: async (data) => {
    try {
      if (!data) return;
      const response = await axiosInstance.post("/admin/reports", data);
      console.log("Response reports:", response.data.reports);
      set({ reportData: response.data.reports });
    } catch (error) {
      console.error("Failed to fetch user data:", error);
    }
  },
  resetReportData: () => {
    set({ reportData: null });
  },
}));
