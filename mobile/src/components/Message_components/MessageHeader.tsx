import { ChevronDown, SquarePen } from "lucide-react-native";
import React from "react";
import {View,Text,StyleSheet, TouchableOpacity,} from "react-native";

interface headerprops {
  username?: string;
  onCompose?: () => void;
}

const MessageHeader = ({ username, onCompose }: headerprops) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.usernameContainer}>
        <Text style={styles.username}>
          {username ?? ''}
        </Text>

        <ChevronDown
          size={20}
          color="#fff"
          strokeWidth={2.5}
        />
      </TouchableOpacity>

      <TouchableOpacity style={styles.composeButton} onPress={onCompose}>
        <SquarePen
          size={28}
          color="#fff"
          strokeWidth={2}
        />
      </TouchableOpacity>

    </View>
  );
};

export default MessageHeader;

const styles = StyleSheet.create({
  container: {
    height: 56,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },

  usernameContainer: {
    flexDirection: "row",
    alignItems: "center",
  },

  username: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    marginRight: 4,
  },

  composeButton: {
    position: "absolute",
    right: 18,
  },
});