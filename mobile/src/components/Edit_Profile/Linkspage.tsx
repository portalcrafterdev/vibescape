import { ArrowLeft, Plus } from "lucide-react-native";
import React from "react";
import { View , StyleSheet, TouchableOpacity, Text} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

const LinkPage = ()=>{
    const navigation = useNavigation<any>();
 return(
    <SafeAreaView style= {styles.container}>
    <View >
        <View style={styles.view}>
     <TouchableOpacity onPress={()=>navigation.goBack()}>   
    <ArrowLeft
    size={25}
    color={"#fff"}
    />
    </TouchableOpacity>    

    <Text style={styles.header}>
        Links
    </Text>

      <View style={styles.placeholder} />
    </View>

    <View style={{flexDirection: "row"}}>
        <TouchableOpacity style={styles.plusbutton}>
            <Plus
            size={30}
            color={"#fff"}
            />
        </TouchableOpacity>

        <Text style={styles.Addlink}>
            Add Link
        </Text>
    </View>

 <View style={{flexDirection: "row",  marginHorizontal: 22, marginTop:5}}>
    <Text style={styles.descrip}>
        Your links are visible to everyone on and off Instagram.
             <Text style={styles.learnmore}>
        Learn more
    </Text>
    </Text>
   <TouchableOpacity>
   </TouchableOpacity>
    </View>
    </View>
    </SafeAreaView>
 );
};

export default LinkPage;

const styles = StyleSheet.create({
 container:{
    backgroundColor: "#000",
    flex:1,
 },

 view:{
    height: 56,
    backgroundColor: "#000",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#262626",
 },

 header:{
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
 },

   placeholder: {
    width: 36,
  },

  plusbutton:{
    marginTop: 17,
    marginHorizontal:20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#262626", borderRadius:60,
    height:45,
    width:45,
    borderWidth:1,
    borderColor:"#ffffff85"
  },

  Addlink: {
    color: "#fff",
    fontSize:14,
    fontWeight: "700",
    marginTop: 33,

  },

  learnmore: {
    color: "#6C63FF",
    fontSize: 15,
    fontWeight: "300"
  },

  descrip: {
    color: "#A8A8A8",
    fontSize: 15,
    fontWeight: "300",
  }
});