import { Search } from "lucide-react-native";
import React from "react";
import { StyleSheet, View } from "react-native";
import { TextInput } from "react-native-gesture-handler";

const SettingsSearch = ()=>{
    return(
        <View style={styles.container}>
      <View style={styles.searchcontainer}>
        <View style= {styles.rowcontainer}>
          <Search size={20} color={"#fff"}/>  
        <TextInput placeholder="Search" placeholderTextColor={"#fff"} style={styles.input}/>
        </View>
      </View>
        </View>
    );
};

export default SettingsSearch;

const styles = StyleSheet.create({
  container:{
   marginTop: 20,
  },

  searchcontainer:{
  height: 45,
  backgroundColor: "#f1efef3b",
  borderRadius:15,
  marginHorizontal:20,
  paddingHorizontal:20
  },

  rowcontainer :{
    flexDirection: "row",
    alignItems: "center"
  },

  input:{
   paddingTop:15,
   marginLeft:9,
   marginBottom:2
  }
})