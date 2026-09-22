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
    return getCookie('auth_token')
}

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
