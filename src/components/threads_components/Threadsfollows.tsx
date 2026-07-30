import React from "react";
import { View, StyleSheet, Text } from "react-native";

const ThreadFollows = ()=>{
    return(
        <View style= {styles.container}>
            <Text style={styles.txt}>
           _hardik9050, _kulbir630, _akash__1 and 156 others are already on Threads.
            </Text>
        </View>
    );
};

export default ThreadFollows;

const styles = StyleSheet.create({
    
    container: {
     marginHorizontal:30,
     justifyContent:"center",
     alignItems: "center",
     marginTop:5,
    },

    txt:{
    color: "#fff",
    fontSize: 17,
    }
});