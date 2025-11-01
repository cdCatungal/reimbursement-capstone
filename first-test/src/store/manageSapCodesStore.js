import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import { toast } from "react-hot-toast";

export const useManageSapCodesStore = create((set, get) => ({
  sapCodes: [],
  loading: false,
  error: null,

  // Fetch all SAP codes
  fetchSapCodes: async () => {
    set({ loading: true, error: null });
    try {
      const response = await axiosInstance.get("/sap-codes");
      set({ sapCodes: response.data.data, loading: false });
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to fetch SAP codes";
      set({ error: errorMessage, loading: false });
      toast.error(errorMessage);
      console.error("Failed to fetch SAP codes:", error);
    }
  },

  // Fetch only active SAP codes
fetchActiveSapCodes: async () => {
  set({ loading: true, error: null });
  try {
    const response = await axiosInstance.get("/sap-codes/active");

    set({ sapCodes: response.data.data, loading: false });
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || "Failed to fetch active SAP codes";

    set({ error: errorMessage, loading: false });
    toast.error(errorMessage);
    console.error("Failed to fetch active SAP codes:", error);
  }
},


  // Create SAP code
  createSapCode: async (sapCodeData) => {
    set({ loading: true, error: null });
    try {
      const response = await axiosInstance.post("/sap-codes", sapCodeData);
      
      // Add the new SAP code to the local state
      set((state) => ({
        sapCodes: [response.data.data, ...state.sapCodes],
        loading: false,
      }));
      
      toast.success("SAP code created successfully");
      return { success: true, data: response.data.data };
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to create SAP code";
      set({ error: errorMessage, loading: false });
      toast.error(errorMessage);
      console.error("Failed to create SAP code:", error);
      return { success: false, error: errorMessage };
    }
  },

  // Update SAP code
  updateSapCode: async (sapCodeId, sapCodeData) => {
    set({ loading: true, error: null });
    try {
      const response = await axiosInstance.put(`/sap-codes/${sapCodeId}`, sapCodeData);
      
      // Update the SAP code in the local state
      set((state) => ({
        sapCodes: state.sapCodes.map((code) =>
          code.id === sapCodeId ? response.data.data : code
        ),
        loading: false,
      }));
      
      toast.success("SAP code updated successfully");
      return { success: true, data: response.data.data };
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to update SAP code";
      set({ error: errorMessage, loading: false });
      toast.error(errorMessage);
      console.error("Failed to update SAP code:", error);
      return { success: false, error: errorMessage };
    }
  },

  // Delete SAP code
  deleteSapCode: async (sapCodeId) => {
    set({ loading: true, error: null });
    try {
      await axiosInstance.delete(`/sap-codes/${sapCodeId}`);
      
      // Remove the SAP code from local state
      set((state) => ({
        sapCodes: state.sapCodes.filter((code) => code.id !== sapCodeId),
        loading: false,
      }));
      
      toast.success("SAP code deleted successfully");
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to delete SAP code";
      set({ error: errorMessage, loading: false });
      toast.error(errorMessage);
      console.error("Failed to delete SAP code:", error);
      return { success: false, error: errorMessage };
    }
  },
}));