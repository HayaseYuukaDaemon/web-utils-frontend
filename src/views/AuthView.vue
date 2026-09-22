<script setup lang="ts">
import { NCard, NFlex, NInput, NButton, useMessage } from 'naive-ui';
import { ref } from 'vue'
import { getAuthToken } from '../main'

const message = useMessage();

const authToken = ref('')

authToken.value = getAuthToken()

function saveAuthToken() {
    document.cookie = `auth_token=${authToken.value}`
    message.info(`Saved: ${authToken.value}`)
    setTimeout(() => { window.location.reload() }, 1000);
}

</script>

<template>
    <n-card title="Auth">
        <n-flex vertical>
            <n-input v-model:value="authToken" placeholder="访问密钥" />
            <n-card>{{ getAuthToken() }}</n-card>
            <n-button type="primary" @click="saveAuthToken">保存</n-button>
        </n-flex>
    </n-card>
</template>
