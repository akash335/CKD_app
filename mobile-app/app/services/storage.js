import AsyncStorage from '@react-native-async-storage/async-storage';

export const setToken = async (token) => AsyncStorage.setItem('token', token);
export const getToken = async () => AsyncStorage.getItem('token');
export const removeToken = async () => AsyncStorage.removeItem('token');
export const setUser = async (user) => AsyncStorage.setItem('user', JSON.stringify(user));
export const getUser = async () => {
  const raw = await AsyncStorage.getItem('user');
  return raw ? JSON.parse(raw) : null;
};
export const removeUser = async () => AsyncStorage.removeItem('user');
