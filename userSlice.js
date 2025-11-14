import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  maxUserId: null,
  firstName: null,
  lastName: null,
  username: null,
  photoUrl: null,
  languageCode: null,
  role: null,
  universityId: null,
  isAuthenticated: false,
  loading: false,
  error: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    // Установка информации пользователя из MAX Bridge
    setUserFromMAX: (state, action) => {
      const { user, role, universityId } = action.payload;
      state.maxUserId = user.id;
      state.firstName = user.first_name;
      state.lastName = user.last_name;
      state.username = user.username;
      state.photoUrl = user.photo_url;
      state.languageCode = user.language_code;
      state.role = role;
      state.universityId = universityId;
      state.isAuthenticated = true;
      state.error = null;
    },

    // Обновление роли
    setRole: (state, action) => {
      const { role, universityId } = action.payload;
      state.role = role;
      if (universityId) {
        state.universityId = universityId;
      }
    },

    // Установка состояния загрузки
    setLoading: (state, action) => {
      state.loading = action.payload;
    },

    // Установка ошибки
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },

    // Очистка пользователя
    clearUser: (state) => {
      state.maxUserId = null;
      state.firstName = null;
      state.lastName = null;
      state.username = null;
      state.photoUrl = null;
      state.languageCode = null;
      state.role = null;
      state.universityId = null;
      state.isAuthenticated = false;
      state.error = null;
    },
  },
});

export const {
  setUserFromMAX,
  setRole,
  setLoading,
  setError,
  clearUser,
} = userSlice.actions;

export default userSlice.reducer;


