import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import { toast } from "react-hot-toast";

export const useManageUsersStore = create((set, get) => ({
  users: [],
  loading: false,
  error: null,

  // Fetch all users
  fetchUsers: async () => {
    set({ loading: true, error: null });
    try {
      const response = await axiosInstance.get("/users");
      set({ users: response.data.data, loading: false });
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to fetch users";
      set({ error: errorMessage, loading: false });
      toast.error(errorMessage);
      console.error("Failed to fetch users:", error);
    }
  },

  // Update user
  updateUser: async (userId, userData) => {
    set({ loading: true, error: null });
    try {
      const response = await axiosInstance.put(`/users/${userId}`, userData);
      
      // Update the user in the local state
      set((state) => ({
        users: state.users.map((user) =>
          user.id === userId ? response.data.data : user
        ),
        loading: false,
      }));
      
      toast.success("User updated successfully");
      return { success: true, data: response.data.data };
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to update user";
      set({ error: errorMessage, loading: false });
      toast.error(errorMessage);
      console.error("Failed to update user:", error);
      return { success: false, error: errorMessage };
    }
  },

  // Delete user
  deleteUser: async (userId) => {
    set({ loading: true, error: null });
    try {
      await axiosInstance.delete(`/users/${userId}`);
      
      // Remove the user from local state
      set((state) => ({
        users: state.users.filter((user) => user.id !== userId),
        loading: false,
      }));
      
      toast.success("User deleted successfully");
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to delete user";
      set({ error: errorMessage, loading: false });
      toast.error(errorMessage);
      console.error("Failed to delete user:", error);
      return { success: false, error: errorMessage };
    }
  },
}));