import React from "react";
import { TouchableOpacity, View, FlatList, StyleSheet, Text , Image} from "react-native";

import { highlights, Highlight } from "../../data/StoryHighlight";
import Plus from "lucide-react-native/icons/plus";

const StoryHighlight = () => {
  const renderItem = ({ item }: { item: Highlight }) => (
    <View style={styles.item}>
      {item.isNew ? (
        <TouchableOpacity style={styles.newHighlight}>
          <Plus
            color="#fff"
            size={30}
            strokeWidth={2}
          />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.highlightBorder}>
          <Image