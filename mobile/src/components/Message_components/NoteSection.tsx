import React from "react";
import { View, StyleSheet, FlatList  } from "react-native";
import NoteItem from "./NoteItem";
import { UserSummary } from "../../../api/authApi";

interface noteprops {
  people: UserSummary[];
  onPress: (person: UserSummary) => void;
}

// The API has no notes, so this row shows the people you follow instead.
const NoteSection = ({ people, onPress }: noteprops)=>{
    if (people.length === 0) return null;

    return(
    <View style= {styles.container}>
        <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        data={people}
        renderItem={({item})=>(
        <NoteItem
        image= {item.avatar_url}
        username= {item.username}
        onPress={() => onPress(item)}
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
