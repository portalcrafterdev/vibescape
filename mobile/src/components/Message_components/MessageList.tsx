import React from "react";
import {
  FlatList,
  StyleSheet,
  View,
} from "react-native";

import MessageItem from "./MessageItem";
import { MessageData } from "../../data/MessageData";

const MessageList = () => {
  return (
    <View style={styles.container}>
      <FlatList
        data={MessageData}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MessageItem item={item} />
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
});