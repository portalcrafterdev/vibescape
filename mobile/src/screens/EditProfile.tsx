import React, { useEffect, useState } from "react";
import { View, StyleSheet, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import EditProfileHeader from "../components/Edit_Profile/EditProfileHeader.";
import EditImage from "../components/Edit_Profile/EditImage";
import EditProfileFields from "../components/Edit_Profile/EditProfileFields";
import EditProfileLinks from "../components/Edit_Profile/EditProfileLinks";
import EditProfileGender from "../components/Edit_Profile/EditProfileGender";
import Reordergrid from "../components/Edit_Profile/ReorderGrid";

import { RootStackParamList } from "../types/navigation";
import { useProfile } from "../context/ProfileContext";
import { updateMe, ProfileLink } from "../../api/authApi";
import { getErrorMessage } from "../utils/apiError";

type Props = NativeStackScreenProps<RootStackParamList, 'EditProfile'>;

const EditProfile = ({ route, navigation }: Props)=>{
    const { user, setUser } = useProfile();

    const [name, setName] = useState("");
    const [username, setUsername] = useState("");
    const [pronouns, setPronouns] = useState("");
    const [bio, setBio] = useState("");
    const [gender, setGender] = useState("");
    const [avatar, setAvatar] = useState("");
    const [links, setLinks] = useState<ProfileLink[]>([]);

    const [saving, setSaving] = useState(false);

    // Fill the form with the profile we already loaded.
    useEffect(() => {
      if (!user) return;

      setName(user.display_name ?? "");
      setUsername(user.username);
      setPronouns(user.pronouns ?? "");
      setBio(user.bio ?? "");
      setGender(user.gender ?? "");
      setAvatar(user.avatar_url ?? "");
      setLinks(user.links ?? []);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);

    // GenderScreen and LinkPage send their result back as route params.
    useEffect(() => {
      if (route.params?.gender) setGender(route.params.gender);
    }, [route.params?.gender]);

    useEffect(() => {
      if (route.params?.links) setLinks(route.params.links);
    }, [route.params?.links]);

    // The avatar is saved on its own, because uploading a new image expires
    // the old one. Waiting for the tick would leave a dead picture if the
    // user backs out.
    const handleAvatarUploaded = async (url: string) => {
      setAvatar(url);

      try {
        const updated = await updateMe({ avatar_url: url });
        setUser(updated);
      } catch (error: any) {
        Alert.alert(
          'Could not save picture',
          getErrorMessage(error?.response ?? error, 'Please try again.'),
        );
      }
    };

    const handleSave = async () => {
      if (saving) return;

      if (!username.trim()) {
        Alert.alert('Edit profile', 'Username cannot be empty.');
        return;
      }

      setSaving(true);

      try {
        const updated = await updateMe({
          username: username.trim(),
          display_name: name.trim() || null,
          pronouns: pronouns.trim() || null,
          bio: bio.trim() || null,
          gender: gender || null,
          avatar_url: avatar || null,
          links: links,
        });

        setUser(updated);
        navigation.goBack();
      } catch (error: any) {
        Alert.alert(
          'Could not save',
          getErrorMessage(error?.response ?? error, 'Your changes were not saved.'),
        );
      } finally {
        setSaving(false);
      }
    };

    return (
        <SafeAreaView style={styles.container}>
      <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
  <View >
    <EditProfileHeader onSave={handleSave} saving={saving} />

    <EditImage
      avatarUrl={avatar}
      onUploaded={handleAvatarUploaded}
    />

    <EditProfileFields
      name={name}
      username={username}
      pronouns={pronouns}
      bio={bio}
      setName={setName}
      setUsername={setUsername}
      setPronouns={setPronouns}
      setBio={setBio}
    />

    <EditProfileLinks links={links} />

    <EditProfileGender gender={gender} />

    <Reordergrid/>
  </View>
  </ScrollView>
  </SafeAreaView>
    )
}

export default EditProfile;

const styles = StyleSheet.create({
container: {
  flex: 1,
  backgroundColor: '#000',
},
content: { paddingBottom: 40 },


});
