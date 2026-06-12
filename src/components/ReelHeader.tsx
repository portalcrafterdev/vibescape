import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
  StatusBar,
} from 'react-native';

import {
  Plus,
  ChevronDown,
} from 'lucide-react-native';

const ReelsHeader = () => {
  return (
    <View style={styles.container}>

      <TouchableOpacity>
        <Plus
          color="white"
          size={28}
        />
      </TouchableOpacity>

      <View style={styles.center}>

        <Text style={styles.reels}>
          Reels
        </Text>

        <ChevronDown
          color="white"
          size={18}
        />

      </View>

      <View style={styles.right}>

        <Text style={styles.friendText}>
          Friends
        </Text>

        <Image
          source={{
            uri: 'https://i.pravatar.cc/150?img=15',
          }}
          style={styles.avatar}
        />

        <Image
          source={{
            uri: 'https://i.pravatar.cc/150?img=20',
          }}
          style={[
            styles.avatar,
            {
              marginLeft: -10,
            },
          ]}
        />

      </View>

    </View>
  );
};
