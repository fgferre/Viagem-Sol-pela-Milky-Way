"""Gerador das fixtures de referência do E1 (PLAN.md).

NÃO faz parte do pipeline Node — `scripts/data/lib/{fits,healpix}.mjs`
só LEEM as fixtures já gravadas por este script; ele não é chamado por
nenhum `npm run data:*`. Gera, com o healpy/astropy oficiais:

  - fixtures/healpix-nside256.json: pontos (theta,phi,pix) e pix2vec
    (pix,x,y,z) do healpy, nside 256, NEST — oráculo de healpix.mjs.
  - fixtures/edenhofer-referencia.json: médias de voxel (20 pc) e
    integrais de coluna tiradas de `edenhofer_interp.py` (o script
    oficial do Zenodo, em `.cache/galaxy-data/edenhofer2024/prova/`)
    aplicado ao mapa real de 3 GB — oráculo do leitor FITS/pipeline.

Como rodar (uma vez; grava as duas fixtures; nunca fora de `.cache/`):
  uv venv --python 3.12 .cache/galaxy-data/edenhofer2024/prova/.venv
  uv pip install --python .cache/galaxy-data/edenhofer2024/prova/.venv \
      numpy astropy healpy
  .cache/galaxy-data/edenhofer2024/prova/.venv/bin/python3 \
      scripts/data/fixtures/gera-referencia-edenhofer.py
"""
import datetime
import json
import os
import re
import sys
import time

import astropy
import healpy as hp
import numpy as np

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.abspath(os.path.join(AQUI, '..', '..', '..'))
PROVA_DIR = os.path.join(RAIZ, '.cache', 'galaxy-data', 'edenhofer2024', 'prova')
MAPA_FITS = os.path.join(RAIZ, '.cache', 'galaxy-data', 'edenhofer2024', 'mean_and_std_healpix.fits')
ESPERADO_TXT = os.path.join(RAIZ, '.cache', 'galaxy-data', 'edenhofer2024', 'ESPERADO.txt')

sys.path.insert(0, PROVA_DIR)
import edenhofer_interp as ib  # noqa: E402  (get_sphere/interp_hp2rg oficiais)

NSIDE_FIXTURE = 256
SEMENTE = 20240925
# Copiada de NUVENS em poeira_imagens.py (não importado: esse script
# arrasta Pillow, que não está na lista de dependências do gerador —
# só numpy/astropy/healpy). Se a lista mudar lá, mudar aqui também.
NUVENS = [
    ('Touro', 172, -14, 140), ('Perseu', 159, -20, 295), ('Órion', 210, -19, 400),
    ('Ofiúco', 353, 17, 140), ('Lobo', 339, 16, 155), ('Camaleão', 300, -16, 190),
    ('Cefeu', 110, 15, 350), ('Águia', 28, 4, 250),
]

CAIXA_MIN = (-1250.0, -1250.0, -500.0)
TAMANHO_VOXEL = 20.0
NX, NY, NZ = 125, 125, 50


def gerar_fixture_healpix():
    rng = np.random.default_rng(SEMENTE)
    pontos = []

    # os 12 centros de face (um pixel por face em nside=1)
    thetas_face, phis_face = hp.pix2ang(1, np.arange(12), nest=True)
    for theta, phi in zip(thetas_face, phis_face):
        pix = int(hp.ang2pix(NSIDE_FIXTURE, float(theta), float(phi), nest=True))
        pontos.append({'theta': float(theta), 'phi': float(phi), 'pix': pix, 'categoria': 'centroDeFace'})

    # vértices e pontos médios das arestas das 12 faces: step=2 dá, por
    # aresta, o canto (t=0) e o meio (t=0.5) — 4 cantos + 4 meios/face.
    # São exatamente os vértices onde 3+ faces se encontram: um ponto
    # ali cai exatamente na linha divisória entre pixels vizinhos, e o
    # arredondamento de ponto flutuante do `ang2pix_nest` pode legitima-
    # mente empatar para o pixel vizinho (visto: 2 dos 96 discordam do
    # healpy por 1 pixel vizinho, sempre a <1 tamanho de pixel da
    # direção verdadeira — healpix.test.mjs testa esses com tolerância).
    for face in range(12):
        vetores = hp.boundaries(1, face, step=2, nest=True)  # (3, 8)
        thetas, phis = hp.vec2ang(vetores.T)
        for theta, phi in zip(thetas, phis):
            pix = int(hp.ang2pix(NSIDE_FIXTURE, float(theta), float(phi), nest=True))
            pontos.append({'theta': float(theta), 'phi': float(phi), 'pix': pix, 'categoria': 'verticeOuAresta'})

    # 250 direções aleatórias (semente fixa), uniformes na esfera
    z_aleatorio = rng.uniform(-1, 1, 250)
    phi_aleatorio = rng.uniform(0, 2 * np.pi, 250)
    theta_aleatorio = np.arccos(z_aleatorio)
    for theta, phi in zip(theta_aleatorio, phi_aleatorio):
        pix = int(hp.ang2pix(NSIDE_FIXTURE, float(theta), float(phi), nest=True))
        pontos.append({'theta': float(theta), 'phi': float(phi), 'pix': pix, 'categoria': 'aleatorio'})

    # pix2vec: os 12 centros de face (reaproveitando os pix já achados) + 50 aleatórios
    npix = 12 * NSIDE_FIXTURE**2
    pix2vec = []
    for entrada in pontos[:12]:
        x, y, z = hp.pix2vec(NSIDE_FIXTURE, entrada['pix'], nest=True)
        pix2vec.append({'pix': entrada['pix'], 'x': float(x), 'y': float(y), 'z': float(z)})
    for pix in rng.integers(0, npix, size=50):
        pix = int(pix)
        x, y, z = hp.pix2vec(NSIDE_FIXTURE, pix, nest=True)
        pix2vec.append({'pix': pix, 'x': float(x), 'y': float(y), 'z': float(z)})

    fixture = {'nside': NSIDE_FIXTURE, 'ordering': 'NEST', 'pontos': pontos, 'pix2vec': pix2vec}
    caminho = os.path.join(AQUI, 'healpix-nside256.json')
    with open(caminho, 'w', encoding='utf8') as f:
        json.dump(fixture, f, ensure_ascii=False, indent=1)
    print(f'healpix-nside256.json: {len(pontos)} pontos, {len(pix2vec)} pix2vec', flush=True)


def nuvem_para_xyz(l_graus, b_graus, d_pc):
    lr, br = np.radians(l_graus), np.radians(b_graus)
    x = d_pc * np.cos(br) * np.cos(lr)
    y = d_pc * np.cos(br) * np.sin(lr)
    z = d_pc * np.sin(br)
    return x, y, z


def indice_do_voxel(x, y, z):
    i = int(np.clip(np.floor((x - CAIXA_MIN[0]) / TAMANHO_VOXEL), 0, NX - 1))
    j = int(np.clip(np.floor((y - CAIXA_MIN[1]) / TAMANHO_VOXEL), 0, NY - 1))
    k = int(np.clip(np.floor((z - CAIXA_MIN[2]) / TAMANHO_VOXEL), 0, NZ - 1))
    return i, j, k


def centro_do_voxel(i, j, k):
    return (
        CAIXA_MIN[0] + TAMANHO_VOXEL * (i + 0.5),
        CAIXA_MIN[1] + TAMANHO_VOXEL * (j + 0.5),
        CAIXA_MIN[2] + TAMANHO_VOXEL * (k + 0.5),
    )


def escolher_voxels():
    """40 voxels: os que contêm as 8 nuvens + sorteio (semente fixa) nas
    faixas de raio pedidas, garantindo >= 8 com |z| > 200 pc."""
    rng = np.random.default_rng(SEMENTE)
    I, J, K = np.meshgrid(np.arange(NX), np.arange(NY), np.arange(NZ), indexing='ij')
    X = CAIXA_MIN[0] + TAMANHO_VOXEL * (I + 0.5)
    Y = CAIXA_MIN[1] + TAMANHO_VOXEL * (J + 0.5)
    Z = CAIXA_MIN[2] + TAMANHO_VOXEL * (K + 0.5)
    R = np.sqrt(X**2 + Y**2 + Z**2)
    Iflat, Jflat, Kflat = I.ravel(), J.ravel(), K.ravel()

    nuvens_info = []
    escolhidos = {}
    for nome, l_graus, b_graus, d_pc in NUVENS:
        x, y, z = nuvem_para_xyz(l_graus, b_graus, d_pc)
        escolhidos[indice_do_voxel(x, y, z)] = True
        nuvens_info.append({'nome': nome, 'l': l_graus, 'b': b_graus, 'distancia': d_pc})

    def banda(r):
        if r < 250:
            return 'perto'
        if r < 800:
            return 'meio'
        return 'longe'

    metas = {'perto': 10, 'meio': 15, 'longe': 15}
    contagem = {'perto': 0, 'meio': 0, 'longe': 0}
    for (i, j, k) in escolhidos:
        x, y, z = centro_do_voxel(i, j, k)
        contagem[banda((x * x + y * y + z * z) ** 0.5)] += 1

    def mascara_banda(nome):
        if nome == 'perto':
            return R < 250
        if nome == 'meio':
            return (R >= 250) & (R < 800)
        return (R >= 800) & (R <= 1200)

    def candidatos(mask):
        idxs = np.flatnonzero(mask)
        rng.shuffle(idxs)
        for idx in idxs:
            chave = (int(Iflat[idx]), int(Jflat[idx]), int(Kflat[idx]))
            if chave not in escolhidos:
                yield chave

    alvo_z_alto = 8
    z_alto_atual = sum(1 for (i, j, k) in escolhidos if abs(centro_do_voxel(i, j, k)[2]) > 200)
    for nome_banda in ['meio', 'longe', 'perto']:
        if z_alto_atual >= alvo_z_alto:
            break
        mask_z = mascara_banda(nome_banda) & (np.abs(Z) > 200)
        for chave in candidatos(mask_z):
            if contagem[nome_banda] >= metas[nome_banda] or z_alto_atual >= alvo_z_alto:
                break
            escolhidos[chave] = True
            contagem[nome_banda] += 1
            z_alto_atual += 1

    for nome_banda in ['perto', 'meio', 'longe']:
        faltam = metas[nome_banda] - contagem[nome_banda]
        if faltam <= 0:
            continue
        tomados = 0
        for chave in candidatos(mascara_banda(nome_banda)):
            if tomados >= faltam:
                break
            escolhidos[chave] = True
            contagem[nome_banda] += 1
            tomados += 1

    assert len(escolhidos) == 40, f'esperava 40 voxels, veio {len(escolhidos)} ({contagem})'
    assert z_alto_atual >= 8, f'só {z_alto_atual} voxels com |z|>200'
    return list(escolhidos.keys()), nuvens_info, z_alto_atual


def subamostras_do_voxel(centro):
    """8×8×8 subamostras, espaçamento 2,5 pc, cobrindo o voxel de 20 pc."""
    offsets = -8.75 + 2.5 * np.arange(8)
    dx, dy, dz = np.meshgrid(offsets, offsets, offsets, indexing='ij')
    cx, cy, cz = centro
    return (cx + dx).ravel(), (cy + dy).ravel(), (cz + dz).ravel()


def gerar_fixture_edenhofer():
    t0 = time.time()
    esfera = ib.get_sphere(MAPA_FITS)
    t1 = time.time()
    print(
        f'get_sphere: {t1 - t0:.1f}s | nside {esfera.nside} | nest {esfera.nest} | '
        f'raios {esfera.radii.size} [{float(esfera.radii[0]):.4f}, {float(esfera.radii[-1]):.4f}] pc | '
        f'unidade {esfera.units}',
        flush=True,
    )

    indices, nuvens_info, z_alto_total = escolher_voxels()

    todos_x, todos_y, todos_z = [], [], []
    cortes = [0]
    centros = []
    for (i, j, k) in indices:
        centro = centro_do_voxel(i, j, k)
        centros.append(centro)
        xs, ys, zs = subamostras_do_voxel(centro)
        todos_x.append(xs)
        todos_y.append(ys)
        todos_z.append(zs)
        cortes.append(cortes[-1] + xs.size)
    pos = np.stack([np.concatenate(todos_x), np.concatenate(todos_y), np.concatenate(todos_z)])

    t2 = time.time()
    valores = ib.interp_hp2rg(pos, esfera.radii, esfera.data, nest=esfera.nest, fill_value=np.nan)
    t3 = time.time()
    print(f'interp_hp2rg (voxels, {pos.shape[1]} pontos): {t3 - t2:.1f}s', flush=True)

    total_nan_voxels = 0
    total_amostras_voxels = 0
    voxeis_fixture = []
    for n, (i, j, k) in enumerate(indices):
        v = valores[cortes[n]:cortes[n + 1]]
        nan_mask = np.isnan(v)
        total_nan_voxels += int(nan_mask.sum())
        total_amostras_voxels += v.size
        voxeis_fixture.append({
            'indice': [int(i), int(j), int(k)],
            'centro': [round(c, 4) for c in centros[n]],
            'media': float(np.nan_to_num(v, nan=0.0).mean()),
            'nanFracao': float(nan_mask.mean()),
        })

    direcoes = [
        ('centro', 0.0, 0.0),
        ('anticentro', 180.0, 0.0),
        ('l90', 90.0, 0.0),
        ('l270', 270.0, 0.0),
        ('polo_norte', 0.0, 90.0),
        ('touro', 172.0, -14.0),
    ]
    r_min = float(esfera.radii[0])
    r_max = float(esfera.radii[-1])
    r_amostras = np.logspace(np.log10(r_min), np.log10(r_max), 4000)
    # o interpolador oficial usa bins meio-abertos [r_i, r_i+1); o ida-e-volta
    # log10/potência do logspace não devolve os extremos EXATOS (erro de
    # ~1e-13), e um extremo um fio ABAIXO de r_min cai fora de todos os bins
    # (vimos isso: a amostra 0 dava NaN). Fixa os dois extremos à mão.
    r_amostras[0] = r_min
    r_amostras[-1] *= 1 - 1e-9

    t4 = time.time()
    colunas_fixture = []
    total_nan_colunas = 0
    for nome, l_graus, b_graus in direcoes:
        x, y, z = nuvem_para_xyz(l_graus, b_graus, r_amostras)
        v = ib.interp_hp2rg(np.stack([x, y, z]), esfera.radii, esfera.data, nest=esfera.nest, fill_value=np.nan)
        nan_mask = np.isnan(v)
        total_nan_colunas += int(nan_mask.sum())
        integral = float(np.trapezoid(np.nan_to_num(v, nan=0.0), r_amostras))
        colunas_fixture.append({'nome': nome, 'l': l_graus, 'b': b_graus, 'integral': integral})
    t5 = time.time()
    print(f'interp_hp2rg (colunas, 6×4000 pontos): {t5 - t4:.1f}s', flush=True)

    md5_esperado = None
    with open(ESPERADO_TXT, encoding='utf8') as f:
        m = re.search(r'md5:([0-9a-f]+)', f.read())
        if m:
            md5_esperado = m.group(1)

    fixture = {
        'cabecalho': {
            'fonte': 'Edenhofer et al. 2024 — mean_and_std_healpix.fits (Zenodo 10658339), HDU MEAN',
            'md5': md5_esperado,
            'unidade': 'E (ZGR23) por pc',
            'referencial': (
                'heliocêntrico galáctico convencional: x -> centro galáctico (l=0,b=0); '
                'y -> l=90°; z -> polo norte galáctico'
            ),
            'raiosPc': [r_min, r_max],
            'versoes': {
                'python': sys.version.split()[0],
                'numpy': np.__version__,
                'astropy': astropy.__version__,
                'healpy': hp.__version__,
            },
            'data': datetime.date.today().isoformat(),
        },
        'voxeis': voxeis_fixture,
        'colunas': colunas_fixture,
        'nuvens': nuvens_info,
    }
    caminho = os.path.join(AQUI, 'edenhofer-referencia.json')
    with open(caminho, 'w', encoding='utf8') as f:
        json.dump(fixture, f, ensure_ascii=False, indent=1)

    print(
        f'edenhofer-referencia.json: {len(voxeis_fixture)} voxels '
        f'({total_nan_voxels}/{total_amostras_voxels} subamostras NaN), '
        f'{len(colunas_fixture)} colunas ({total_nan_colunas} amostras NaN), '
        f'{z_alto_total} voxels com |z|>200 pc',
        flush=True,
    )
    print(f'tempo do gerador (edenhofer): {time.time() - t0:.1f}s', flush=True)


if __name__ == '__main__':
    inicio = time.time()
    gerar_fixture_healpix()
    gerar_fixture_edenhofer()
    print(f'tempo total do script: {time.time() - inicio:.1f}s')
