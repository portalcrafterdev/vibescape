import { useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { logoutUser } from "../../api/authApi";

export const useLogout = () => {
  const navigation = useNavigation<any>();

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

      navigation.replace("Login");
    }
  }, [navigation]);
};

export default useLogout;
