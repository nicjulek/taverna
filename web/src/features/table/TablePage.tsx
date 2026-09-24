import { isGameMaster, type AssetDto, type LightPreset, type SceneItemDto, type SceneItemInput, type SceneLayer } from '@taverna/shared'
import { calibrate, type Point, type TemplateKind, type WallType } from '@taverna/tabletop'
import { Crosshair, Map as MapIcon, Maximize } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button, EmptyState, Skeleton } from '@/components/ui'
import { cn } from '@/lib/cn'
import { useSession } from '@/lib/session'
import { useCampaignContext } from '../campaigns/context'
import { useCharacters } from '../characters/hooks'
import { Gallery } from './Gallery'
import { readNatural, useUploadFiles } from './upload'
import { useSceneData, useSceneFeed, useSceneMutations, useScenes } from './hooks'
import { ItemInspector, SceneSettingsPanel } from './Inspector'
import { canEdit, type DrawStyle, mediaItem, PLAYER_TOOLS, type Tool, tokenItem } from './items'
import { PlaceDialog, type PlaceKind, type PlaceValues } from './PlaceDialog'
import { ScenesPanel } from './ScenesPanel'
import { TableCanvas, type View } from './TableCanvas'
import { Toolbar } from './Toolbar'
import { useVision } from './vision'
import { CombatTracker } from '../combat/CombatTracker'
import { useCombat, useCombatFeed } from '../combat/hooks'
import { monsterToken } from '../combat/stats'
import { compendiumEntryQuery } from '../compendium/hooks'
import { useQueryClient } from '@tanstack/react-query'

const ALL_VISIBLE: Record<SceneLayer, boolean> = { map: true, objects: true, tokens: true, gm: true }

function typing(target: EventTarget | null) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable) ||
    document.querySelector('[role="dialog"]') !== null
  )
}

export function TablePage() {
  const { campaign } = useCampaignContext()
  const session = useSession()
  const me = session.data?.id ?? ''
  const gm = isGameMaster(campaign.role)
  useSceneFeed(campaign.id)

  const scenes = useScenes(campaign.id, gm)
  const [picked, setPicked] = useState<string | null>(null)
  const currentId = gm ? (picked ?? scenes.data?.find((s) => s.active)?.id ?? scenes.data?.[0]?.id ?? null) : null
  const sceneQuery = useSceneData(campaign.id, currentId, gm)
  const scene = sceneQuery.data ?? null
  const mutations = useSceneMutations(campaign.id)
  const characters = useCharacters(campaign.id)
  const upload = useUploadFiles(campaign.id)

  const [tool, setTool] = useState<Tool>('select')
  const [layer, setLayer] = useState<SceneLayer>(gm ? 'map' : 'tokens')
  const [visibleLayers, setVisibleLayers] = useState(ALL_VISIBLE)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [style, setStyle] = useState<DrawStyle>({ stroke: '#d6a446', fill: 'transparent', strokeWidth: 4 })
  const [template, setTemplate] = useState<{ kind: TemplateKind; size: number }>({ kind: 'sphere', size: 6 })
  const [view, setView] = useState<View>({ x: 24, y: 24, scale: 0.6 })
  const [placing, setPlacing] = useState<{ kind: PlaceKind; at: Point } | null>(null)
  const [gallery, setGallery] = useState(false)
  const [wallType, setWallType] = useState<WallType>('wall')
  const [lightPreset, setLightPreset] = useState<LightPreset>('torch')
  const [preview, setPreview] = useState(false)
  const [targets, setTargets] = useState<Set<string>>(() => new Set())
  useCombatFeed(campaign.id)
  const queryClient = useQueryClient()
  const combat = useCombat(campaign.id)
  const toggleTarget = useCallback(
    (id: string) =>
      setTargets((current) => {
        const next = new Set(current)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      }),
    []
  )
  const wrapper = useRef<HTMLDivElement>(null)
  const vision = useVision(sceneQuery.data ?? null, gm, me, preview)
  const exploreMutate = mutations.explore.mutate
  const seenKey = vision?.seen.join(',') ?? ''
  const seenScene = sceneQuery.data?.id ?? null
  const seenRef = useRef<number[]>([])
  useEffect(() => {
    seenRef.current = vision?.seen ?? []
  }, [vision])
  useEffect(() => {
    if (gm || !seenScene || !seenKey) return
    const timer = window.setTimeout(() => exploreMutate({ sceneId: seenScene, cells: seenRef.current }), 500)
    return () => window.clearTimeout(timer)
  }, [gm, seenScene, seenKey, exploreMutate])

  const sceneId = scene?.id ?? null
  const selected = scene?.items.find((item) => item.id === selectedId) ?? null
  const grid = useMemo(
    () =>
      scene
        ? {
            type: scene.settings.grid.type,
            size: scene.settings.grid.size,
            offsetX: scene.settings.grid.offsetX,
            offsetY: scene.settings.grid.offsetY
          }
        : null,
    [scene]
  )

  const fit = useCallback(() => {
    const box = wrapper.current?.getBoundingClientRect()
    if (!box || !scene) return
    const width = scene.settings.width * scene.settings.grid.size
    const height = scene.settings.height * scene.settings.grid.size
    const scale = Math.min(4, Math.max(0.15, Math.min(box.width / width, box.height / height) * 0.96))
    setView({ scale, x: (box.width - width * scale) / 2, y: (box.height - height * scale) / 2 })
  }, [scene])
  const fitRef = useRef(fit)
  useEffect(() => {
    fitRef.current = fit
  }, [fit])

  useEffect(() => {
    setSelectedId(null)
    if (sceneId) requestAnimationFrame(() => fitRef.current())
  }, [sceneId])

  const fail = useCallback((error: Error) => toast.error(error.message), [])
  const create = useCallback(
    (item: SceneItemInput) => {
      if (!sceneId) return
      const layerFor = gm ? item.layer : item.layer === 'tokens' ? 'tokens' : 'objects'
      mutations.createItem.mutate(
        { ...item, layer: layerFor, sceneId },
        { onSuccess: (created) => setSelectedId(created.id), onError: fail }
      )
    },
    [sceneId, gm, mutations.createItem, fail]
  )
  const update = useCallback(
    (id: string, patch: Partial<SceneItemDto>) => {
      if (!sceneId) return
      const { id: _id, sceneId: _scene, createdBy: _by, updatedAt: _at, ...rest } = patch
      mutations.updateItem.mutate({ ...rest, sceneId, id }, { onError: fail })
    },
    [sceneId, mutations.updateItem, fail]
  )
  const remove = useCallback(
    (id: string) => {
      if (!sceneId) return
      mutations.removeItem.mutate({ sceneId, id }, { onError: fail })
      setSelectedId((current) => (current === id ? null : current))
    },
    [sceneId, mutations.removeItem, fail]
  )

  const viewCenter = (): Point => {
    const box = wrapper.current?.getBoundingClientRect()
    const w = box?.width ?? 800
    const h = box?.height ?? 600
    return { x: (w / 2 - view.x) / view.scale, y: (h / 2 - view.y) / view.scale }
  }

  const placeAsset = async (asset: AssetDto, at: Point) => {
    const natural = await readNatural(asset)
    create(mediaItem(asset.mime.startsWith('video/') ? 'video' : 'image', asset.id, at, natural, asset.name))
  }

  const confirmPlace = (values: PlaceValues) => {
    if (!placing || !grid) return
    const { kind, at } = placing
    setPlacing(null)
    if (kind === 'token') {
      const base = tokenItem(at, grid, { name: values.text, color: values.color, span: values.span, characterId: values.characterId })
      const ownerId = characters.data?.find((c) => c.id === values.characterId)?.ownerId ?? null
      if (values.compendiumId) {
        void queryClient
          .fetchQuery(compendiumEntryQuery(campaign.id, values.compendiumId))
          .then((entry) => {
            const monster = monsterToken(entry)
            create({ ...base, ownerId, data: { ...base.data, ...monster.data } })
          })
          .catch(() => toast.error('Não deu para ler a criatura do compêndio'))
      } else create({ ...base, ownerId })
    } else if (kind === 'marker') {
      const size = Math.round(grid.size * 0.8)
      create({
        layer,
        kind: 'marker',
        x: at.x - size / 2,
        y: at.y - size / 2,
        width: size,
        height: size,
        data: { label: values.text, color: values.color }
      })
    } else {
      create({
        layer,
        kind: 'text',
        x: at.x,
        y: at.y - 18,
        width: 420,
        height: 40,
        data: { text: values.text, fontSize: 28, color: values.color }
      })
    }
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (typing(event.target) || !scene || !grid) return
      if (event.key === 'Escape') {
        setSelectedId(null)
        if (tool !== 'select') setTool('select')
        return
      }
      if (!selected || !canEdit(selected, gm, me)) return
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        remove(selected.id)
        return
      }
      const step = event.shiftKey ? 1 : grid.size
      const delta = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[event.key]
      if (delta) {
        event.preventDefault()
        update(selected.id, { x: selected.x + delta[0]!, y: selected.y + delta[1]! })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [scene, grid, selected, gm, me, tool, remove, update])

  if (sceneQuery.isPending || (gm && scenes.isPending)) {
    return <Skeleton className="h-[70dvh] w-full" />
  }

  const sidebar = gm && scenes.data && (
    <ScenesPanel
      campaignId={campaign.id}
      scenes={scenes.data}
      currentId={currentId}
      onPick={(id) => {
        setPicked(id)
      }}
    />
  )

  if (!scene || !grid) {
    return (
      <div className="flex flex-col gap-6 lg:flex-row">
        {sidebar && <aside className="lg:w-64">{sidebar}</aside>}
        <EmptyState
          title={gm ? 'Nenhuma cena ainda' : 'A mesa ainda está vazia'}
          art={<MapIcon className="size-10 text-brass" aria-hidden />}
        >
          {gm ? 'Crie a primeira cena e coloque um mapa nela.' : 'Quando o mestre abrir uma cena, ela aparece aqui na hora.'}
        </EmptyState>
      </div>
    )
  }

  const tokens = scene.items.filter(
    (item) => item.kind === 'token' && (gm || item.layer !== 'gm') && (!vision?.active || vision.visibleTokens.has(item.id))
  )
  const blind = !gm && vision?.active && vision.viewers.length === 0

  return (
    <div className="flex flex-col gap-4 xl:grid xl:grid-cols-[15rem_minmax(0,1fr)_18rem]">
      {sidebar && <aside className="max-xl:order-2">{sidebar}</aside>}
      {!gm && <span className="hidden xl:block" aria-hidden />}

      <section aria-label={`Mesa: ${scene.name}`} className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="font-display text-3xl">{scene.name}</h1>
          <p className="text-sm text-moss">
            {scene.settings.width} × {scene.settings.height} quadrados · cada um vale {scene.settings.scale.value.toLocaleString('pt-BR')}{' '}
            {scene.settings.scale.unit === 'm' ? 'm' : 'pés'}
          </p>
        </div>
        <Toolbar
          gm={gm}
          tool={tool}
          onTool={(next) => {
            setTool(next)
            if (next === 'calibrate') toast('Arraste sobre uma célula da grade desenhada no mapa selecionado.')
          }}
          layer={layer}
          onLayer={setLayer}
          visibleLayers={visibleLayers}
          onToggleLayer={(value) => setVisibleLayers((v) => ({ ...v, [value]: !v[value] }))}
          style={style}
          onStyle={setStyle}
          template={template}
          onTemplate={setTemplate}
          unit={scene.settings.scale.unit === 'm' ? 'm' : 'pés'}
          onGallery={() => setGallery(true)}
          wallType={wallType}
          onWallType={setWallType}
          lightPreset={lightPreset}
          onLightPreset={setLightPreset}
          visionOn={scene.settings.lighting.vision}
          preview={preview}
          onPreview={setPreview}
        />
        <div
          ref={wrapper}
          className={cn(
            'relative h-[min(62dvh,100vw)] min-h-72 overflow-hidden sm:h-[62dvh] rounded-panel border border-line-strong bg-felt-deep xl:h-[calc(100dvh-15rem)]',
            tool === 'pan' ? 'cursor-grab' : tool === 'select' ? 'cursor-default' : 'cursor-crosshair'
          )}
        >
          <TableCanvas
            scene={scene}
            gm={gm}
            me={me}
            tool={gm || PLAYER_TOOLS.includes(tool) ? tool : 'select'}
            layer={layer}
            visibleLayers={gm ? visibleLayers : { ...ALL_VISIBLE, gm: false }}
            selectedId={selectedId}
            style={style}
            template={template}
            view={view}
            onView={setView}
            onSelect={setSelectedId}
            onCreate={create}
            onUpdate={update}
            onRemove={remove}
            onCalibrate={(cell) => {
              const target = selected && (selected.kind === 'image' || selected.kind === 'video') ? selected : null
              if (!target) {
                toast.error('Selecione o mapa antes de calibrar.')
                return
              }
              update(target.id, calibrate(target, cell, grid))
              setTool('select')
              toast('Mapa ajustado à grade.')
            }}
            onPlace={(kind, at) => setPlacing({ kind, at })}
            vision={vision}
            wallType={wallType}
            lightPreset={lightPreset}
            onDoor={(id, state) => mutations.door.mutate({ sceneId: scene.id, id, state }, { onError: fail })}
            onBlocked={() => toast.error('Uma parede bloqueia o caminho')}
            turnTokenId={
              combat.data?.sceneId === scene.id ? (combat.data.combatants.find((c) => c.id === combat.data!.turnId)?.tokenId ?? null) : null
            }
            targets={targets}
            onTarget={toggleTarget}
            onDropFiles={async (files, at) => {
              const sent = await upload.run(files)
              for (const [index, asset] of sent.entries())
                await placeAsset(asset, { x: at.x + index * grid.size, y: at.y + index * grid.size })
            }}
          />
          <Button size="sm" variant="secondary" onClick={fit} className="absolute top-3 right-3">
            <Maximize /> Ver a cena toda
          </Button>
          {blind && (
            <p role="status" className="absolute bottom-3 left-3 max-w-sm rounded-control bg-surface/90 px-3 py-1.5 text-sm">
              Você ainda não tem um token nesta cena. Peça ao mestre para colocar o seu.
            </p>
          )}
          {upload.pending && (
            <p role="status" className="absolute bottom-3 left-3 rounded-control bg-surface/90 px-3 py-1.5 text-sm">
              Enviando mapa…
            </p>
          )}
        </div>
        <p className="text-sm text-moss-dim max-sm:hidden">
          Roda do mouse aproxima · Espaço + arrastar move a vista · Shift mantém a proporção · Setas movem um quadrado · Delete apaga
          {gm && ' · Arraste imagens ou vídeos do computador para a mesa'}
        </p>
      </section>

      <aside className="flex flex-col gap-4 rounded-panel border border-line bg-surface/60 p-4 max-xl:order-3" aria-label="Detalhes">
        <CombatTracker
          campaignId={campaign.id}
          scene={scene}
          gm={gm}
          me={me}
          selectedId={selectedId}
          onSelect={(id) => {
            setTool('select')
            setSelectedId(id)
          }}
        />
        {selected ? (
          <ItemInspector
            item={selected}
            scene={scene}
            gm={gm}
            me={me}
            onUpdate={(patch) => update(selected.id, patch)}
            onRemove={() => remove(selected.id)}
            members={campaign.memberList}
            campaignId={campaign.id}
            target={scene.items.find((i) => targets.has(i.id) && i.id !== selected.id) ?? null}
            onCalibrate={() => {
              setTool('calibrate')
              toast('Arraste sobre uma célula da grade desenhada no mapa.')
            }}
          />
        ) : gm ? (
          <SceneSettingsPanel
            settings={scene.settings}
            onChange={(settings) => mutations.update.mutate({ id: scene.id, settings }, { onError: fail })}
            onResetExplored={() =>
              mutations.resetExplored.mutate(scene.id, { onSuccess: () => toast('A névoa voltou a cobrir a cena.'), onError: fail })
            }
          />
        ) : (
          <p className="text-sm text-moss">
            Clique em algo na mesa para ver os detalhes. Você pode desenhar, medir e marcar áreas nas camadas de objetos e tokens.
          </p>
        )}
        <section aria-label="Tokens na cena" className="border-t border-line pt-3">
          <h2 className="mb-2 text-sm font-medium text-moss">Tokens na cena</h2>
          {tokens.length === 0 ? (
            <p className="text-sm text-moss-dim">Nenhum token por aqui.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {tokens.map((token) => (
                <li key={token.id} className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-pressed={token.id === selectedId}
                    onClick={() => {
                      setTool('select')
                      setSelectedId(token.id)
                    }}
                    className={cn(
                      'flex min-w-0 flex-1 items-center gap-2 rounded-control px-2 py-1.5 text-left text-sm hover:bg-surface-raised',
                      token.id === selectedId && 'bg-surface-raised'
                    )}
                  >
                    <span className="size-3 rounded-full" style={{ background: String(token.data.color ?? '#c58b3a') }} aria-hidden />
                    {String(token.data.name ?? 'Token')}
                    {token.layer === 'gm' && <span className="text-moss-dim">(oculto)</span>}
                  </button>
                  <button
                    type="button"
                    aria-pressed={targets.has(token.id)}
                    aria-label={`Mirar em ${String(token.data.name ?? 'Token')}`}
                    title="Marcar como alvo"
                    onClick={() => toggleTarget(token.id)}
                    className={cn(
                      'grid size-8 shrink-0 place-items-center rounded-control text-moss-dim hover:text-bone',
                      targets.has(token.id) && 'text-[#e07a66]'
                    )}
                  >
                    <Crosshair className="size-4" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>

      {gm && (
        <Gallery
          campaignId={campaign.id}
          open={gallery}
          onOpenChange={setGallery}
          onPick={(asset) => {
            setGallery(false)
            void placeAsset(asset, viewCenter())
          }}
        />
      )}
      <PlaceDialog
        campaignId={campaign.id}
        gm={gm}
        kind={placing?.kind ?? null}
        characters={characters.data ?? []}
        color={style.stroke}
        onCancel={() => setPlacing(null)}
        onConfirm={confirmPlace}
      />
    </div>
  )
}
