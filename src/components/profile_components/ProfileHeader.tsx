import React from "react";
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { AtSign, ChevronDown, Plus, Menu } from "lucide-react-native";

const ProfileHeader= ()=>{
    return (
        <View style={styles.container}>
     <TouchableOpacity style={styles.plusButton}>
        <Plus size={32} color={"white"} strokeWidth={2}/>
     </TouchableOpacity>


     <TouchableOpacity style={styles.usernameContainer}>
        <Text style={styles.username}> Portel Crafter</Text>
          <ChevronDown size={22} color={"white"}/>
     </TouchableOpacity>

       <View style={styles.rightIcons}>

        <TouchableOpacity style={styles.iconButton}>
            <AtSign color={"white"} size={22}/>
        </TouchableOpacity>

        <TouchableOpacity style= {styles.iconButton}>
            <Menu color={"white"} size={22}/>
        </TouchableOpacity>