# F2c — instantes de eclipse SEGUNDO A EFEMÉRIDE DA CASA (preparação)

Gerado por `acha-eclipse.mjs` (scratchpad, temporário) contra a
`public/data/atlas/efemerides.bin` real, via `decodeEfemerides` +
`MotorEfemerides` + `time.ts` importados do `src` (ponte registerHooks,
mesmo precedente de `gera-retrato-planetas.mjs`). Varredura ±3 h em
passos de 1 min + refino ±90 s em passos de 1 s, minimizando a
distância do centro do receptor ao eixo anti-solar do ocultador.

Geometria do cone (reimplementada no script; raios do doador —
R_sol 696 340 km, R_terra 6 371 km, R_lua 1 737 km; AU 149 597 870,7 km):
eixo na direção u = O/|O|; s = coordenada axial do receptor além do
ocultador; `rUmbra = rOcc − s·(R_sol − rOcc)/|O|`,
`rPenumbra = rOcc + s·(R_sol + rOcc)/|O|`.

Horários de catálogo: NASA/Espenak (tabelas SEdecade/LEdecade,
eclipse.gsfc.nasa.gov), coluna "TD of Greatest Eclipse" — TD ≈ TT ≈ TDB
da casa dentro de 2 ms, então a divergência abaixo é efeméride contra
efeméride, sem ΔT no meio. A divergência é REGISTRO, não erro: cabe no
orçamento da tabela (earth ≤ 1,05e-5 AU ≈ 1 570 km; moon ≤ 2,6e-6 AU
≈ 380 km — a Lua anda ~1 km/s, então ~centenas de km ⇒ ~minutos).

## Candidatos

| Candidato | Máximo catálogo (TD) | **jd TDB do máximo DA CASA** | Máximo da casa (UTC) | Diverg. | Dist. mín. ao eixo | Umbra @receptor | Penumbra @receptor | Veredito |
|---|---|---|---|---|---|---|---|---|
| Solar total 2017-08-21 (EUA) | 18:26:40 | **2457987.26893517** | 18:26:05.7 | +36 s | 2 788,9 km | 24,9 km | 3 457,6 km | TOTAL (central; umbra na superfície r ≈ 51 km) |
| Solar total 2024-04-08 (Am. do Norte) | 18:18:29 | **2460409.26395835** | 18:18:52.0 | +97 s | 2 191,2 km | 65,8 km | 3 416,5 km | TOTAL (central; umbra na superfície r ≈ 94 km) |
| Lunar total 2018-07-27 (mais longo do século) | 20:22:54 | **2458327.34980323** | 20:22:32.2 | +49 s | 740,7 km | 4 527,0 km | 8 249,1 km | TOTAL (Lua inteira na umbra; folga 2 049 km) |
| Lunar total 2019-01-21 | 05:13:27 | **2458504.71817130** | 05:12:58.9 | +43 s | 2 350,8 km | 4 696,1 km | 8 076,8 km | TOTAL (Lua inteira na umbra; folga 608 km) |

Notas de leitura:
- "Umbra/penumbra @receptor" é o raio do cone na cota axial do CENTRO
  do receptor. No caso solar o eixo fura a superfície (dist. < R_terra)
  e a umbra na superfície (cota s − √(R_terra²−perp²)) é maior — é o
  raio "na superfície" citado no veredito, que bate com as larguras de
  faixa de catálogo (2017: ~115 km de diâmetro; 2024: ~198 km).
- Lunar usa umbra GEOMÉTRICA pura (sem alargamento atmosférico de ~2%
  do catálogo) — por isso a folga real de totalidade é ainda maior que
  a tabelada.
- Sanidade externa: as duas UTC da casa caem a segundos dos máximos
  publicados em UT (2017 18:25:32; 2024 18:17:16 — lembrando que a
  parcela dominante da diferença TD→UT é o ΔT ≈ 70 s do próprio modelo
  de `time.ts`).

## Recomendação para as vistas

- **Solar: `?jd=2460409.26395835`** (2024-04-08). Mais central dos dois
  (2 191 km ao eixo contra 2 789 km) ⇒ umbra na superfície quase 2×
  maior (r ≈ 94 km contra ≈ 51 km) — sombra maior em px na captura, e
  o eclipse é o mais conhecido da janela.
- **Lunar: `?jd=2458327.34980323`** (2018-07-27). Muito mais central
  (741 km contra 2 351 km) e com a maior folga de totalidade da janela
  (2 049 km entre a borda da Lua e a borda da umbra) — a Lua fica
  fundo na umbra, insensível aos ±2 min de incerteza da efeméride, e a
  sombra projetada fica máxima e centrada.

Ambos os jd caem fundos na janela 1950–2050 da tabela (2433282.5–
2469807.5), longe das bordas.
