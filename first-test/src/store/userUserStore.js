import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";

export const userUserStore = create((set, get) => ({
  isUser: false,
  user: null,

  getUser: async () => {
    try {
      const response = await axiosInstance.get("/users/settings");
      console.log("Response:", response.data.data);
      set({ user: response.data.data });
      console.log("User data fetched:", get().user);
    } catch (error) {
      console.error("Failed to fetch user data:", error);
    }
  },
}));
