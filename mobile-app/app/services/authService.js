import api from './api';
import { setToken, setUser, removeToken, removeUser } from './storage';

export async function login(email, password) {
  const { data } = await api.post('/auth/login', { email, password });
  await setToken(data.access_token);
  await setUser(data.user);
  return data;
}

export async function register(name, email, password, role = 'patient') {
  const { data } = await api.post('/auth/register', { name, email, password, role });
  await setToken(data.access_token);
  await setUser(data.user);
  return data;
}

export async function logout() {
  await removeToken();
  await removeUser();
}
