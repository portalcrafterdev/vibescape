import { createStandardNavigationFactories } from "@react-navigation/native";
import React from "react";
import { StyleSheet, View } from "react-native";

const SettingContainer = ()=>{
    return(
        <View style={styles.container}></View>
    );
};

export default SettingContainer;

const styles = StyleSheet.create({
  container: {
    height:5,
    backgroundColor: "#989595b9",
    flexDirection: "row",
    marginTop: 15,
  }
});