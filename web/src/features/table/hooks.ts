import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  AssetDto,
  CreateSceneInput,
  SceneDto,
  SceneItemDto,
  SceneItemInput,
  SceneWithItemsDto,
  UpdateSceneInput,
  UpdateSceneItemInput
} from '@taverna/shared'
import { useEffect } from 'react'
import { api } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import { getSocket } from '@/lib/realtime'

export function useScenes(campaignId: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.scenes(campaignId),
    queryFn: () => api.get<SceneDto[]>(`/campaigns/${campaignId}/scenes`),
    enabled
  })
}

export function useSceneData(campaignId: string, sceneId: string | null, gm: boolean) {
  return useQuery({
    queryKey: sceneId && gm ? queryKeys.scene(campaignId, sceneId) : queryKeys.activeScene(campaignId),
    queryFn: () =>
      sceneId && gm
        ? api.get<SceneWithItemsDto>(`/campaigns/${campaignId}/scenes/${sceneId}`)
        : api.get<SceneWithItemsDto | null>(`/campaigns/${campaignId}/scenes/active`)
  })
}

export function useAssets(campaignId: string) {
  return useQuery({ queryKey: queryKeys.assets(campaignId), queryFn: () => api.get<AssetDto[]>(`/campaigns/${campaignId}/assets`) })
}

export function useUploadAsset(campaignId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return api.upload<AssetDto>(`/campaigns/${campaignId}/assets`, form)
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.assets(campaignId) })
  })
}

type SceneCache = SceneWithItemsDto | null | undefined

export function upsertItem(scene: SceneCache, item: SceneItemDto): SceneCache {
  if (!scene || scene.id !== item.sceneId) return scene
  const exists = scene.items.some((i) => i.id === item.id)
  const items = exists ? scene.items.map((i) => (i.id === item.id ? item : i)) : [...scene.items, item]
  return { ...scene, items: items.sort((a, b) => a.z - b.z) }
}

export function removeItem(scene: SceneCache, sceneId: string, id: string): SceneCache {
  if (!scene || scene.id !== sceneId) return scene
  return { ...scene, items: scene.items.filter((i) => i.id !== id) }
}

export function setExplored(scene: SceneCache, sceneId: string, explored: string | null): SceneCache {
  if (!scene || scene.id !== sceneId || scene.explored === explored) return scene
  return { ...scene, explored }
}

export function useSceneMutations(campaignId: string) {
  const queryClient = useQueryClient()
  const refreshList = () => void queryClient.invalidateQueries({ queryKey: queryKeys.scenes(campaignId) })
  const patchCaches = (fn: (scene: SceneCache) => SceneCache) => {
    queryClient.setQueriesData<SceneCache>({ queryKey: queryKeys.scenes(campaignId) }, (data) =>
      data && !Array.isArray(data) ? fn(data) : data
    )
  }

  const create = useMutation({
    mutationFn: (input: CreateSceneInput) => api.post<SceneDto>(`/campaigns/${campaignId}/scenes`, input),
    onSuccess: refreshList
  })
  const update = useMutation({
    mutationFn: ({ id, ...input }: UpdateSceneInput & { id: string }) =>
      api.patch<SceneDto>(`/campaigns/${campaignId}/scenes/${id}`, input),
    onMutate: async ({ id, ...input }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.scenes(campaignId) })
      patchCaches((scene) => (scene && scene.id === id ? { ...scene, ...input, settings: input.settings ?? scene.settings } : scene))
    },
    onSettled: refreshList
  })
  const activate = useMutation({
    mutationFn: (id: string) => api.post<SceneDto>(`/campaigns/${campaignId}/scenes/${id}/activate`),
    onSuccess: refreshList
  })
  const duplicate = useMutation({
    mutationFn: (id: string) => api.post<SceneDto>(`/campaigns/${campaignId}/scenes/${id}/duplicate`),
    onSuccess: refreshList
  })
  const remove = useMutation({ mutationFn: (id: string) => api.delete(`/campaigns/${campaignId}/scenes/${id}`), onSuccess: refreshList })

  const createItem = useMutation({
    mutationFn: ({ sceneId, ...input }: SceneItemInput & { sceneId: string }) =>
      api.post<SceneItemDto>(`/campaigns/${campaignId}/scenes/${sceneId}/items`, input),
    onSuccess: (item) => patchCaches((scene) => upsertItem(scene, item))
  })
  const updateItem = useMutation({
    mutationFn: ({ sceneId, id, ...input }: UpdateSceneItemInput & { sceneId: string; id: string }) =>
      api.patch<SceneItemDto>(`/campaigns/${campaignId}/scenes/${sceneId}/items/${id}`, input),
    onMutate: ({ sceneId, id, ...input }) =>
      patchCaches((scene) => {
        const current = scene?.items.find((i) => i.id === id)
        return current && scene?.id === sceneId
          ? upsertItem(scene, { ...current, ...input, data: { ...current.data, ...(input.data ?? {}) } })
          : scene
      }),
    onSuccess: (item) => patchCaches((scene) => upsertItem(scene, item)),
    onError: () => void queryClient.invalidateQueries({ queryKey: queryKeys.scenes(campaignId) })
  })
  const removeItemMutation = useMutation({
    mutationFn: ({ sceneId, id }: { sceneId: string; id: string }) => api.delete(`/campaigns/${campaignId}/scenes/${sceneId}/items/${id}`),
    onMutate: ({ sceneId, id }) => patchCaches((scene) => removeItem(scene, sceneId, id)),
    onError: () => void queryClient.invalidateQueries({ queryKey: queryKeys.scenes(campaignId) })
  })

  const door = useMutation({
    mutationFn: ({ sceneId, id, state }: { sceneId: string; id: string; state: 'open' | 'closed' }) =>
      api.post<SceneItemDto>(`/campaigns/${campaignId}/scenes/${sceneId}/items/${id}/door`, { state }),
    onMutate: ({ sceneId, id, state }) =>
      patchCaches((scene) => {
        const current = scene?.items.find((i) => i.id === id)
        return current && scene?.id === sceneId ? upsertItem(scene, { ...current, data: { ...current.data, state } }) : scene
      }),
    onSuccess: (item) => patchCaches((scene) => upsertItem(scene, item)),
    onError: () => void queryClient.invalidateQueries({ queryKey: queryKeys.scenes(campaignId) })
  })
  const explore = useMutation({
    mutationFn: ({ sceneId, cells }: { sceneId: string; cells: number[] }) =>
      api.post<{ explored: string | null }>(`/campaigns/${campaignId}/scenes/${sceneId}/explored`, { cells }),
    onSuccess: ({ explored }, { sceneId }) => patchCaches((scene) => setExplored(scene, sceneId, explored))
  })
  const resetExplored = useMutation({
    mutationFn: (sceneId: string) => api.delete(`/campaigns/${campaignId}/scenes/${sceneId}/explored`),
    onSuccess: (_, sceneId) => patchCaches((scene) => setExplored(scene, sceneId, null))
  })

  return {
    create,
    update,
    activate,
    duplicate,
    remove,
    createItem,
    updateItem,
    removeItem: removeItemMutation,
    door,
    explore,
    resetExplored
  }
}

export function useSceneFeed(campaignId: string) {
  const queryClient = useQueryClient()
  useEffect(() => {
    const socket = getSocket()
    const patch = (fn: (scene: SceneCache) => SceneCache) =>
      queryClient.setQueriesData<SceneCache>({ queryKey: queryKeys.scenes(campaignId) }, (data) =>
        data && !Array.isArray(data) ? fn(data) : data
      )
    const onItem = ({ campaignId: id, item }: { campaignId: string; item: SceneItemDto }) =>
      id === campaignId && patch((scene) => upsertItem(scene, item))
    const onRemoved = ({ campaignId: id, sceneId, id: itemId }: { campaignId: string; sceneId: string; id: string }) =>
      id === campaignId && patch((scene) => removeItem(scene, sceneId, itemId))
    const onList = ({ campaignId: id }: { campaignId: string }) =>
      id === campaignId && void queryClient.invalidateQueries({ queryKey: queryKeys.scenes(campaignId) })
    const onExplored = ({ campaignId: id, sceneId, explored }: { campaignId: string; sceneId: string; explored: string | null }) =>
      id === campaignId && patch((scene) => setExplored(scene, sceneId, explored))
    socket.on('scene:explored', onExplored)
    socket.on('scene:item', onItem)
    socket.on('scene:item:removed', onRemoved)
    socket.on('scene:list', onList)
    socket.on('scene:active', onList)
    return () => {
      socket.off('scene:explored', onExplored)
      socket.off('scene:item', onItem)
      socket.off('scene:item:removed', onRemoved)
      socket.off('scene:list', onList)
      socket.off('scene:active', onList)
    }
  }, [campaignId, queryClient])
}
