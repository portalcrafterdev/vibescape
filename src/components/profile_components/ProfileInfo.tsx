import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

import {
  Plus,
} from 'lucide-react-native';

const ProfileInfo = () => {
  return (
    <View style={styles.container}>

      {/* Top Row */}
      <View style={styles.topRow}>

        {/* Profile Image */}
        <View style={styles.avatarContainer}>
          <Image
            source={require('../../assets/images/Portelcrafterlogo.png')}