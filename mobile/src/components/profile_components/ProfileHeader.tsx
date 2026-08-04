import React, { use } from "react";
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { AtSign, ChevronDown, Plus, Menu } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { AuthUser } from "../../../api/authApi";

interface headerprops{
 user : AuthUser| null;
}
const ProfileHeader= ({user}:headerprops)=>{
  const navigation = useNavigation<any>();
    return (
        <View style={styles.container}>
     <TouchableOpacity style={styles.plusButton}>
        <Plus size={32} color={"white"} strokeWidth={2}/>
     </TouchableOpacity>


     <TouchableOpacity style={styles.usernameContainer}>
        <Text style={styles.username}> {user?.username ?? "loading...."}</Text>
          <ChevronDown size={22} color={"white"}/>
     </TouchableOpacity>

       <View style={styles.rightIcons}>

        <TouchableOpacity style={styles.iconButton} onPress={()=>navigation.push('ThreadsScreen')}>
            <AtSign color={"white"} size={22}/>
        </TouchableOpacity>

        <TouchableOpacity style= {styles.iconButton} onPress={()=>navigation.push('SettingsScreen')}>
            <Menu color={"white"} size={22}/>
        </TouchableOpacity>
       </View>
        </View>
    );
};

export default ProfileHeader;


const styles = StyleSheet.create({
   container: {
    height: 60,
    backgroundColor: '#000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  

    plusButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },

    usernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },

    username: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginRight: 4,
  },

   rightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },

   iconButton: {
    marginLeft: 18,
  },




})