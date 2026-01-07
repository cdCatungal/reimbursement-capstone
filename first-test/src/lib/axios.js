import axios from "axios";

export const axiosInstance = axios.create({
  baseURL:
    process.env.NODE_ENV === "development"
      ? "http://localhost:5000/api"
      : `${process.env.REACT_APP_API_URL}/api`,
  withCredentials: true,
});

export const axiosInstanceWithAuth = axios.create({
  baseURL:
    process.env.NODE_ENV === "development"
      ? "http://localhost:5000"
      : `${process.env.REACT_APP_API_URL}`,
  withCredentials: true,
});

// export const axiosInstance = axios.create({
//   baseURL: "http://localhost:5000/api",
//   withCredentials: true,
// });
