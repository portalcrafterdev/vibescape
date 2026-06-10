import React, { useState } from 'react';
import { StyleSheet, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ProfileHeader from '../components/profile_components/ProfileHeader';
import ProfileInfo from '../components/profile_components/ProfileInfo';
import ProfileButtons from '../components/profile_components/ProfileButtons';
import StoryHighlight from '../components/profile_components/StoryHighlight';
import ProfileTabs from '../components/profile_components/ProfileTabs';
import ProfileGrid from '../components/profile_components/ProfileGrid';


const ProfileScreen = () => {
  const [activeTab, setActiveTab] = useState('posts');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={styles.content}
      >
        <ProfileHeader />

        <ProfileInfo />

        <ProfileButtons />

        <StoryHighlight />

        <ProfileTabs
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />

        {activeTab === 'posts' && <ProfileGrid />}

        {activeTab === 'reels' && <Text>This is reel screen</Text>}