import React from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
} from "react-native";

import { ArrowLeft } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";

const EditProfileHeader = () => {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <ArrowLeft
          size={26}
          color="#fff"
          strokeWidth={2.2}
        />
      </TouchableOpacity>

      <Text style={styles.title}>
        Edit profile
      </Text>

      <View style={styles.placeholder} />
    </View>
  );
};

export default EditProfileHeader;

const styles = StyleSheet.create({
  container: {
    height: 56,
    backgroundColor: "#000",
    flexDirection: "row",