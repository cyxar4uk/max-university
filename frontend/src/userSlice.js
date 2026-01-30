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
  canChangeRole: true,  // По умолчанию можно менять роль
  isAuthenticated: false,
  loading: false,
  error: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    // Установка информации пользователя из MAX Bridge (документация: dev.max.ru/docs/webapps/bridge)
    // user приходит в snake_case: first_name, last_name, photo_url; поддерживаем и camelCase
    setUserFromMAX: (state, action) => {
      const { user, role, universityId, canChangeRole } = action.payload;
      if (!user) return;
      state.maxUserId = user.id;
      state.firstName = user.first_name ?? user.firstName ?? '';
      state.lastName = user.last_name ?? user.lastName ?? '';
      state.username = user.username ?? '';
      state.photoUrl = user.photo_url ?? user.photoUrl ?? user.avatar_url ?? user.avatarUrl ?? user.photo ?? null;
      state.languageCode = user.language_code ?? user.languageCode ?? null;
      state.role = role;
      state.universityId = universityId;
      state.canChangeRole = canChangeRole !== undefined ? canChangeRole : true;
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


