import React from "react";
import { View ,Text, StyleSheet,} from "react-native";

const ThreadsTerms = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        By joining Threads, you agree to our terms and
        policies. We'll add your account to Accounts
        Centre and combine and use your info across
        accounts to personalise your experiences and ads.
      </Text>
    </View>
  );
};

export default ThreadsTerms;

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 18,
    marginTop: 25,
  },

  text: {
    color: "#a7a7a7",
    fontSize: 14,
    lineHeight: 19,
  },
});