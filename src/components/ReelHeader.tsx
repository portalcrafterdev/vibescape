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