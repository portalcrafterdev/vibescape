import React from "react";
import { View, StyleSheet, Text, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";

import { ProfileLink } from "../../../api/authApi";

interface linksprops {
   links: ProfileLink[];
}

const EditProfileLinks = ({ links }: linksprops)=>{
    const navigation = useNavigation<any>();

    return(
   <View style={styles.container}>
    <TouchableOpacity onPress={()=>navigation.navigate('LinkPage', { links })}>
        <Text style= {styles.linksbutton}>
            {links.length > 0 ? `${links.length} link${links.length > 1 ? 's' : ''}` : 'Add Link'}
        </Text>
    </TouchableOpacity>

    <View>
        <TouchableOpacity onPress={()=> navigation.push('BannerScreen')}>
            <Text style={styles.bannerbutton}>
                Add Banners
            </Text>
             <Text style={styles.subtitle}>
           Add music, profiles and more.
        </Text>
        </TouchableOpacity>

    </View>
   </View>
    )
}
export default EditProfileLinks;

const styles = StyleSheet.create({
 container:{
    marginTop:10
 },

 linksbutton:{
    color: "white",
    fontSize: 16,
    paddingLeft: 18,
 },

 bannerbutton:{
  marginTop: 18,
  color: "white",
  fontSize: 16,
  paddingLeft: 18,
 },

 subtitle:{
    color: "#8e8e93",
    fontSize: 14,
    marginTop: 4,
    paddingLeft:18,
 }
});
