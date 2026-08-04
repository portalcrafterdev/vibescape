import React, { useEffect } from 'react';
import {
  View,
  Image,
  StyleSheet,
  StatusBar,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { getme } from '../../api/authApi';

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

const SplashScreen = ({ navigation }: Props) => {
  useEffect(() => {
    const check = async () => {
      // Keeps the logo up for a moment even when the check is quick.
      const wait = new Promise((done) => setTimeout(() => done(true), 1500));

      const token = await AsyncStorage.getItem('accessToken');

      if (!token) {
        await wait;
        navigation.replace('Login');
        return;
      }

      try {
        // Makes sure the saved token still works before skipping the login.
        await getme();

        await wait;
        navigation.replace('Maintabs');
      } catch (error) {
        console.log('Saved session check failed', error);

        // The axios interceptor throws the tokens away when the session is
        // really gone. Anything else, like no internet, keeps the user in.
        const stillThere = await AsyncStorage.getItem('accessToken');

        await wait;
        navigation.replace(stillThere ? 'Maintabs' : 'Login');
      }
    };

    check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar
        backgroundColor="#000"
        barStyle="light-content"
      />

      <Image
        source={require('../assets/images/clipart402911.png')}
        style={styles.logo}
        resizeMode="contain"
      />
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
});
