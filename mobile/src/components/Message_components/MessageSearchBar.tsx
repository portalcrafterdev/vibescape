import { Search } from "lucide-react-native";
import React from "react";
import {View, StyleSheet, TextInput, } from "react-native"

interface searchprops {
  value?: string;
  onChangeText?: (text: string) => void;
}

const MessageSearchBar = ({ value, onChangeText }: searchprops)=>{
    return(
        <View style={styles.container}>
        <Search
        size={20}
        color={"#fff"}
        />

        <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Search"
        placeholderTextColor="#8e8e93"
        autoCapitalize="none"
        autoCorrect={false}
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
  flex: 1,
  color: "#fff",
  marginLeft: 10,
  fontSize: 17
 }
});