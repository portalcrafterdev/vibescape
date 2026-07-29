import { Check, Cross, Plus, X } from "lucide-react-native";
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const GenderScreen = ()=>{
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
    }
});