import { Check, X, } from "lucide-react-native";
import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CircleDotIcon from "../icons/CircleDot";
const GenderScreen = ()=>{
    const [selected, setSelected] = useState("Male");
    return(
     <SafeAreaView style={styles.container}>
   <View>
    <View style={styles.header}>
        <X
        size={27}
        color={"#fff"}/>

        <Text style={styles.title}>Gender</Text>

        <Check
        size={27}
        color={"#6C63FF"}
        />
    </View>

    <Text style={styles.subtitle}>This won't be the part of your public profile.</Text>

    <View style= {styles.row}>
      <Text style={styles.txt}>Female</Text>
      {/* <Circle 
      size={23}
      color={"#fff"}
      /> */}
      <TouchableOpacity onPress={() => setSelected("Female")}>
      <CircleDotIcon isSelected={selected == "Female"} height={23} width={23}  color={"#fff"}/>
      </TouchableOpacity>
    </View>

        <View style= {styles.row}>
      <Text style={styles.txt}>Male</Text>
       
      <TouchableOpacity onPress={() => setSelected("Male")}>
      <CircleDotIcon isSelected={selected == "Male"} height={23} width={23}  color={"#fff"} />
      </TouchableOpacity>
    </View>

        <View style= {styles.row}>
      <Text style={styles.txt}>Custom</Text>
      
      <TouchableOpacity onPress={() => setSelected("custom")}>
      <CircleDotIcon isSelected={selected == "custom"} height={23} width={23}  color={"#fff"} />
      </TouchableOpacity>
    </View>

        <View style= {styles.row}>
      <Text style={styles.txt}>Prefer not to say</Text>
       
      <TouchableOpacity onPress={() => setSelected("prefer")}>
      <CircleDotIcon isSelected={selected == "prefer"} height={23} width={23}  color={"#fff"} />
      </TouchableOpacity>
    </View>
   </View>
   </SafeAreaView>   
    );
};

export default GenderScreen;

const styles = StyleSheet.create({
 
    container: {
        flex: 1,
        backgroundColor: "#000"
    },

    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginHorizontal: 20,
        marginTop: 12
    },

    title: {
        color: "#fff",
        fontSize: 20,
        fontWeight: "700",
        marginRight: 80
    },

    subtitle: {
        marginTop: 23,
        color: "#a29e9e",
        marginHorizontal: 23,
        fontSize: 14
    },

    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginHorizontal:20,
        marginVertical: 15,
        marginTop: 30,
    },

    txt: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "700"
    }
});