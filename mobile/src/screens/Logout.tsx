import { useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { logoutUser } from "../../api/authApi";
import { useProfile } from "../context/ProfileContext";

export const useLogout = () => {
  const navigation = useNavigation<any>();
  const { setUser } = useProfile();

  return useCallback(async () => {
    try {
      const refreshToken = await AsyncStorage.getItem("refreshToken");

      if (refreshToken) {
        await logoutUser({ refresh_token: refreshToken });
      }
    } catch (error) {
      console.log("Logout Error:", error);
    } finally {       
      await AsyncStorage.removeItem("accessToken");
      await AsyncStorage.removeItem("refreshToken");

      // Otherwise the next account to sign in briefly sees this profile.
      setUser(null);

      navigation.replace("Login");
    }
  }, [navigation, setUser]);
};

export default useLogout;
