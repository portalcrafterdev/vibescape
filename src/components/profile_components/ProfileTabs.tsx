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
