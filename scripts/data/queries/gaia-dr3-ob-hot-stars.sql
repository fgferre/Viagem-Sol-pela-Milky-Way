-- Seleção inicial de estrelas OB de Gaia DR3, reproduzida do Apêndice A de
-- Gaia Collaboration / Drimmel et al. 2023 (A&A 674, A37).
-- DOI: https://doi.org/10.1051/0004-6361/202243797
--
-- Isto NÃO é ainda o catálogo final de 579.577 objetos. O paper cruza esta
-- seleção com distâncias fotogeométricas de Bailer-Jones et al., aplica
-- astrometric fidelity > 0.5 (Rybizki et al.) e |Z| < 300 pc.

SELECT g.*, ap.*
FROM gaiadr3.gaia_source AS g
INNER JOIN gaiadr3.astrophysical_parameters AS ap
  ON g.source_id = ap.source_id
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
  < POWER(10.0, 2.0 - g.phot_g_mean_mag + 1.8 * g.bp_rp);
