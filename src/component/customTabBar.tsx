import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

import {
  BottomTabBarProps,
} from '@react-navigation/bottom-tabs';

import {
  House,
  Search,
  SquarePlus,
  Clapperboard,
  CircleUserRound,
  Send,
} from 'lucide-react-native';

const icons = {
  Home: House,
  Search: Search,
  Create: Send,
  Reels: Clapperboard,
  Profile: CircleUserRound,
};

export default function CustomTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;

          const Icon =
            icons[route.name as keyof typeof icons];

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              activeOpacity={0.8}
              onPress={onPress}
              style={[
                styles.tabButton,
                focused && styles.activeButton,
              ]}