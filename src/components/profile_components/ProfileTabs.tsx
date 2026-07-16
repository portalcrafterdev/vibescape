import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

import {
  Grid3X3,
  Clapperboard,
  UserRound,
} from 'lucide-react-native';

type Props = {
  activeTab: string;
  setActiveTab: React.Dispatch<React.SetStateAction<string>>;
};

const ProfileTabs = ({ activeTab, setActiveTab }: Props) => {
  return (
    <View style={styles.container}>

      <TouchableOpacity
        style={[
          styles.tab,
          activeTab === 'posts' && styles.activeTab,
        ]}
        onPress={() => setActiveTab('posts')}
      >
        <Grid3X3
          size={24}
          color={activeTab === 'posts' ? '#fff' : '#777'}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.tab,
          activeTab === 'reels' && styles.activeTab,
        ]}
        onPress={() => setActiveTab('reels')}
      >
        <Clapperboard
          size={24}
          color={activeTab === 'reels' ? '#fff' : '#777'}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.tab,
          activeTab === 'tagged' && styles.activeTab,
        ]}
        onPress={() => setActiveTab('tagged')}
      >
        <UserRound
          size={24}
          color={activeTab === 'tagged' ? '#fff' : '#777'}
        />
      </TouchableOpacity>

    </View>
  );
};

export default ProfileTabs;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#000',
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: '#262626',
    marginTop: 10,
  },

  tab: {
    flex: 1,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },

  activeTab: {
    borderBottomWidth: 1.5,
    borderBottomColor: '#fff',
  },
});