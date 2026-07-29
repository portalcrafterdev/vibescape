import React from "react";
import {View,Text,Image,TouchableOpacity, StyleSheet,} from "react-native";

const MessageItem = ({ item }: any) => {
  return (
    <TouchableOpacity style={styles.container} activeOpacity={0.8}>

      <View style={styles.avatarContainer}>
        <Image
          source={{ uri: item.image }}
          style={styles.avatar}
        />

        {item.online && <View style={styles.onlineDot} />}
      </View>

      <View style={styles.content}>

        <Text
          numberOfLines={1}
          style={styles.username}
        >
          {item.username}
        </Text>

        <View style={styles.bottomRow}>
          <Text
            numberOfLines={1}
            style={[styles.message,
            item.unread && styles.unreadMessage]}
          >
            {item.message}
          </Text>

          <Text style={styles.time}>
            • {item.time}
          </Text>
        </View>

      </View>

      {item.unread && (
        <View style={styles.unreadDot} />
      )}

    </TouchableOpacity>
  );
};

export default MessageItem;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#000",
  },

  avatarContainer: {
    position: "relative",
  },

  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },

  onlineDot: {
    position: "absolute",
    right: 2,
    bottom: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#32D74B",
    borderWidth: 2,
    borderColor: "#000",
  },

  content: {
    flex: 1,
    marginLeft: 14,
  },

  username: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },

  message: {
    color: "#8e8e93",
    fontSize: 14,
  },

  time: {
    color: "#8e8e93",
    fontSize: 14,
    marginLeft: 4,
  },

  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#0095F6",
  },

  unreadMessage: {
  color: "#fff",
  fontWeight: "600",
},
});