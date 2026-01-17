// ** import lib
import axios from "axios";

const axiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:8080",
    timeout: 30000,
    headers: {
        "Content-Type": "application/json",
    },
    withCredentials: true, // Important for sending cookies with requests
});

// Request interceptor for adding auth tokens
axiosInstance.interceptors.request.use(
    (config) => {
        // Auth cookies are sent automatically with withCredentials: true
        return config;
    },
    (error) => {
        return Promise.reject(error);
    },
);

// Response interceptor for handling errors
axiosInstance.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        // Handle common error scenarios
        if (error.response?.status === 401) {
            // Unauthorized - could redirect to login
            console.error("Unauthorized request");
        } else if (error.response?.status === 403) {
            // Forbidden
            console.error("Forbidden request");
        } else if (error.response?.status >= 500) {
            // Server error
            console.error("Server error");
        }

        return Promise.reject(error);
    },
);

export default axiosInstance;
