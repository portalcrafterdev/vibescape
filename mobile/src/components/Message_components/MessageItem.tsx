import React from "react";
import {View,Text,Image,TouchableOpacity, StyleSheet,} from "react-native";

import { ConversationRow } from "../../../api/authApi";

interface itemprops {
  item: ConversationRow;
  onPress?: () => void;
}

const MessageItem = ({ item, onPress }: itemprops) => {
  const unread = !!item.unread_count && item.unread_count > 0;

  // Just the clock time, which is all the row has room for.
  const time = item.last_message_at
    ? new Date(item.last_message_at).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={0.8}
      onPress={onPress}
    >

      <View style={styles.avatarContainer}>
        <Image
          source={
            item.other.avatar_url
              ? { uri: item.other.avatar_url }
              : require("../../assets/images/Portelcrafterlogo.png")
          }
          style={styles.avatar}
        />

        {item.online && <View style={styles.onlineDot} />}
      </View>

      <View style={styles.content}>

        <Text
          numberOfLines={1}
          style={styles.username}
        >
          {item.other.username}
        </Text>

        <View style={styles.bottomRow}>
          <Text
            numberOfLines={1}
            style={[styles.message, unread && styles.unreadMessage]}
          >
            {item.last_message || "Say hello"}
          </Text>

          {!!time && (
            <Text style={styles.time}>
              • {time}
            </Text>
          )}
        </View>

      </View>

      {unread && (
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