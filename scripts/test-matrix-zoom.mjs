import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { transform } from 'esbuild'
import { createRenderer, ref } from 'vue'

// Exercise the actual composable without booting Nuxt, storage, or authentication.
const source = await readFile(new URL('../src/widgets/genesis/model/matrix/useMatrixCanvas.ts', import.meta.url), 'utf8')
const { code } = await transform(source.replace("from 'vue'", `from '${import.meta.resolve('vue')}'`), { loader: 'ts', format: 'esm' })
const { useMatrixCanvas } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
const renderer = createRenderer({
  createComment: () => ({}), insert() {}, remove() {}, parentNode() {}, nextSibling() {},
})

function setup() {
  let frameId = 0
  let time = 0
  const frames = new Map()
  globalThis.requestAnimationFrame = fn => { frames.set(++frameId, fn); return frameId }
  globalThis.cancelAnimationFrame = id => frames.delete(id)
  const state = {
    viewState: ref({ scale: 1, panX: 37, panY: -61, isPanning: false }),
    activePageId: ref('one'), navigationStack: ref([]), activeDrawingNodeId: ref(null),
    isScenarioContext: ref(false), nodes: ref([{ id: 'root', x: 0, y: 0, isRoot: true }]),
    lastSelectedId: ref(null), saveMatrixData() {},
  }
  let canvas
  const app = renderer.createApp({ setup() { canvas = useMatrixCanvas(state); return () => null } })
  app.mount({})
  canvas.canvasWrapper.value = { clientHeight: 800, getBoundingClientRect: () => ({ left: 100, top: 50, width: 1200, height: 800 }) }
  const tick = () => {
    time += 16
    const current = [...frames.values()]
    frames.clear()
    current.forEach(fn => fn(time))
  }
  const settle = () => {
    for (let n = 0; frames.size && n < 100; n++) tick()
    assert.equal(frames.size, 0, 'animation must settle')
  }
  const wheel = (deltaY, deltaMode = 0) => canvas.handleWheel({ deltaY, deltaMode, clientX: 431, clientY: 267, target: null, preventDefault() {} })
  return { state, canvas, wheel, tick, settle, frames, app }
}

test('fractional wheel input zooms continuously and keeps the cursor world point fixed on every frame', () => {
  const s = setup()
  const before = s.canvas.screenToWorld(431, 267)
  s.wheel(-0.5)
  s.tick()
  assert.ok(s.state.viewState.value.scale > 1 && s.state.viewState.value.scale < 1.001)
  for (let i = 0; i < 30; i++) {
    s.wheel(-5)
    s.tick()
    const point = s.canvas.screenToWorld(431, 267)
    assert.ok(Math.abs(point.x - before.x) < 1e-8)
    assert.ok(Math.abs(point.y - before.y) < 1e-8)
  }
  s.settle()
  assert.ok(Math.abs(s.state.viewState.value.scale - Math.exp(150.5 * 0.0015)) < 1e-10)
  s.app.unmount()
})

test('line and pixel deltas agree; zoom limits and direction reversal work', () => {
  const s = setup()
  s.wheel(-3, 1)
  s.settle()
  const lineScale = s.state.viewState.value.scale
  s.canvas.updateScale(1)
  s.wheel(-48)
  s.settle()
  assert.equal(s.state.viewState.value.scale, lineScale)
  for (let i = 0; i < 100; i++) s.wheel(-100)
  s.settle()
  assert.equal(s.state.viewState.value.scale, 2)
  for (let i = 0; i < 100; i++) s.wheel(100)
  s.settle()
  assert.equal(s.state.viewState.value.scale, 0.25)
  s.canvas.updateScale(NaN)
  assert.equal(s.state.viewState.value.scale, 0.25)
  s.app.unmount()
})

test('presets, reset, navigation and unmount cancel pending zoom', () => {
  const s = setup()
  s.wheel(-100)
  s.canvas.updateScale(0.75)
  s.tick()
  assert.equal(s.state.viewState.value.scale, 0.75)
  s.wheel(-100)
  s.canvas.resetView()
  s.tick()
  assert.equal(s.state.viewState.value.scale, 1)
  s.wheel(-100)
  s.state.activePageId.value = 'two'
  assert.equal(s.frames.size, 0)
  s.wheel(-100)
  s.state.navigationStack.value = ['scenario']
  assert.equal(s.frames.size, 0)
  s.wheel(-100)
  s.app.unmount()
  assert.equal(s.frames.size, 0)
})

test('locked scenario and pan modes leave the view unchanged', () => {
  const s = setup()
  s.state.isScenarioContext.value = true
  s.wheel(-100)
  s.canvas.updateScale(2)
  assert.equal(s.state.viewState.value.scale, 1)
  assert.equal(s.frames.size, 0)
  s.state.isScenarioContext.value = false
  s.state.viewState.value.isPanning = true
  s.wheel(-100)
  assert.equal(s.frames.size, 0)
  s.app.unmount()
})
