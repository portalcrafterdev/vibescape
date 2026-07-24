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
            >
              <Icon
                size={26}
                color={focused ? '#000' : '#666'}
                strokeWidth={2.3}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 20,
    alignItems: 'center',
  },

  container: {
    flexDirection: 'row',
    backgroundColor: '#000',
    borderWidth:1,

    width: '100%',
    height: 50,

    borderRadius: 40,

    justifyContent: 'space-around',
    alignItems: 'center',

    shadowColor: '#000',

    shadowOffset: {
      width: 0,
      height: 8,
    },

    shadowOpacity: 0.15,

    shadowRadius: 10,

    elevation: 12,
  },

  tabButton: {
    width: 62,
    height: 47,

    justifyContent: 'center',
    alignItems: 'center',

    borderRadius: 24,
  },

  activeButton: {
    backgroundColor: '#E8E8E8',
  },
});