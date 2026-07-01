import { defineStore } from "pinia";
import UserService from "@/services/api/user";
import { useAuthStore } from "@/stores/auth";

export const useUserStore = defineStore("user", {
  state: () => ({
    user: null,
    loading: false,
    error: null,
  }),
  persist: {
    // IMPORTANT: do not use key "user" (reserved by auth store localStorage).
    // Keep profile data separated to avoid overwriting each other.
    key: "profile",
    paths: ["user"],
  },
  actions: {
    async fetchProfile() {
      this.loading = true;
      this.error = null;
      try {
        const data = await UserService.getProfile();

        // Support common API shapes: { data: user }, { user: user }, or direct user object.
        const raw = data?.data ?? data?.user ?? data;
        this.user = raw;
        return this.user;
      } catch (error) {
        this.error =
          error.response?.data?.message || "Gagal memuat profil user";
        throw error;
      } finally {
        this.loading = false;
      }
    },
    async updateProfile(payload) {
      this.loading = true;
      this.error = null;
      try {
        const data = await UserService.updateProfile(payload);

        // Update local state ASAP so UI reacts without needing refresh.
        const raw = data?.user ?? data?.data ?? data;
        const isLikelyUserObject =
          raw &&
          typeof raw === "object" &&
          ("id" in raw || "email" in raw || "name" in raw);
        if (isLikelyUserObject) {
          this.user = raw;
        }

        await this.fetchProfile();
        
        const authStore = useAuthStore();
        authStore.updateLocalUser(this.user);
        
        return this.user;
      } catch (error) {
        this.error =
          error.response?.data?.message || "Gagal memperbarui profil";
        throw error;
      } finally {
        this.loading = false;
      }
    },
    async deleteAccount(payload) {
      this.loading = true;
      this.error = null;
      try {
        await UserService.deleteAccount(payload);
      } catch (error) {
        this.error =
          error.response?.data?.message ||
          error.response?.data?.error ||
          "Gagal menghapus akun";
        throw error;
      } finally {
        this.loading = false;
      }
    },
    async changePassword(payload) {
      this.loading = true;
      this.error = null;
      try {
        await UserService.changePassword(payload);
      } catch (error) {
        this.error =
          error.response?.data?.message || "Gagal mengubah kata sandi";
        throw error;
      } finally {
        this.loading = false;
      }
    },
  },
});
