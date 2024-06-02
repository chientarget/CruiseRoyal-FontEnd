import {defineStore} from 'pinia';
import router from '../router';

interface AuthState {
    user: string | null;
    access_token: string | null;
    refresh_token: string | null;
    returnUrl: string;
}

export const useAuthStore = defineStore({
    id: 'auth',
    state: (): AuthState => ({
        user: localStorage.getItem('user') || null,
        access_token: localStorage.getItem('access_token') || null,
        refresh_token: localStorage.getItem('refresh_token') || null,
        returnUrl: '/', // replace with your success route
    }),
    actions: {
        async login(username: string, password: string) {

            const formData = new FormData();
            formData.append('username', username);
            formData.append('password', password);
            const url = 'http://localhost:8080/api/login';
            let response = await fetch(url, {
                method: 'POST',
                body: formData,
            });

            if (response.status === 403) {
                // localStorage.setItem('redirectUrl', window.location.href);
                await this.refreshToken();
                response = await fetch(url, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'Authorization': `Bearer ${this.access_token}`,
                    },
                });

                return false;
            }

            if (response.status === 200) {
                const {access_token, refresh_token} = await response.json();
                localStorage.setItem('user', username);
                localStorage.setItem('access_token', access_token);
                localStorage.setItem('refresh_token', refresh_token);
                this.fetchUserInfo();
                this.user = username;
                this.access_token = access_token;
                this.refresh_token = refresh_token;

                // Get the stored URL
                const redirectUrl = localStorage.getItem('redirectUrl');
                // Remove the stored URL
                localStorage.removeItem('redirectUrl');
                // Redirect to the stored URL if it exists, otherwise to the default returnUrl
                router.push(redirectUrl || this.returnUrl);
                return true;
            }
        },

        async fetchUserInfo() {
            const username = localStorage.getItem('user');
            const access_token = localStorage.getItem('access_token');
            const url = `http://localhost:8080/api/user?username=${username}`;

            try {
              const res = await fetch(url, {
                headers: {
                  'Authorization': `Bearer ${access_token}` // Use the token here
                }
              });

              // If the token has expired
              if (res.status === 403) {
                // toastr.error("Phiên đăng nhập hết hạn.");
                useAuthStore().logout();
                return;
              }

              if (!res.ok) {
                throw new Error(`Server responded with status code ${res.status}`);
              }

              const userData = await res.json();
              console.log("User Data:", userData);
              localStorage.setItem('userInfo', JSON.stringify(userData));
              localStorage.setItem('userId', JSON.stringify(userData.id))
            } catch (error) {
              router.replace("/");
              console.log("Error fetching user by username!", error);
            }
        },

        async register(username: string, password: string) {
            const formData = new FormData();
            formData.append('username', username);
            formData.append('password', password);
            const url = 'http://localhost:8080/api/register'; // replace with your register endpoint

            const response = await fetch(url, {
                method: 'POST',
                body: formData,
            });

            if (response.status === 201) {
                // Sử dụng toast để thông báo
                return true;
            } else {
                // Sử dụng toast để thông báo
                return false;
            }
        },

        async refreshToken() {
            const response = await fetch('http://localhost:8080/api/token/refresh', {
                // replace with your refresh token endpoint
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.refresh_token}`,
                },
            });

            if (response.status === 200) {
                const {access_token} = await response.json();

                // adjust if your server returns a different data structure
                localStorage.setItem('access_token', access_token);
                this.access_token = access_token;
            } else {
                // showErrorToast('Failed to refresh token', 'Authentication');
                this.logout();
            }
        },

        logout() {
            this.user = null;
            this.access_token = '';
            this.refresh_token = '';
            localStorage.removeItem('user');
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('userInfo');
            localStorage.removeItem('userId')
            router.push('/'); // replace with your logout route
        },
    },
});
