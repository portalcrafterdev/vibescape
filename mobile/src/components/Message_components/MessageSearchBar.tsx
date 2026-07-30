import { Search } from "lucide-react-native";
import React from "react";
import {View, StyleSheet, TextInput, } from "react-native"

const MessageSearchBar = ()=>{
    return(
        <View style={styles.container}>
        <Search
        size={20}
        color={"#fff"}
        />

        <TextInput
        placeholder="Search or ask Meta AI"
        style= {styles.textinput}
        />
        </View>
    );
};

export default MessageSearchBar;

const styles = StyleSheet.create({
 container: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#262626",
    height: 48,
    marginHorizontal: 16,
    borderRadius: 25,
    paddingHorizontal:14,
 },

 textinput: {
  marginLeft: 10,
  fontSize: 17
 }
});