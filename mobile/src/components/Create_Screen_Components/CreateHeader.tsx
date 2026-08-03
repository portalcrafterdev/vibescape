import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { X } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";

const CreateHeader = () => {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <X
          size={28}
          color="white"
          strokeWidth={2}
        />
      </TouchableOpacity>

      <Text style={styles.title}>
        New post
      </Text>

      <TouchableOpacity>
        <Text style={styles.next}>
          Next
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default CreateHeader;

const styles = StyleSheet.create({
  container: {
    height: 55,
    backgroundColor: "#000",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },

  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "600",
  },

  next: {
    color: "#4A7CFF",
    fontSize: 18,
    fontWeight: "600",
  },
});