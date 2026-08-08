export function calculatePrecisionAtK(retrieved, expected, k) {
  const topK = retrieved.slice(0, k);
  const hits = topK.filter(id => expected.includes(id)).length;
  return k > 0 ? hits / topK.length : 0;
}

export function calculateRecallAtK(retrieved, expected, k) {
  const topK = retrieved.slice(0, k);
  const hits = topK.filter(id => expected.includes(id)).length;
  return expected.length > 0 ? hits / expected.length : 0;
}

export function calculateMRR(retrieved, expected) {
  for (let i = 0; i < retrieved.length; i++) {
    if (expected.includes(retrieved[i])) {
      return 1 / (i + 1);
    }
  }
  return 0;
}

export function calculateNDCG(retrieved, expected) {
  if (expected.length === 0) return 0;
  
  let dcg = 0;
  for (let i = 0; i < retrieved.length; i++) {
    if (expected.includes(retrieved[i])) {
      dcg += 1 / Math.log2(i + 2);
    }
  }

  let idcg = 0;
  for (let i = 0; i < Math.min(expected.length, retrieved.length); i++) {
    idcg += 1 / Math.log2(i + 2);
  }
  
  return idcg > 0 ? dcg / idcg : 0;
}
