import React from "react";
import { View, StyleSheet, TouchableOpacity, Text } from "react-native";

const MessagesTitle = ({ unread }: { unread?: number })=>{
    return(
    <View style= {styles.container}>
     <Text style={styles.msgtxt}> Messages</Text>

     {/* The badge count across every thread, hidden when everything is read. */}
     {!!unread && unread > 0 && (
       <View style={styles.badge}>
         <Text style={styles.badgeText}>{unread}</Text>
       </View>
     )}

     <View style={styles.spacer} />

     <TouchableOpacity>
        <Text style={styles.req} >
        Requests
        </Text></TouchableOpacity>
    </View>
    );
};

export default MessagesTitle;

const styles = StyleSheet.create({
 container: {
    flexDirection: "row",
    alignItems: "center",
    marginTop:12,
    marginHorizontal:18,
 },

 spacer: {
   flex: 1,
 },

 badge: {
   minWidth: 20,
   height: 20,
   borderRadius: 10,
   backgroundColor: "#0095F6",
   alignItems: "center",
   justifyContent: "center",
   paddingHorizontal: 6,
   marginLeft: 8,
 },

 badgeText: {
   color: "#fff",
   fontSize: 12,
   fontWeight: "700",
 },

 msgtxt: {
 fontSize: 16,
 color: "#fff",
 fontWeight: "600"

 },
 req:{
  fontSize: 16,
  color: "#6C63FF",
  fontWeight: "600"
 }
});
