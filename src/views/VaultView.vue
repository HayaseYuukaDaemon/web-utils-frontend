<script setup lang="ts">
import { NCard, NAutoComplete, NSwitch, NButton, NInput, NFlex, useMessage, NAlert } from 'naive-ui';
import { ref } from 'vue'

const enableSpecialCharacters = ref(true)
const genetatedPassword = ref('text');

const configName = ref('');
const message = useMessage();

function copyToClipboard() {
    if (!navigator.clipboard) {
        message.error('需要使用HTTPS')
    } else {
        navigator.clipboard.writeText(genetatedPassword.value).then(() => {
            message.success('Copied to clipboard')
        }, (error) => {
            message.error('复制失败')
            console.error(error)
        })
    }
}

function handleGenerate() {
    genetatedPassword.value = genetatedPassword.value + "1";
    copyToClipboard()
}

const submitLoading = ref(false);
const deleteLoading = ref(false)

function saveConfig() {
    submitLoading.value = true
    try {
        message.info(configName.value)
    } finally {
        submitLoading.value = false;
    }
}

function deleteConfig() {
    deleteLoading.value = true;
    try {
        message.warning(configName.value)
    } finally {
        deleteLoading.value = false
    }
}

</script>

<template>
    <n-card title="vault" size="large">
        <n-flex vertical>
            <n-alert type="info" v-if="enableSpecialCharacters" closable>test</n-alert>
            <n-input placeholder="主密钥" clearable />
            <n-input placeholder="平台" clearable />
            <n-flex align="center" :size="16" :wrap="false">
                <n-switch v-model:value="enableSpecialCharacters" />
                <n-input class="field" placeholder="特殊字符集" :disabled="!enableSpecialCharacters" />
            </n-flex>

            <n-flex align="center" :wrap="false">
                <n-auto-complete v-model:value="configName" placeholder="配置" class="field" />
                <n-button type="success" @click="saveConfig" :loading="submitLoading">保存</n-button>
                <n-button type="error" @click="deleteConfig" :loading="deleteLoading">删除</n-button>
            </n-flex>
            <n-button type="primary" @click="handleGenerate">{{ genetatedPassword }}</n-button>
        </n-flex>
    </n-card>
</template>

<style scoped></style>