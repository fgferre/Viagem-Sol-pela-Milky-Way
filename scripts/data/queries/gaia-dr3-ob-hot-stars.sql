-- Seleção proxy de estrelas quentes Gaia DR3 baseada no Apêndice A de
-- Gaia Collaboration / Drimmel et al. 2023 (A&A 674, A37).
-- DOI: https://doi.org/10.1051/0004-6361/202243797
--
-- Esta consulta cruza as distâncias fotogeométricas de Bailer-Jones e aplica
-- |Z| < 300 pc, mas substitui o astrometric fidelity > 0.5 de Rybizki por
-- proxies reproduzíveis disponíveis no Archive (RUWE, parallax_over_error e
-- visibility_periods_used). Portanto NÃO é a amostra Drimmel de 579.577
-- objetos. random_index fornece uma subamostra uniforme e determinística para
-- o orçamento do browser.

SELECT TOP 100000
  g.source_id,
  g.random_index,
  g.l,
  g.b,
  d.r_med_photogeo,
  d.r_lo_photogeo,
  d.r_hi_photogeo,
  g.phot_g_mean_mag,
  g.bp_rp,
  ap.teff_gspphot,
  ap.teff_esphs,
  g.ruwe,
  g.parallax_over_error,
  g.visibility_periods_used
FROM gaiadr3.gaia_source AS g
JOIN gaiadr3.astrophysical_parameters AS ap
  ON g.source_id = ap.source_id
JOIN external.gaiaedr3_distance AS d
  ON g.source_id = d.source_id
WHERE (
  (
    ap.teff_gspphot > 10000
    AND ap.spectraltype_esphs IN ('O', 'B', 'A')
    AND ap.teff_esphs IS NULL
  )
  OR (
    ap.teff_esphs > 10000
    AND ap.teff_gspphot > 8000
  )
  OR (
    ap.teff_esphs > 10000
    AND ap.teff_esphs < 50000
    AND ap.teff_gspphot IS NULL
  )
)
AND POWER(g.parallax / 100.0, 5)
  < POWER(10.0, 2.0 - g.phot_g_mean_mag + 1.8 * g.bp_rp)
AND d.r_med_photogeo IS NOT NULL
AND ABS(d.r_med_photogeo * SIN(RADIANS(g.b))) < 300
AND g.ruwe < 1.4
AND g.parallax_over_error > 5
AND g.visibility_periods_used >= 10
AND g.random_index < 650000000
ORDER BY g.random_index
