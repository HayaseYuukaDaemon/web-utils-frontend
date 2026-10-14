<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue'
import {
    NButton,
    NButtonGroup,
    NEmpty,
    NImage,
    NLayout,
    NLayoutContent,
    NLayoutFooter,
    NMenu,
    NResult,
    NSpace,
    NSpin,
    NTag,
    useMessage,
    type MenuOption
} from 'naive-ui'

// 数据接口与原 dataset.html 保持一致，使用同源相对路径。
interface ImageInfo {
    pid: number | string
    page_index: number
    image_url: string
}

interface DatasetStats {
    total_images: number
}

interface JudgeResult {
    success: boolean
}

const FOOTER_HEIGHT = 72
const PREFETCH_COUNT = 5
const message = useMessage();

const currentImage = shallowRef<ImageInfo | null>(null)
const currentOffset = ref(0)
const stats = shallowRef<DatasetStats | null>(null)
const loading = ref(false)
const judging = ref(false)
const imageBroken = ref(false)
const imageReady = ref(false)
const imageVersion = ref(0)
const loadError = ref('')
const busy = computed(() => loading.value || judging.value)

const navOptions = computed<MenuOption[]>(() => [
    { key: 'previous', label: '← 上一张', disabled: busy.value || currentOffset.value === 0 || !currentImage.value },
    { key: 'refresh', label: '刷新', disabled: busy.value },
    { key: 'skip', label: '跳过 →', disabled: busy.value || !currentImage.value }
])

// offset 是“待评分队列中的位置”，不是稳定的图片 ID。
// 因而评分成功后必须清除 offset -> 图片信息的缓存。
const imageInfoCache = new Map<number, Promise<ImageInfo>>()
const preloadCache = new Map<string, Promise<boolean>>()
const prefetched = new Map<number, ImageInfo>()
let activeLoadToken = 0
let prefetchGeneration = 0
let disposed = false

function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error)
}

async function fetchImageInfo(offset: number): Promise<ImageInfo> {
    const cached = imageInfoCache.get(offset)
    if (cached) return cached

    const request = (async () => {
        const response = await fetch(`/dataset/image/info/offset/${offset}`)
        if (!response.ok) {
            if (response.status === 404) throw new Error('没有更多待评分图片')
            throw new Error(`查询图片失败：HTTP ${response.status}`)
        }
        const data = (await response.json()) as ImageInfo
        if (!data || !data.image_url) throw new Error('服务器返回的图片信息无效')
        return data
    })()

    imageInfoCache.set(offset, request)
    // 防止缓存无限增长；失败的请求也不能永久留在缓存中。
    if (imageInfoCache.size > 30) {
        const oldestKey = imageInfoCache.keys().next().value
        if (oldestKey !== undefined) imageInfoCache.delete(oldestKey)
    }
    void request.catch(() => {
        if (imageInfoCache.get(offset) === request) imageInfoCache.delete(offset)
    })
    return request
}

function preloadImage(url: string): Promise<boolean> {
    const cached = preloadCache.get(url)
    if (cached) return cached

    const request = new Promise<boolean>((resolve) => {
        const image = new Image()
        image.decoding = 'async'
        image.onload = () => resolve(true)
        image.onerror = () => resolve(false)
        image.src = url
    })

    preloadCache.set(url, request)
    if (preloadCache.size > 30) {
        const oldestKey = preloadCache.keys().next().value
        if (oldestKey !== undefined) preloadCache.delete(oldestKey)
    }
    void request.then((ok) => {
        if (!ok && preloadCache.get(url) === request) preloadCache.delete(url)
    })
    return request
}

function prefetchFollowing(baseOffset: number) {
    const generation = ++prefetchGeneration
    prefetched.clear()

    for (let distance = 1; distance <= PREFETCH_COUNT; distance++) {
        const offset = baseOffset + distance
        void (async () => {
            try {
                const info = await fetchImageInfo(offset)
                const loaded = await preloadImage(info.image_url)
                if (!disposed && generation === prefetchGeneration && loaded) {
                    // 始终按原 offset 保存，不能过滤后把 offset=2 当成 offset=1。
                    prefetched.set(offset, info)
                }
            } catch {
                // 队列不足 5 张、网络错误等都不影响当前图片的展示。
            }
        })()
    }
}

function invalidateQueueCache() {
    ++prefetchGeneration
    prefetched.clear()
    imageInfoCache.clear()
    // 图片 URL 缓存不必清除：已下载的图片仍可能被浏览器复用。
}

function displayImage(info: ImageInfo, offset: number) {
    currentImage.value = info
    currentOffset.value = offset
    imageBroken.value = false
    imageReady.value = false
    loadError.value = ''
    ++imageVersion.value
    prefetchFollowing(offset)
}

async function loadImage(offset = 0): Promise<void> {
    if (offset < 0) return
    const token = ++activeLoadToken
    loading.value = true
    loadError.value = ''

    try {
        const info = await fetchImageInfo(offset)
        if (token !== activeLoadToken || disposed) return
        displayImage(info, offset)
    } catch (error) {
        if (token !== activeLoadToken || disposed) return
        loadError.value = errorMessage(error)
        if (currentImage.value) message.error(loadError.value)
    } finally {
        if (token === activeLoadToken) loading.value = false
    }
}

async function loadStats(): Promise<void> {
    try {
        const response = await fetch('/dataset/stats')
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const result = (await response.json()) as DatasetStats
        if (!disposed) stats.value = result
    } catch (error) {
        if (!disposed) message.warning(`统计信息加载失败：${errorMessage(error)}`)
    }
}

async function submitScore(score: 0 | 1 | 2 | 3): Promise<void> {
    if (busy.value || !currentImage.value || !imageReady.value) return

    const info = currentImage.value
    const oldOffset = currentOffset.value
    judging.value = true

    try {
        const response = await fetch('/dataset/judge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                pid: info.pid,
                page_index: info.page_index,
                score
            })
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const result = (await response.json()) as JudgeResult
        if (!result.success) throw new Error('服务器未确认评分成功')

        const scoreLabels = ['讨厌', '中性', '有点感觉', '非常喜欢']
        message.success(`评分成功：${scoreLabels[score]}`)

        // 当评的是 offset=0，旧 offset=1 在队列删除首项后通常变为新 offset=0。
        // 只有它确实已经预加载完成，才复用这张图片。
        const nextImage = oldOffset === 0 ? prefetched.get(1) : undefined
        invalidateQueueCache()
        ++activeLoadToken
        currentImage.value = null
        currentOffset.value = 0
        imageBroken.value = false
        imageReady.value = false

        if (nextImage) displayImage(nextImage, 0)
        else await loadImage(0)
        void loadStats()
    } catch (error) {
        message.error(`评分失败：${errorMessage(error)}`)
    } finally {
        judging.value = false
    }
}

function refresh() {
    if (busy.value) return
    invalidateQueueCache()
    void loadStats()
    void loadImage(0)
}

function navigate(offset: number) {
    if (!busy.value && offset >= 0) void loadImage(offset)
}

function handleMenuSelect(key: string | number) {
    switch (key) {
        case 'previous': navigate(currentOffset.value - 1); break
        case 'skip': navigate(currentOffset.value + 1); break
        case 'refresh': refresh(); break
    }
}

function onImageError() {
    imageBroken.value = true
    imageReady.value = false
    message.error('图片加载失败')
}

function retryImage() {
    imageBroken.value = false
    imageReady.value = false
    ++imageVersion.value
}

function onKeyDown(event: KeyboardEvent) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.repeat) return
    const target = event.target
    if (target instanceof HTMLElement &&
        (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return

    // 预览打开时，将快捷键交给 NImage 的预览层，避免误评分。
    if (document.querySelector('.n-image-preview-container')) return
    if (busy.value) return

    if (['1', '2', '3', '4'].includes(event.key)) {
        event.preventDefault()
        void submitScore((Number(event.key) - 1) as 0 | 1 | 2 | 3)
    } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        navigate(currentOffset.value - 1)
    } else if (event.key === 'ArrowRight' || event.code === 'Space') {
        event.preventDefault()
        navigate(currentOffset.value + 1)
    }
}

onMounted(() => {
    disposed = false
    window.addEventListener('keydown', onKeyDown)
    void loadStats()
    void loadImage(0)
})

onUnmounted(() => {
    disposed = true
    ++activeLoadToken
    ++prefetchGeneration
    window.removeEventListener('keydown', onKeyDown)
})
</script>

<template>
    <!-- 固定到视口，避免 Vue/Vite 模板中 #app 的 max-width 和 padding 影响布局。 -->
    <n-layout position="absolute" :style="{ position: 'fixed', inset: 0 }">
        <n-layout-content position="absolute" :native-scrollbar="true"
            :style="{ bottom: `${FOOTER_HEIGHT}px`, backgroundColor: '#111' }" :content-style="{
                width: '100%',
                height: '100%',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
            }">
            <n-image v-if="currentImage && !imageBroken" :key="`${currentImage.image_url}#${imageVersion}`"
                :src="currentImage.image_url" alt="Pixiv 图片" object-fit="contain"
                :img-props="{ style: { width: '100%', height: '100%', display: 'block' } }"
                :style="{ width: '100%', height: '100%', display: 'block' }" @load="imageReady = true"
                @error="onImageError" />

            <n-result v-else-if="imageBroken" status="error" title="图片加载失败" description="图片 URL 无法访问">
                <template #footer>
                    <n-button @click="retryImage">重试加载</n-button>
                </template>
            </n-result>

            <n-empty v-else-if="!loading" :description="loadError || '暂无待评分图片'">
                <template #extra>
                    <n-button @click="refresh">重新获取</n-button>
                </template>
            </n-empty>

            <n-spin v-if="loading" size="large" :style="{
                position: 'absolute',
                top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 2
            }" />

            <n-space v-if="currentImage" align="center" :wrap="false"
                :style="{ position: 'absolute', left: '12px', top: '12px', zIndex: 1 }">
                <n-tag :bordered="false">PID {{ currentImage.pid }}</n-tag>
                <n-tag :bordered="false">Page {{ currentImage.page_index }}</n-tag>
                <n-tag :bordered="false">Offset {{ currentOffset }}</n-tag>
            </n-space>
        </n-layout-content>

        <n-layout-footer bordered position="absolute" :style="{
            height: `${FOOTER_HEIGHT}px`,
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            overflowX: 'auto',
            overflowY: 'hidden',
            whiteSpace: 'nowrap'
        }">
            <n-menu mode="horizontal" :value="null" :options="navOptions" @update:value="handleMenuSelect" />

            <n-button-group>
                <n-button type="error" :disabled="busy || !imageReady" @click="submitScore(0)">1 讨厌</n-button>
                <n-button :disabled="busy || !imageReady" @click="submitScore(1)">2 中性</n-button>
                <n-button type="info" :disabled="busy || !imageReady" @click="submitScore(2)">3 有点感觉</n-button>
                <n-button type="success" :disabled="busy || !imageReady" @click="submitScore(3)">4 非常喜欢</n-button>
            </n-button-group>


        </n-layout-footer>
    </n-layout>
</template>
