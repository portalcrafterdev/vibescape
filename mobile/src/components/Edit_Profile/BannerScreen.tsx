import { ArrowLeft, Plus } from "lucide-react-native";
import React from "react";
import {View, StyleSheet, TouchableOpacity, Text} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context";
import FacebookIcon from "../icons/FacebookIcon.tsx";
import WhatsappIcon from "../icons/WhatsappIcon.tsx";
import MusicIcon from "../icons/MusicIcon.tsx";

const BannerScreen = ()=>{
    return(
   <SafeAreaView style={styles.container}>
    <View>
   <View style={styles.header}>
    <TouchableOpacity>
        <ArrowLeft
        size={28}
        color={"#fff"}
        />
    </TouchableOpacity>

    <Text style={styles.headerTitle}>Banners</Text>
    <View style={styles.headerSpacer}></View>
   </View>

   <Text style={styles.subtitle}>on your profile</Text>

   <View style={styles.section}>
    <Text style={styles.sectionTitle}>Say more with banners</Text>

    <Text style={styles.sectionDescription}>Share more about what you are and what you care about. This helps others discover similar interests and connect with you.</Text>
   </View>

   <Text style={styles.addToProfile}>Add to Profile</Text>
 
 //facebook Row
   <View style={styles.iconRow}>
 
 //plus button
    <TouchableOpacity>
    <View style={styles.iconCircle}>
    <Plus
    size={18}
    color={"#fff"}
    />
    </View>
    </TouchableOpacity>

  // facebook icon  
    <TouchableOpacity>
     <View style={styles.iconCircle}>
     <FacebookIcon height={40} width={40} color={"#fff"}/>
     </View>
     </TouchableOpacity>

   <Text style={{fontSize: 20, fontWeight: "600", color: "#fff"}}> Facebook Profile</Text>
   </View>

    //Whatsapp Row
   <View style={styles.iconRow}>
 
 //plus button
    <TouchableOpacity>
    <View style={styles.iconCircle}>
    <Plus
    size={18}
    color={"#fff"}
    />
    </View>
    </TouchableOpacity>

  // Whatsapp icon  
    <TouchableOpacity>
     <View style={styles.iconCircle}>
     <WhatsappIcon height={27} width={27} color={"#fff"}/>
     </View>
     </TouchableOpacity>

   <Text style={{fontSize: 20, fontWeight: "600", color: "#fff"}}> Whatsapp</Text>
   </View>
   

    //facebook Row
   <View style={styles.iconRow}>
 
 //plus button
    <TouchableOpacity>
    <View style={styles.iconCircle}>
    <Plus
    size={18}
    color={"#fff"}
    />
    </View>
    </TouchableOpacity>

  // facebook icon  
    <TouchableOpacity>
     <View style={styles.iconCircle}>
     <MusicIcon height={18} width={18} color={"#fff"}/>
     </View>
     </TouchableOpacity>

   <Text style={{fontSize: 20, fontWeight: "600", color: "#fff"}}> Music</Text>
   </View>


   </View>
  </SafeAreaView>
    );
};

export default BannerScreen;

const styles = StyleSheet.create({
container: {
    flex: 1,
    backgroundColor: "#000",
},
header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    marginTop: 8,
},
headerTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
},
headerSpacer: {
    width: 40,
},
subtitle: {
    fontSize: 16,
    color: "#fff",
    marginTop: 25,
    marginHorizontal: 15,
    fontWeight: "500",
},
section: {
    marginTop: 40,
},
sectionTitle: {
    color: "#fff",
    fontSize: 28,
    marginHorizontal: 29,
    fontWeight: "400",
},
sectionDescription: {
    color: "#535050",
    marginHorizontal: 27,
    fontSize: 14.3,
    marginTop: 12,
},
addToProfile: {
    marginTop: 40,
    color: "#fff",
    fontWeight: "500",
    fontSize: 16,
    marginLeft: 12,
},
iconRow: {
    flexDirection: "row",
    marginTop: 28,
    marginHorizontal: 18,
},
iconCircle: {
    height: 25,
    width: 25,
    borderWidth: 1,
    borderColor: "#fff",
    borderRadius: 45,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    marginRight:12
}
});