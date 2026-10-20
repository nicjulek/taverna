import * as CANNON from 'cannon-es'
import * as THREE from 'three'
import { assignLabels, type DieShape, dieShape, topIndex } from './geometry'

export interface DieRequest {
  sides: number
  value: number
  dropped: boolean
  labels?: string[]
}

interface Frame {
  p: [number, number, number]
  q: [number, number, number, number]
}

const STEP = 1 / 60
const MAX_FRAMES = 60 * 5

function labelText(shape: DieShape, value: number, request: DieRequest): string {
  if (request.labels) return request.labels[value - 1] ?? String(value)
  if (shape.sides === 6 || shape.sides === 9) return String(value)
  return value === 6 || value === 9 ? `${value}.` : String(value)
}

interface Mark {
  text: string
  x: number
  y: number
  angle: number
  scale: number
}

function faceTexture(marks: Mark[], ink: string, size = 128): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = ink
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (const mark of marks) {
    ctx.save()
    ctx.translate(size / 2 + mark.x * size, size / 2 - mark.y * size)
    ctx.rotate(mark.angle)
    ctx.font = `700 ${size * mark.scale}px Alegreya, Georgia, serif`
    ctx.fillText(mark.text, 0, size * 0.03)
    ctx.restore()
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.anisotropy = 4
  return texture
}

function buildMesh(shape: DieShape, labels: number[], request: DieRequest, color: string, ink: string) {
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.1, flatShading: true })
  const mesh = new THREE.Mesh(shape.geometry, material)
  mesh.castShadow = true
  const disposables: { dispose: () => void }[] = [material]
  shape.faces.forEach((face, i) => {
    const corners = face.vertices.map((v) => shape.points[v]!)
    const inradius =
      Math.min(...corners.map((p) => p.distanceTo(face.center))) * (shape.byVertex ? 0.95 : face.vertices.length === 3 ? 0.62 : 0.78)
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(inradius * 2, inradius * 2),
      new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })
    )
    label.position.copy(face.center).addScaledVector(face.normal, 0.004)
    label.lookAt(face.center.clone().add(face.normal))
    label.updateMatrixWorld(true)
    const local = corners.map((corner) => label.worldToLocal(corner.clone()))
    let marks: Mark[]
    if (shape.byVertex) {
      marks = face.vertices.map((v, k) => {
        const { x, y } = local[k]!
        const length = Math.hypot(x, y)
        return {
          text: labelText(shape, labels[v]!, request),
          x: (x / length) * 0.3,
          y: (y / length) * 0.3,
          angle: Math.atan2(x, y),
          scale: 0.24
        }
      })
    } else {
      const text = labelText(shape, labels[i]!, request)
      let angle = 0
      if (face.vertices.length === 4 && shape.sides === 10) {
        const far = local.reduce((best, p) => (Math.hypot(p.x, p.y) > Math.hypot(best.x, best.y) ? p : best))
        angle = Math.atan2(far.x, far.y)
      }
      marks = [{ text, x: 0, y: 0, angle, scale: text.length > 2 ? 0.42 : 0.58 }]
    }
    const texture = faceTexture(marks, ink)
    ;(label.material as THREE.MeshBasicMaterial).map = texture
    mesh.add(label)
    disposables.push(texture, label.geometry, label.material as THREE.Material)
  })
  return { mesh, disposables }
}

function simulate(shapes: DieShape[], bounds: { w: number; h: number }) {
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -40, 0) })
  world.allowSleep = true
  const diceMaterial = new CANNON.Material('dado')
  const wallMaterial = new CANNON.Material('mesa')
  world.addContactMaterial(new CANNON.ContactMaterial(diceMaterial, wallMaterial, { friction: 0.3, restitution: 0.45 }))
  world.addContactMaterial(new CANNON.ContactMaterial(diceMaterial, diceMaterial, { friction: 0.2, restitution: 0.5 }))
  const plane = (position: CANNON.Vec3, axis: CANNON.Vec3, angle: number) => {
    const body = new CANNON.Body({ mass: 0, material: wallMaterial, shape: new CANNON.Plane() })
    body.position.copy(position)
    body.quaternion.setFromAxisAngle(axis, angle)
    world.addBody(body)
  }
  plane(new CANNON.Vec3(0, 0, 0), new CANNON.Vec3(1, 0, 0), -Math.PI / 2)
  plane(new CANNON.Vec3(-bounds.w, 0, 0), new CANNON.Vec3(0, 1, 0), Math.PI / 2)
  plane(new CANNON.Vec3(bounds.w, 0, 0), new CANNON.Vec3(0, 1, 0), -Math.PI / 2)
  plane(new CANNON.Vec3(0, 0, -bounds.h), new CANNON.Vec3(0, 1, 0), 0)
  plane(new CANNON.Vec3(0, 0, bounds.h), new CANNON.Vec3(0, 1, 0), Math.PI)

  const bodies = shapes.map((shape, i) => {
    const body = new CANNON.Body({
      mass: 1,
      material: diceMaterial,
      shape: new CANNON.ConvexPolyhedron({
        vertices: shape.points.map((p) => new CANNON.Vec3(p.x, p.y, p.z)),
        faces: shape.faces.map((f) => [...f.vertices])
      }),
      sleepSpeedLimit: 0.15,
      sleepTimeLimit: 0.3,
      angularDamping: 0.1,
      linearDamping: 0.05
    })
    const side = Math.random() < 0.5 ? -1 : 1
    body.position.set(side * bounds.w * 0.85, 3 + i * 1.6, (Math.random() - 0.5) * bounds.h)
    body.velocity.set(-side * (14 + Math.random() * 8), 2, (Math.random() - 0.5) * 10)
    body.angularVelocity.set((Math.random() - 0.5) * 30, (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 30)
    body.quaternion.setFromEuler(Math.random() * 6, Math.random() * 6, Math.random() * 6)
    world.addBody(body)
    return body
  })

  const frames: Frame[][] = bodies.map(() => [])
  for (let step = 0; step < MAX_FRAMES; step++) {
    world.step(STEP)
    bodies.forEach((body, i) =>
      frames[i]!.push({
        p: [body.position.x, body.position.y, body.position.z],
        q: [body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w]
      })
    )
    if (step > 30 && bodies.every((b) => b.sleepState === CANNON.Body.SLEEPING)) break
  }
  return frames
}

function inkFor(color: string): string {
  const c = new THREE.Color(color)
  const luminance = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b
  return luminance > 0.3 ? '#101a16' : '#f5efe2'
}

export interface PlayOptions {
  color: string
  ink?: string
  signal?: AbortSignal
}

export async function play(canvas: HTMLCanvasElement, requests: DieRequest[], options: PlayOptions): Promise<void> {
  const width = canvas.clientWidth || window.innerWidth
  const height = canvas.clientHeight || window.innerHeight
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio))
  renderer.setSize(width, height, false)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  const camera = new THREE.PerspectiveCamera(32, width / height, 1, 200)
  camera.position.set(0, 40, 0.01)
  camera.lookAt(0, 0, 0)
  const halfH = Math.tan(THREE.MathUtils.degToRad(16)) * 40
  const bounds = { w: halfH * (width / height) * 0.92, h: halfH * 0.92 }

  const scene = new THREE.Scene()
  scene.add(new THREE.AmbientLight(0xfff4e0, 0.9))
  const sun = new THREE.DirectionalLight(0xffffff, 1.6)
  sun.position.set(-8, 30, 10)
  sun.castShadow = true
  sun.shadow.mapSize.set(1024, 1024)
  const reach = Math.max(bounds.w, bounds.h)
  Object.assign(sun.shadow.camera, { left: -reach, right: reach, top: reach, bottom: -reach })
  scene.add(sun)
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(bounds.w * 2.4, bounds.h * 2.4), new THREE.ShadowMaterial({ opacity: 0.35 }))
  floor.rotation.x = -Math.PI / 2
  floor.receiveShadow = true
  scene.add(floor)

  const shapes = requests.map((r) => dieShape(r.sides === 100 ? 10 : r.sides, 1))
  const frames = simulate(shapes, bounds)
  const built = shapes.map((shape, i) => {
    const request = requests[i]!
    const last = frames[i]![frames[i]!.length - 1]!
    const top = topIndex(shape, new THREE.Quaternion(...last.q))
    const count = shape.byVertex ? shape.points.length : shape.faces.length
    const labels = assignLabels(count, top, request.value)
    const { mesh, disposables } = buildMesh(shape, labels, request, options.color, options.ink ?? inkFor(options.color))
    if (request.dropped) (mesh.material as THREE.MeshStandardMaterial).opacity = 0.45
    ;(mesh.material as THREE.MeshStandardMaterial).transparent = request.dropped
    scene.add(mesh)
    return { mesh, disposables }
  })

  const total = Math.max(...frames.map((f) => f.length))
  await new Promise<void>((resolve) => {
    const start = performance.now()
    const tick = (now: number) => {
      if (options.signal?.aborted) return resolve()
      const index = Math.max(0, Math.min(total - 1, Math.floor(((now - start) / 1000) * 60)))
      built.forEach(({ mesh }, i) => {
        const list = frames[i]!
        const frame = list[Math.min(index, list.length - 1)]!
        mesh.position.set(...frame.p)
        mesh.quaternion.set(...frame.q)
      })
      renderer.render(scene, camera)
      if (index < total - 1 || now - start < total * (1000 / 60) + 1400) requestAnimationFrame(tick)
      else resolve()
    }
    requestAnimationFrame(tick)
  })

  for (const { mesh, disposables } of built) {
    scene.remove(mesh)
    disposables.forEach((d) => d.dispose())
  }
  shapes.forEach((s) => s.geometry.dispose())
  floor.geometry.dispose()
  ;(floor.material as THREE.Material).dispose()
  renderer.dispose()
}
