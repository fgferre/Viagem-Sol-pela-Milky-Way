const TAU = Math.PI * 2;

function wrapAngle(value) {
  return Math.atan2(Math.sin(value), Math.cos(value));
}

function smoothstep(edge0, edge1, value) {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function phaseTerm(radiusPc, phaseAtSunRad, segment) {
  if (segment.local) {
    return (
      Math.log(Math.max(radiusPc, 180) / 8150) /
      Math.tan((segment.pitchInnerDeg * Math.PI) / 180)
    );
  }

  const observedPitchDeg =
    radiusPc < 8150 ? segment.pitchInnerDeg : segment.pitchOuterDeg;
  const farBlend = smoothstep(9500, 15000, radiusPc);
  const pitchDeg =
    observedPitchDeg + (15.8 - observedPitchDeg) * farBlend;
  return (
    Math.log(Math.max(radiusPc, 180) / 8150) /
      Math.tan((pitchDeg * Math.PI) / 180) +
    0.052 * Math.sin(radiusPc * 0.00115 + phaseAtSunRad * 2.7) +
    0.022 * Math.sin(radiusPc * 0.0037 - phaseAtSunRad)
  );
}

function thetaAtRadius(radiusPc, phaseAtSunRad, segment) {
  return phaseAtSunRad + phaseTerm(radiusPc, phaseAtSunRad, segment);
}

function segmentsFromModel(model) {
  const segments = [];
  for (const arm of model.arms) {
    segments.push({
      id: arm.id,
      phasePath: ['arms', model.arms.indexOf(arm), 'phaseAtSunRad'],
      phaseAtSunRad: arm.phaseAtSunRad,
      pitchInnerDeg: arm.pitchInnerDeg,
      pitchOuterDeg: arm.pitchOuterDeg,
      catalogueCodes: arm.catalogueCodes,
      fitRangePc: arm.fitRangePc,
      local: false,
    });
    if (arm.outerContinuation) {
      segments.push({
        id: `${arm.id}:outer`,
        phasePath: [
          'arms',
          model.arms.indexOf(arm),
          'outerContinuation',
          'phaseAtSunRad',
        ],
        phaseAtSunRad: arm.outerContinuation.phaseAtSunRad,
        pitchInnerDeg: arm.pitchInnerDeg,
        pitchOuterDeg: arm.pitchOuterDeg,
        catalogueCodes: arm.outerContinuation.catalogueCodes,
        fitRangePc: arm.outerContinuation.fitRangePc,
        local: false,
      });
    }
  }
  segments.push({
    id: model.localArm.id,
    phasePath: ['localArm', 'phaseAtSunRad'],
    phaseAtSunRad: model.localArm.phaseAtSunRad,
    pitchInnerDeg: model.localArm.pitchInnerDeg,
    pitchOuterDeg: model.localArm.pitchOuterDeg,
    catalogueCodes: model.localArm.catalogueCodes,
    fitRangePc: model.localArm.fitRangePc,
    local: true,
  });
  return segments;
}

function setPath(target, path, value) {
  let parent = target;
  for (let index = 0; index < path.length - 1; index++) {
    parent = parent[path[index]];
  }
  parent[path.at(-1)] = value;
}

export function decodeSpiralAnchors(buffer, asset, dictionary) {
  const records = [];
  for (let index = 0; index < asset.count; index++) {
    const byteOffset =
      index * asset.strideFloat32 * Float32Array.BYTES_PER_ELEMENT;
    records.push({
      xPc: buffer.readFloatLE(byteOffset),
      yPc: buffer.readFloatLE(byteOffset + 4),
      relativeParallaxError: buffer.readFloatLE(byteOffset + 6 * 4),
      armCode:
        dictionary[String(Math.round(buffer.readFloatLE(byteOffset + 7 * 4)))] ??
        'unknown',
    });
  }
  return records;
}

function selectedRecords(records, segment, selection) {
  return records
    .filter((record) => {
      const radiusPc = Math.hypot(record.xPc, record.yPc);
      return (
        record.relativeParallaxError < selection.maxRelativeParallaxError &&
        segment.catalogueCodes.includes(record.armCode) &&
        radiusPc >= segment.fitRangePc[0] &&
        radiusPc <= segment.fitRangePc[1]
      );
    })
    .map((record) => ({
      ...record,
      radiusPc: Math.hypot(record.xPc, record.yPc),
      theta: Math.atan2(record.yPc, record.xPc),
    }));
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) * 0.5)];
}

function percentile(values, fraction) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) * fraction)];
}

function fitPhase(records, segment, selection) {
  let phase = segment.phaseAtSunRad;
  for (let iteration = 0; iteration < 40; iteration++) {
    const observedPhases = records.map((record) =>
      wrapAngle(
        record.theta - phaseTerm(record.radiusPc, phase, segment)
      )
    );
    const absoluteResiduals = observedPhases.map((observed) =>
      Math.abs(wrapAngle(observed - phase))
    );
    const robustScale = Math.max(0.03, median(absoluteResiduals) / 0.6745);
    let sumX = 0;
    let sumY = 0;
    for (let index = 0; index < records.length; index++) {
      const error = absoluteResiduals[index];
      const uncertaintyWeight =
        1 /
        (selection.uncertaintyFloor ** 2 +
          records[index].relativeParallaxError ** 2);
      const huberWeight = Math.min(
        1,
        (selection.huberK * robustScale) / Math.max(error, 1e-9)
      );
      const weight = uncertaintyWeight * huberWeight;
      sumX += Math.cos(observedPhases[index]) * weight;
      sumY += Math.sin(observedPhases[index]) * weight;
    }
    phase = Math.atan2(sumY, sumX);
  }
  return wrapAngle(phase + TAU);
}

function nearestDistancePc(record, phaseAtSunRad, segment) {
  const [minimumRadius, maximumRadius] = segment.fitRangePc;
  let bestSquared = Number.POSITIVE_INFINITY;
  let bestRadius = minimumRadius;
  for (
    let radiusPc = minimumRadius;
    radiusPc <= maximumRadius;
    radiusPc += 25
  ) {
    const theta = thetaAtRadius(radiusPc, phaseAtSunRad, segment);
    const dx = record.xPc - radiusPc * Math.cos(theta);
    const dy = record.yPc - radiusPc * Math.sin(theta);
    const squared = dx * dx + dy * dy;
    if (squared < bestSquared) {
      bestSquared = squared;
      bestRadius = radiusPc;
    }
  }
  for (let step = 8; step > 0.01; step /= 3) {
    for (let offset = -3; offset <= 3; offset++) {
      const radiusPc = Math.min(
        maximumRadius,
        Math.max(minimumRadius, bestRadius + offset * step)
      );
      const theta = thetaAtRadius(radiusPc, phaseAtSunRad, segment);
      const dx = record.xPc - radiusPc * Math.cos(theta);
      const dy = record.yPc - radiusPc * Math.sin(theta);
      const squared = dx * dx + dy * dy;
      if (squared < bestSquared) {
        bestSquared = squared;
        bestRadius = radiusPc;
      }
    }
  }
  return Math.sqrt(bestSquared);
}

function armWidthPc(radiusPc) {
  return Math.min(690, Math.max(170, 336 + 36 * (radiusPc / 1000 - 8.15)));
}

export function evaluateSpiralModel(model, records) {
  const residuals = [];
  const segmentMetrics = [];
  for (const segment of segmentsFromModel(model)) {
    const selected = selectedRecords(records, segment, model.selection);
    const segmentResiduals = selected.map((record) =>
      nearestDistancePc(record, segment.phaseAtSunRad, segment)
    );
    residuals.push(...segmentResiduals);
    segmentMetrics.push({
      id: segment.id,
      sampleCount: selected.length,
      medianResidualPc: median(segmentResiduals),
      p90ResidualPc: percentile(segmentResiduals, 0.9),
    });
  }
  const selectedForWidth = [];
  for (const segment of segmentsFromModel(model)) {
    const selected = selectedRecords(records, segment, model.selection);
    for (const record of selected) {
      selectedForWidth.push({
        residualPc: nearestDistancePc(
          record,
          segment.phaseAtSunRad,
          segment
        ),
        widthPc: armWidthPc(record.radiusPc),
      });
    }
  }
  return {
    sampleCount: residuals.length,
    medianResidualPc: median(residuals),
    p90ResidualPc: percentile(residuals, 0.9),
    withinOneWidth: selectedForWidth.filter(
      ({ residualPc, widthPc }) => residualPc <= widthPc
    ).length,
    segments: segmentMetrics,
  };
}

export function fitSpiralModel(model, records) {
  const fitted = structuredClone(model);
  for (const segment of segmentsFromModel(fitted)) {
    const selected = selectedRecords(records, segment, fitted.selection);
    setPath(
      fitted,
      segment.phasePath,
      Number(fitPhase(selected, segment, fitted.selection).toFixed(6))
    );
  }
  const metrics = evaluateSpiralModel(fitted, records);
  fitted.lastFit = {
    sampleCount: metrics.sampleCount,
    medianResidualPc: Number(metrics.medianResidualPc.toFixed(1)),
    p90ResidualPc: Number(metrics.p90ResidualPc.toFixed(1)),
    withinOneWidth: metrics.withinOneWidth,
  };
  return { model: fitted, metrics };
}
