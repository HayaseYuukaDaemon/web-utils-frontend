<script setup lang="ts">
import { authFetch } from '../main'
import { NCard, NAutoComplete, NSwitch, NButton, NInput, NFlex, NTag, useMessage, NAlert, NInputNumber, NPopconfirm } from 'naive-ui';
import { computed, ref, watch } from 'vue'
import { generatePassword, DEFAULT_SYMBOLS } from '../components/vault'

import type { PasswordConfig } from '../components/vault'

const enableSpecialCharacters = ref(true)
const genetatedPassword = ref('点击生成密码');

const masterKey = ref('');
const masterKeyFingerprint = ref<{
    code: string
    color: { color: string; textColor: string }
} | null>(null)

watch(masterKey, async (value, _oldValue, onCleanup) => {
    let active = true
    onCleanup(() => { active = false })
    masterKeyFingerprint.value = null

    if (!value || !globalThis.crypto?.subtle) return

    try {
        const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
        if (!active) return

        const hash = new Uint8Array(hashBuffer)
        const r = hash[0]!
        const g = hash[1]!
        const b = hash[2]!
        const code = Array.from(hash.slice(0, 2), byte => byte.toString(16).padStart(2, '0'))
            .join('').toUpperCase()
        const brightness = (r * 299 + g * 587 + b * 114) / 1000

        masterKeyFingerprint.value = {
            code,
            color: {
                color: `rgb(${r},${g},${b})`,
                textColor: brightness > 128 ? '#000' : '#fff'
            }
        }
    } catch {
        // Keep the badge hidden if Web Crypto cannot calculate the fingerprint.
    }
}, { flush: 'sync' })

const platform = ref('');
const configName = ref('');
const specialCharacters = ref(DEFAULT_SYMBOLS);
const symbols = computed(() => {
    if (enableSpecialCharacters.value) {
        return specialCharacters.value
    } else {
        return ''
    }
});
const length = ref(16);
const configs = ref<Record<string, PasswordConfig>>({});
const configOptions = computed(() => {
    if (!configs.value) {
        return []
    }
    return Object.entries(configs.value).filter(([name, config]) => {
        return name.includes(configName.value) || config.platform.includes(configName.value)
    }).map(([name]) => {
        return {
            label: name,
            value: name
        }
    })
})

function onConfigSelect(name: string) {
    const config = configs.value[name]
    if (config) {
        platform.value = config.platform
        length.value = config.length || 16
        specialCharacters.value = config.symbols || DEFAULT_SYMBOLS
        if (config.symbols) {
            enableSpecialCharacters.value = true
        } else {
            enableSpecialCharacters.value = false
        }
    }
}

const message = useMessage();

async function updateConfigs() {
    authFetch(`/api/vault/configs`, {
        method: 'GET',
    }).then(async (response) => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        configs.value = await response.json();
        console.log(configs.value)
        enableServerSideFunctions.value = true
    }).catch((error) => {
        if (error instanceof Error) {
            message.error(error.message)
        } else {
            message.error('未知错误')
        }
        console.error(error)
        enableServerSideFunctions.value = false
    }).finally(() => {
        deleteLoading.value = false
        submitLoading.value = false
    })
}

async function handleGenerate() {
    if (!masterKey.value || !platform.value) {
        message.error('主密钥和平台不能为空')
        return
    }
    if (!window.isSecureContext) {
        message.error('浏览器不支持剪贴板操作，请使用https或localhost访问')
        return
    }
    genetatedPassword.value = await generatePassword(masterKey.value, {
        platform: platform.value,
        symbols: symbols.value,
        length: length.value
    });
    await navigator.clipboard.writeText(genetatedPassword.value)
    message.info('已复制到剪贴板')
}

const submitLoading = ref(false);
const deleteLoading = ref(false)

const enableServerSideFunctions = ref(false);

async function saveConfig() {
    submitLoading.value = true
    try {
        const resp = await authFetch(`/api/vault/configs/${encodeURIComponent(configName.value)}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                platform: platform.value,
                length: length.value,
                symbols: symbols.value
            })
        })
        if (!resp.ok) {
            throw new Error(`HTTP error! status: ${resp.status}`);
        }
        await updateConfigs()
        message.info(`${configName.value} 已保存`)
    } finally {
        submitLoading.value = false;
    }
}

async function deleteConfig() {
    deleteLoading.value = true;
    try {
        const resp = await authFetch(`/api/vault/configs/${encodeURIComponent(configName.value)}`, {
            method: 'DELETE'
        })
        if (!resp.ok) {
            throw new Error(`HTTP error! status: ${resp.status}`);
        }
        await updateConfigs()
        message.warning(`${configName.value} 已删除`)
    } finally {
        deleteLoading.value = false
    }
}

deleteLoading.value = true
submitLoading.value = true
updateConfigs().then()

</script>

<template>
    <n-card title="vault" size="large">
        <n-flex vertical>
            <n-alert type="error" v-if="!enableServerSideFunctions">服务器端请求失败, 禁用相关功能</n-alert>
            <n-flex align="center" :wrap="false" :size="8">
                <n-input type="password" show-password-on="click" v-model:value="masterKey" placeholder="主密钥"
                    clearable class="master-key-input" />
                <n-tag size="small" :bordered="false" :color="masterKeyFingerprint?.color"
                    class="master-key-fingerprint" :class="{ 'is-hidden': !masterKeyFingerprint }"
                    :aria-hidden="!masterKeyFingerprint" aria-label="主密钥指纹">
                    {{ masterKeyFingerprint?.code ?? '????' }}
                </n-tag>
            </n-flex>
            <n-input v-model:value="platform" placeholder="平台" clearable />
            <n-input-number v-model:value="length" placeholder="长度" :min="4" />
            <n-flex align="center" :size="16" :wrap="false">
                <n-switch v-model:value="enableSpecialCharacters" />
                <n-input v-model:value="specialCharacters" class="field" placeholder="特殊字符集"
                    :disabled="!enableSpecialCharacters" />
            </n-flex>

            <n-flex align="center" :wrap="false">
                <n-auto-complete v-model:value="configName" placeholder="配置" class="field"
                    :disabled="!enableServerSideFunctions" :options="configOptions" @select="onConfigSelect" />
                <n-button type="success" @click="saveConfig" :loading="submitLoading"
                    :disabled="!enableServerSideFunctions || !configName">保存</n-button>
                <n-popconfirm @positive-click="deleteConfig">
                    <template #trigger>
                        <n-button type="error" :loading="deleteLoading"
                            :disabled="!enableServerSideFunctions || !configName">删除</n-button>
                    </template>
                    确定要删除 {{ configName }} 吗?
                </n-popconfirm>

            </n-flex>
            <n-button type="primary" @click="handleGenerate">{{ genetatedPassword }}</n-button>
        </n-flex>
    </n-card>
</template>

<style scoped>
.master-key-input {
    flex: 1;
    min-width: 0;
}

.master-key-fingerprint {
    box-sizing: border-box;
    width: 64px;
    flex-shrink: 0;
    justify-content: center;
    font-family: monospace;
}

.master-key-fingerprint.is-hidden {
    visibility: hidden;
}
</style>
