import React from "react";
import { View, StyleSheet, FlatList  } from "react-native";
import NoteItem from "./NoteItem";
import { notesdata } from "../../data/NotesData";

const NoteSection = ()=>{
    return(
    <View style= {styles.container}>
        <FlatList
        horizontal
        keyExtractor={(item) => item.id}
        data={notesdata}
        renderItem={({item})=>(
        <NoteItem
        image= {item.image}
        username= {item.username}
        note= {item.note}
        />
        )}
        contentContainerStyle= {styles.content}
        />
    </View>
    );
};

export default NoteSection;

const styles = StyleSheet.create({
 content: {
  paddingHorizontal: 16,
  paddingBottom: 6
 },

 container: {
      marginTop: 18,
 },

});