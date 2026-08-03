import { UserPlus } from "lucide-react-native";
import React from "react";
import { View, StyleSheet, Text, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { AuthUser } from "../../../api/authApi";

interface buttonprops{
  user: AuthUser|null;
}
const ProfileButtons =({user}:buttonprops)=>{
    const navigation = useNavigation<any>();
    return (

  <View  style = {styles.container}>
  
  <TouchableOpacity style={styles.button} onPress={()=> navigation.navigate('EditProfile')} accessibilityRole="button">
    <Text style={styles.buttonText}>Edit profile</Text>
  </TouchableOpacity>

  <TouchableOpacity style={styles.button} accessibilityRole="button">
    <Text style={styles.buttonText}>Share profile</Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={styles.addButton}
    accessibilityRole="button"
    accessibilityLabel="Discover people">
    <UserPlus
    color={"white"}
    size={20}
    strokeWidth={2}/>
  </TouchableOpacity>

  </View>
    );
};

export default ProfileButtons;

const styles = StyleSheet.create({

    container: {
    flexDirection: "row",
    paddingHorizontal: 16,
    alignItems: "center",
    gap: 8,
    marginTop: 18,
    marginBottom: 18
    },

    button:{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        height: 32,
        backgroundColor: '#262626',
        borderRadius: 8,
    },

    buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

    addButton: {
    width: 32,
    height: 32,
    backgroundColor: '#262626',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },


});