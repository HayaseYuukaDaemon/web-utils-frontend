import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

export function getCookie(name: string) {
    const prefix = encodeURIComponent(name) + '='
    const cookie = document.cookie
        .split('; ')
        .find(row => row.startsWith(prefix))
    return cookie
        ? decodeURIComponent(cookie.slice(prefix.length))
        : ''
}

export function getAuthToken(){
    return localStorage.getItem('auth_token') || ''
}

export const SERVER_BASE_URL = "http://localhost:8000"

export async function authFetch(
    input: RequestInfo | URL,
    init: RequestInit = {},
) {
    const authToken = getAuthToken()
    const headers = new Headers(init.headers)
    if (authToken) {
        headers.set('Authorization', `Bearer ${authToken}`)
    }
    return await fetch(input, { ...init, headers })
}

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
