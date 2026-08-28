import React from "react";
import {
  FlatList,
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
} from "react-native";

import MessageItem from "./MessageItem";
import { ConversationRow } from "../../../api/authApi";

interface listprops {
  rows: ConversationRow[];
  loading?: boolean;
  onOpen: (row: ConversationRow) => void;
}

const MessageList = ({ rows, loading, onOpen }: listprops) => {
  if (loading) {
    return <ActivityIndicator style={styles.loader} color="#fff" />;
  }

  if (rows.length === 0) {
    return <Text style={styles.empty}>No messages yet.</Text>;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        // The screen already scrolls, so this list must not.
        scrollEnabled={false}
        renderItem={({ item }) => (
          <MessageItem item={item} onPress={() => onOpen(item)} />
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      />
    </View>
  );
};

export default MessageList;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },

  content: {
    paddingBottom: 100,
  },

  loader: {
    marginTop: 40,
  },

  empty: {
    color: "#8e8e93",
    fontSize: 15,
    textAlign: "center",
    marginTop: 40,
  },
});
