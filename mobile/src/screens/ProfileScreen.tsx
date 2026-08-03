import React, { useState , useEffect} from 'react';
import { StyleSheet, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ProfileHeader from '../components/profile_components/ProfileHeader';
import ProfileInfo from '../components/profile_components/ProfileInfo';
import ProfileButtons from '../components/profile_components/ProfileButtons';
import StoryHighlight from '../components/profile_components/StoryHighlight';
import ProfileTabs from '../components/profile_components/ProfileTabs';
import ProfileGrid from '../components/profile_components/ProfileGrid';
import { AuthUser } from '../../api/authApi';
import { getme } from '../../api/authApi';


const ProfileScreen = () => {
  const [activeTab, setActiveTab] = useState('posts');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
  try {
    const response = await getme();

    setUser(response);
  } catch (error) {
    console.log(error);
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  fetchProfile();
}, []);
   return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={styles.content}
      >
        <ProfileHeader user={user} />

        <ProfileInfo user={user}/>

        <ProfileButtons user={user} />

        <StoryHighlight />

        <ProfileTabs
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />

        {activeTab === 'posts' && <ProfileGrid />}

        {activeTab === 'reels' && <Text>This is reel screen</Text>}

        {activeTab === 'tagged' && <Text>This is Tagged Screen</Text>}
      </ScrollView>
    </SafeAreaView>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  content: {
    paddingBottom: 80,
  },
});