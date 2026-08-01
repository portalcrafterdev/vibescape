import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
} from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../src/constants";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ==========================
// Add Access Token
// ==========================

api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await AsyncStorage.getItem("accessToken");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  }
);

api.interceptors.response.use(
  (response) => response,

  async (error: AxiosError) => {
    const originalRequest: any = error.config;

    // Access Token Expired
    if (
      error.response?.status === 401 &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        // Get Refresh Token
        const refreshToken =
          await AsyncStorage.getItem("refreshToken");

        // Get New Access Token
        const response = await axios.post(
          `${BASE_URL}/auth/refresh`,
          {
            refresh_token: refreshToken,
          }
        );

        // Save New Tokens
        await AsyncStorage.setItem(
          "accessToken",
          response.data.access_token
        );

        await AsyncStorage.setItem(
          "refreshToken",
          response.data.refresh_token
        );

        // Update Header
        originalRequest.headers.Authorization =
          `Bearer ${response.data.access_token}`;

        // Retry Failed Request
        return api(originalRequest);

      } catch (error) {

        // Session Expired
        await AsyncStorage.clear();

        console.log("Session Expired");

        return Promise.reject(error);
      }
    }

    // Error Handling

    switch (error.response?.status) {

      case 400:
        console.log("Bad Request");
        break;

      case 401:
        console.log("Unauthorized");
        break;

      case 403:
        console.log("Forbidden");
        break;

      case 404:
        console.log("API Not Found");
        break;

      case 500:
        console.log("Internal Server Error");
        break;

      default:

        if (error.code === "ECONNABORTED") {
          console.log("Request Timeout");
        } else if (!error.response) {
          console.log("No Internet Connection");
        } else {
          console.log("Something Went Wrong");
        }
    }

    return Promise.reject(error);
  }
);

export default api;