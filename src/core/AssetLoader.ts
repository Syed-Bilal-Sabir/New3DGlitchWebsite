import {
  Group,
  LoadingManager,
  Object3D,
  Texture,
  SRGBColorSpace
} from 'three'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js'
import type { WebGLRenderer } from 'three'

export class AssetLoader {
  public manager = new LoadingManager()
  private gltf = new GLTFLoader(this.manager)
  private draco = new DRACOLoader(this.manager)
  private ktx2 = new KTX2Loader(this.manager)

  constructor(renderer?: WebGLRenderer) {
    this.draco.setDecoderPath('/draco/')
    this.gltf.setDRACOLoader(this.draco)

    this.ktx2.setTranscoderPath('/basis/')
    if (renderer) {
      this.ktx2.detectSupport(renderer)
      this.gltf.setKTX2Loader(this.ktx2)
    }
  }

  async loadGLB(url: string) {
    const result = await this.gltf.loadAsync(url)
    result.scene.traverse((child: Object3D) => {
      const anyChild = child as any
      if (anyChild.isMesh) {
        anyChild.castShadow = true
        anyChild.receiveShadow = true
      }
    })
    return result
  }

  async tryLoadGLB(url: string): Promise<Group | null> {
    try {
      const gltf = await this.loadGLB(url)
      return gltf.scene
    } catch {
      return null
    }
  }

  disposeObject(object: Object3D) {
    object.traverse((child: any) => {
      if (!child.isMesh) return
      child.geometry?.dispose?.()

      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material]

      for (const material of materials) {
        if (!material) continue
        for (const value of Object.values(material)) {
          if (value instanceof Texture) value.dispose()
        }
        material.dispose?.()
      }
    })
  }

  dispose() {
    this.draco.dispose()
    this.ktx2.dispose()
  }
}
