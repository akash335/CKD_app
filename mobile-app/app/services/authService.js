import api from './api';
import { setToken, setUser, removeToken, removeUser } from './storage';

export async function login(email, password) {
  const { data } = await api.post('/auth/login', {
    email: email.trim().toLowerCase(),
    password,
  });
  await setToken(data.access_token);
  await setUser(data.user);
  return data;
}

export async function register(name, email, password, role = 'patient') {
  const { data } = await api.post('/auth/register', {
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password,
    role: role.toLowerCase(),
  });
  await setToken(data.access_token);
  await setUser(data.user);
  return data;
}

export async function logout() {
  await removeToken();
  await removeUser();
}