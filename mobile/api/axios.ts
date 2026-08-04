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

    // Signing in answers 401 by itself when the password is wrong, so those
    // calls must not be treated as an expired session. Refreshing after a
    // failed login would send an empty token and hide the real message.
    const isAuthCall = String(originalRequest?.url ?? "").startsWith("/auth/");

    // Access Token Expired
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isAuthCall
    ) {
      originalRequest._retry = true;

      // Get Refresh Token
      const savedRefreshToken =
        await AsyncStorage.getItem("refreshToken");

      // Nothing to refresh with, so the session is simply over.
      if (!savedRefreshToken) {
        await AsyncStorage.removeItem("accessToken");

        console.log("Session Expired");

        return Promise.reject(error);
      }

      try {
        // Get New Access Token
        const response = await axios.post(
          `${BASE_URL}/auth/refresh`,
          {
            refresh_token: savedRefreshToken,
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

        // Session Expired. Only the tokens go, so anything else the app saved
        // is left alone.
        await AsyncStorage.removeItem("accessToken");
        await AsyncStorage.removeItem("refreshToken");

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