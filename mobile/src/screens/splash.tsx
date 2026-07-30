import React from 'react';
import {
  View,
  Image,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
} from 'react-native';

/**
 * Shown while the stored session is being restored.
 *
 * It no longer navigates on a timer. RootNavigator swaps the whole stack once
 * hydration finishes, so a fixed delay here would either cut the check short or
 * make an already-signed-in user wait for nothing.
 */
const SplashScreen = () => {
  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#000" barStyle="light-content" />

      <Image
        source={require('../assets/images/clipart402911.png')}
        style={styles.logo}
        resizeMode="contain"
      />

      <ActivityIndicator color="#fff" style={styles.spinner} />
    </View>
  );
};

export default SplashScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },

  logo: {
    width: 130,
    height: 130,
  },

  spinner: {
    marginTop: 28,
  },
});
