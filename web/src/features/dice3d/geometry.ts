import * as THREE from 'three'

export interface Face {
  normal: THREE.Vector3
  center: THREE.Vector3
  vertices: number[]
}

export interface DieShape {
  sides: number
  geometry: THREE.BufferGeometry
  points: THREE.Vector3[]
  faces: Face[]
  byVertex: boolean
}

function trapezohedron(radius: number): THREE.BufferGeometry {
  const top = new THREE.Vector3(0, radius * 0.99457, 0)
  const bottom = new THREE.Vector3(0, -radius * 0.99457, 0)
  const h = radius * 0.105
  const ring = Array.from({ length: 10 }, (_, i) => {
    const a = (i * Math.PI) / 5
    return new THREE.Vector3(Math.cos(a) * radius, i % 2 === 0 ? h : -h, Math.sin(a) * radius)
  })
  const positions: number[] = []
  const push = (...vs: THREE.Vector3[]) => vs.forEach((v) => positions.push(v.x, v.y, v.z))
  for (let i = 0; i < 10; i += 2) {
    const a = ring[i]!
    const b = ring[(i + 1) % 10]!
    const c = ring[(i + 2) % 10]!
    push(top, b, a, top, c, b)
    const d = ring[(i + 1) % 10]!
    const e = ring[(i + 2) % 10]!
    const f = ring[(i + 3) % 10]!
    push(bottom, d, e, bottom, e, f)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.computeVertexNormals()
  return geometry
}

function base(sides: number, size: number): THREE.BufferGeometry {
  switch (sides) {
    case 4:
      return new THREE.TetrahedronGeometry(size * 1.2)
    case 6:
      return new THREE.BoxGeometry(size * 1.5, size * 1.5, size * 1.5)
    case 8:
      return new THREE.OctahedronGeometry(size * 1.05)
    case 10:
      return trapezohedron(size)
    case 12:
      return new THREE.DodecahedronGeometry(size * 1.05)
    default:
      return new THREE.IcosahedronGeometry(size * 1.1)
  }
}

export function dieShape(sides: number, size = 1): DieShape {
  const raw = base(sides, size)
  const geometry = raw.index ? raw.toNonIndexed() : raw
  const position = geometry.getAttribute('position')
  const points: THREE.Vector3[] = []
  const key = (v: THREE.Vector3) => `${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}`
  const index = new Map<string, number>()
  const vertexOf = (v: THREE.Vector3) => {
    const k = key(v)
    let i = index.get(k)
    if (i === undefined) {
      i = points.length
      points.push(v.clone())
      index.set(k, i)
    }
    return i
  }
  const groups: { normal: THREE.Vector3; vertices: Set<number> }[] = []
  const a = new THREE.Vector3()
  const b = new THREE.Vector3()
  const c = new THREE.Vector3()
  for (let i = 0; i < position.count; i += 3) {
    a.fromBufferAttribute(position, i)
    b.fromBufferAttribute(position, i + 1)
    c.fromBufferAttribute(position, i + 2)
    const normal = new THREE.Vector3().subVectors(c, b).cross(new THREE.Vector3().subVectors(a, b)).normalize()
    if (normal.dot(new THREE.Vector3().add(a).add(b).add(c)) < 0) normal.negate()
    let group = groups.find((g) => g.normal.dot(normal) > 0.995)
    if (!group) {
      group = { normal, vertices: new Set<number>() }
      groups.push(group)
    }
    group.vertices.add(vertexOf(a))
    group.vertices.add(vertexOf(b))
    group.vertices.add(vertexOf(c))
  }
  const faces: Face[] = groups.map(({ normal, vertices }) => {
    const list = [...vertices]
    const center = list.reduce((acc, i) => acc.add(points[i]!), new THREE.Vector3()).divideScalar(list.length)
    const u = new THREE.Vector3().subVectors(points[list[0]!]!, center).normalize()
    const w = new THREE.Vector3().crossVectors(normal, u)
    const angle = (i: number) => {
      const d = new THREE.Vector3().subVectors(points[i]!, center)
      return Math.atan2(d.dot(w), d.dot(u))
    }
    list.sort((p, q) => angle(p) - angle(q))
    return { normal, center, vertices: list }
  })
  return { sides, geometry, points, faces, byVertex: sides === 4 }
}

export function topIndex(shape: DieShape, quaternion: THREE.Quaternion): number {
  const up = new THREE.Vector3(0, 1, 0)
  let best = -Infinity
  let found = 0
  if (shape.byVertex) {
    shape.points.forEach((p, i) => {
      const y = p.clone().applyQuaternion(quaternion).dot(up)
      if (y > best) {
        best = y
        found = i
      }
    })
    return found
  }
  shape.faces.forEach((face, i) => {
    const y = face.normal.clone().applyQuaternion(quaternion).dot(up)
    if (y > best) {
      best = y
      found = i
    }
  })
  return found
}

export function assignLabels(count: number, top: number, value: number): number[] {
  const labels = Array.from({ length: count }, (_, i) => i + 1)
  const current = labels.indexOf(value)
  if (current === -1) return labels
  ;[labels[top], labels[current]] = [labels[current]!, labels[top]!]
  return labels
}
