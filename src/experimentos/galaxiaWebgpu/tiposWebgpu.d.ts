// Tipos mínimos da API WebGPU, só o que o experimento usa. O TypeScript da
// casa (5.9) não traz WebGPU no lib.dom e o projeto não ganha dependência
// por causa de um ensaio; se a galáxia em WebGPU for ao app, isto dá lugar
// ao pacote oficial de tipos.
type DescGPU = Record<string, unknown>;

interface GPUBuffer {
  readonly size: number;
  mapAsync(modo: number): Promise<void>;
  getMappedRange(): ArrayBuffer;
  unmap(): void;
  destroy(): void;
}
interface GPUTextureView {
  readonly label: string;
}
interface GPUTexture {
  createView(): GPUTextureView;
  destroy(): void;
}
interface GPUSampler {
  readonly label: string;
}
interface GPUShaderModule {
  getCompilationInfo(): Promise<{
    messages: { type: string; message: string; lineNum: number }[];
  }>;
}
interface GPUBindGroupLayout {
  readonly label: string;
}
interface GPUBindGroup {
  readonly label: string;
}
interface GPUPipeline {
  getBindGroupLayout(indice: number): GPUBindGroupLayout;
}
interface GPUQuerySet {
  readonly label: string;
}
interface GPUCommandBuffer {
  readonly label: string;
}
interface GPUPass {
  setPipeline(p: GPUPipeline): void;
  setBindGroup(indice: number, g: GPUBindGroup): void;
  dispatchWorkgroups(x: number, y?: number, z?: number): void;
  draw(vertices: number, instancias?: number): void;
  end(): void;
}
interface GPUCommandEncoder {
  beginComputePass(d?: DescGPU): GPUPass;
  beginRenderPass(d: DescGPU): GPUPass;
  clearBuffer(b: GPUBuffer): void;
  resolveQuerySet(q: GPUQuerySet, primeiro: number, n: number, destino: GPUBuffer, desloc: number): void;
  copyBufferToBuffer(a: GPUBuffer, da: number, b: GPUBuffer, db: number, tamanho: number): void;
  finish(): GPUCommandBuffer;
}
interface GPUQueue {
  writeBuffer(b: GPUBuffer, desloc: number, dados: ArrayBufferView | ArrayBuffer): void;
  writeTexture(destino: DescGPU, dados: ArrayBufferView, leiaute: DescGPU, tamanho: number[]): void;
  submit(comandos: GPUCommandBuffer[]): void;
  onSubmittedWorkDone(): Promise<void>;
}
interface GPUDevice extends EventTarget {
  readonly queue: GPUQueue;
  readonly features: ReadonlySet<string>;
  readonly lost: Promise<{ message: string }>;
  createBuffer(d: DescGPU): GPUBuffer;
  createTexture(d: DescGPU): GPUTexture;
  createSampler(d?: DescGPU): GPUSampler;
  createShaderModule(d: { code: string }): GPUShaderModule;
  createComputePipeline(d: DescGPU): GPUPipeline;
  createRenderPipeline(d: DescGPU): GPUPipeline;
  createBindGroup(d: DescGPU): GPUBindGroup;
  createCommandEncoder(): GPUCommandEncoder;
  createQuerySet(d: DescGPU): GPUQuerySet;
}
interface GPUAdapter {
  readonly features: ReadonlySet<string>;
  readonly limits: Record<string, number>;
  readonly info?: Record<string, string>;
  requestDevice(d?: DescGPU): Promise<GPUDevice>;
}
interface GPU {
  requestAdapter(d?: DescGPU): Promise<GPUAdapter | null>;
  getPreferredCanvasFormat(): string;
}
interface GPUCanvasContext {
  configure(d: DescGPU): void;
  getCurrentTexture(): GPUTexture;
}
interface Navigator {
  readonly gpu?: GPU;
}
