import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const SettingLogin = ()=>{
    return(
        <View style={styles.container}>
        <Text style={styles.txt}>Login</Text>
        <TouchableOpacity> <Text style={styles.account}>Add account </Text></TouchableOpacity>
        <TouchableOpacity >
            <Text style={styles.logout}> Log out</Text>
        </TouchableOpacity>
        </View>
    );
};

export default SettingLogin;

const styles = StyleSheet.create({
  container: {
  flex:1,
  marginTop:15,
  marginHorizontal: 20,
  justifyContent: "space-evenly"
  },

  account: {
    marginTop: 20,
    color:"#fff",
    fontSize:14,
  },

  logout: {
    marginTop:20,
    color:"#ef1313",
    fontSize:14,
    fontWeight:"600",
    marginBottom:20
  },

  txt: {
    color: "#eae2e2cf",
    fontSize:16,
    fontWeight:"600"
  }
});