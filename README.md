# Galactic Journey - 3D Star Catalog Visualization

Uma experiência cinematográfica 3D imersiva através do catálogo estelar HYG, renderizada no navegador com tecnologias de ponta.

## 🌟 Características

- **Catálogo HYG**: 15.000+ estrelas com distribuição realista da Via Láctea
- **Sol Esplendoroso**: Nosso sol renderizado com shaders volumétricos e corona
- **Nebulosas Volumétricas**: Nuvens de gás e poeira com shaders 3D noise
- **Pós-processamento Cinematográfico**: Bloom, tone mapping ACESFilmic
- **Jornada Automática**: Viagem suave entre estrelas distantes
- **Iluminação Dinâmica**: Luzes de estrelas brilhantes iluminam o ambiente

## 🚀 Tecnologias

- **Three.js** (r160) - Motor 3D WebGL
- **GLSL Shaders** - Efeitos visuais customizados
- **InstancedMesh** - Renderização performática de milhares de estrelas
- **Post-processing** - Bloom, depth of field effects

## 📁 Arquitetura Modular

```
/workspace
├── index.html          # HTML principal
├── css/
│   └── style.css       # Estilos UI
├── js/
│   ├── main.js         # Entry point e orquestrador
│   ├── SceneManager.js     # Iluminação e ambiente
│   ├── StarSystem.js       # Catálogo HYG e estrelas
│   ├── VolumetricNebula.js # Nuvens de gás e poeira
│   ├── CameraController.js # Movimentos de câmera
│   └── JourneyManager.js   # Gerenciamento da jornada
└── data/               # (Opcional) Dados externos
```

## 🎮 Como Usar

1. Abra `index.html` em um navegador moderno (Chrome, Firefox, Edge)
2. Ou sirva via HTTP: `python3 -m http.server 8080`
3. Acesse `http://localhost:8080`
4. Clique em "Start Journey" para iniciar a viagem

## 🎨 Recursos Visuais

### Sol
- Shader procedural com animação de superfície
- Efeito Fresnel para corona brilhante
- Point light dinâmico para iluminação

### Estrelas
- Cores baseadas em classe espectral (O, B, A, F, G, K, M)
- Distribuição realista da Via Láctea
- Twinkling effect para estrelas brilhantes
- Instanced rendering para performance

### Nebulosas
- Fractal Brownian Motion (FBM) noise
- Múltiplas camadas de nuvens de gás
- Partículas de poeira coloridas
- God rays / light shafts

### Câmera
- Movimento suave com easing functions
- FOV dinâmico baseado na velocidade
- Waypoints para trajetórias cinematográficas

## ⚙️ Performance

- Otimizado para desktop moderno
- Pixel ratio limitado a 2x
- LOD (Level of Detail) implícito via distance attenuation
- Blending additive para efeitos de brilho

## 🔧 Customização

Edite os módulos individualmente para ajustar:

- `StarSystem.js`: Número de estrelas, distribuição galáctica
- `VolumetricNebula.js`: Densidade e cores das nebulosas
- `main.js`: Configurações de bloom e post-processing
- `JourneyManager.js`: Velocidade e duração da viagem

---

**Nota**: Esta é uma simulação artística baseada em dados astronômicos reais. 
As posições das estrelas são aproximadas para fins de visualização.
