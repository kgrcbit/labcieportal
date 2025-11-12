import axios from "axios";

// Set baseURL based on your specific requirements
const API_URL = "https://labcieportal.onrender.com/api";  // Use this if you want to always point to the online API
// const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api"; // fallback to local URL

const API = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json"
  }
});

// Attach token to request headers
API.interceptors.request.use(config => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default API;
