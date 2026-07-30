import React from "react";
import { View, Image, StyleSheet } from "react-native";

const ThreadsPeople = () => {
  return (
    <View style={styles.container}>

      <Image
        source={{
          uri: "https://randomuser.me/api/portraits/men/32.jpg",
        }}
        style={[styles.person, styles.personOne]}
      />

      <Image
        source={{
          uri: "https://randomuser.me/api/portraits/men/11.jpg",
        }}
        style={[styles.person, styles.personTwo]}
      />

      <Image
        source={{
          uri: "https://randomuser.me/api/portraits/men/45.jpg",
        }}
        style={[styles.person, styles.personThree]}
      />

      <Image
        source={{
          uri: "https://randomuser.me/api/portraits/men/68.jpg",
        }}
        style={[styles.person, styles.personFour]}
      />

      <Image
        source={{
          uri: "https://randomuser.me/api/portraits/men/75.jpg",
        }}
        style={[styles.person, styles.personFive]}
      />

    </View>
  );
};

export default ThreadsPeople;

const styles = StyleSheet.create({
  container: {
    height: 230,
    position: "relative",
    marginTop: 30,
    alignItems: "center",
  },

  person: {
    position: "absolute",
    borderRadius: 100,
    borderWidth: 2,
    borderColor: "#000",
  },

  personOne: {
    width: 72,
    height: 72,
    left: 42,
    top: 45,
  },

  personTwo: {
    width: 110,
    height: 110,
    top: 0,
  },

  personThree: {
    width: 64,
    height: 64,
    right: 44,
    top: 30,
  },

  personFour: {
    width: 104,
    height: 104,
    left: 86,
    top: 115,
  },

  personFive: {
    width: 98,
    height: 98,
    right: 65,
    top: 120,
  },
});