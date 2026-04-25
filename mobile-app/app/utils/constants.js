import { Platform } from 'react-native';

const PROD_API_URL = 'https://your-backend-name.onrender.com';

const LOCAL_WEB_API_URL = 'http://127.0.0.1:8000';
const LOCAL_ANDROID_API_URL = 'http://10.0.2.2:8000';
const LOCAL_IOS_API_URL = 'http://127.0.0.1:8000';

export const API_BASE_URL = __DEV__
    ? Platform.OS === 'web'
        ? LOCAL_WEB_API_URL
        : Platform.OS === 'android'
            ? LOCAL_ANDROID_API_URL
            : LOCAL_IOS_API_URL
    : PROD_API_URL;