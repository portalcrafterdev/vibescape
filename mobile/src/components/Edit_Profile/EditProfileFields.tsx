import React from "react";
import { View, StyleSheet, TextInput, Text } from "react-native";

interface fieldsprops {
   name: string;
   username: string;
   pronouns: string;
   bio: string;
   setName: (value: string) => void;
   setUsername: (value: string) => void;
   setPronouns: (value: string) => void;
   setBio: (value: string) => void;
}

const EditProfileFields= ({
   name,
   username,
   pronouns,
   bio,
   setName,
   setUsername,
   setPronouns,
   setBio,
}: fieldsprops)=>{
    return(
    <View style={styles.container}>
  <View style={styles.field}>
    <Text style={styles.label}>Name</Text>
    <TextInput
    value={name}
    placeholder="Name"
    onChangeText={setName}
    placeholderTextColor="#777"
    style={styles.input}
    underlineColorAndroid="transparent"
    />
  </View>

   <View style={styles.field}>
    <Text style={styles.label}>Username</Text>
    <TextInput
    value={username}
    placeholder="Username"
    onChangeText={setUsername}
    placeholderTextColor="#777"
    style={styles.input}
    autoCapitalize="none"
    autoCorrect={false}
    underlineColorAndroid="transparent"
    />
  </View>

   <View style={styles.field}>
    <Text style={styles.label}>Pronouns</Text>
    <TextInput
    value={pronouns}
    placeholder="Pronouns"
    onChangeText={setPronouns}
    placeholderTextColor="#777"
    style={styles.input}
    underlineColorAndroid="transparent"
    />
  </View>

   <View style={styles.field}>
    <Text style={styles.label}>Bio</Text>
    <TextInput
    value={bio}
    placeholder="Bio"
    onChangeText={setBio}
    placeholderTextColor="#777"
    style={styles.input}
    multiline
    underlineColorAndroid="transparent"
    />
  </View>

    </View>
    );
}

export default EditProfileFields;

const styles = StyleSheet.create({
 container:{
    marginTop: 16
 },

 label:{
    color: "#8e8e93",
    fontSize: 13,
    fontWeight: "500",
    paddingHorizontal: 5,
    marginTop:5,
    marginBottom:4,
 },

  input: {
  color: '#fff',
  fontSize: 18,
  paddingVertical:4,
},


field: {
  marginHorizontal: 16,
  marginBottom: 12,
  paddingHorizontal: 9,
  borderWidth: 1,
  borderColor: "#3a3a3a",
  borderRadius: 12,
  backgroundColor: "#111",
}
});
