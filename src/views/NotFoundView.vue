<script setup lang="ts">
import { NResult, NButton } from 'naive-ui';
import router from '../router'

function backToPrevious() {
    router.back()
}
</script>

<template>
    <n-result status="404" title="404 资源不存在" description="生活总归带点荒谬">
        <template #footer>
            <n-button @click="backToPrevious">返回上一页</n-button>
        </template>
    </n-result>
</template>