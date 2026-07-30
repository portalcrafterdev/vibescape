import React from "react";
import {View, Text, TouchableOpacity, StyleSheet, Image} from "react-native";

import { ChevronRight } from "lucide-react-native";

const ThreadsInstalogo = () => {
  return (
    <TouchableOpacity style={styles.container} activeOpacity={0.8}>
      <View style={styles.logoContainer}>
        <Image source={require('../../assets/images/clipart402911.png')} style={styles.logo}/>
          </View>

      <View style={styles.content}>
        <Text style={styles.title}>
          Install and join with Instagram
        </Text>

        <Text style={styles.username}>
          portel_crafter
        </Text>
      </View>

      <ChevronRight
        size={24}
        color="#8e8e93"
      />
    </TouchableOpacity>
  );
};

export default ThreadsInstalogo;

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 45,
    height: 88,
    borderRadius: 18,
    backgroundColor: "#292c33",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
  },

  logoContainer: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },

   logo: {
  width: 45,
  height: 45,
  resizeMode: "contain",
},

  content: {
    flex: 1,
  },

  title: {
    color: "#a7a7a7",
    fontSize: 14,
  },

  username: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 3,
  },
});